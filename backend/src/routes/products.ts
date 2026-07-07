import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validationResult, body, param, query as validatorQuery } from 'express-validator';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();

const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
const imageBucket = process.env.PRODUCT_IMAGE_BUCKET || '';
const imageCdnUrl = (process.env.PRODUCT_IMAGE_CDN_URL || '').replace(/\/$/, '');
const s3 = new S3Client({ region: awsRegion });

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const imageExtensionByType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const publicImageUrl = (objectKey: string) => `${imageCdnUrl}/${objectKey}`;

async function getProductImages(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, any[]>();

  const result = await query(
    `SELECT id, product_id, object_key, image_url, thumbnail_url, alt_text, sort_order, is_primary, status, created_at
     FROM product_images
     WHERE product_id = ANY($1::uuid[]) AND status = 'uploaded'
     ORDER BY product_id, is_primary DESC, sort_order ASC, created_at ASC`,
    [productIds]
  );

  const grouped = new Map<string, any[]>();
  for (const row of result.rows) {
    const image = {
      id: row.id,
      objectKey: row.object_key,
      url: row.image_url,
      thumbnailUrl: row.thumbnail_url || row.image_url,
      altText: row.alt_text,
      sortOrder: row.sort_order,
      isPrimary: row.is_primary
    };
    grouped.set(row.product_id, [...(grouped.get(row.product_id) || []), image]);
  }

  return grouped;
}

async function serializeProduct(row: any, imagesByProduct?: Map<string, any[]>) {
  const images = imagesByProduct?.get(row.id) || [];
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: parseFloat(row.price),
    comparePrice: row.compare_price ? parseFloat(row.compare_price) : null,
    category: row.category,
    brand: row.brand,
    stockQuantity: parseInt(row.stock_quantity),
    imageUrl: images[0]?.url || row.image_url,
    images,
    specifications: row.specifications,
    tags: row.tags || [],
    marketTag: row.market_tag,
    isFeatured: row.is_featured,
    status: row.status || 'published',
    isActive: row.is_active,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    hasDiscount: row.compare_price && parseFloat(row.compare_price) > parseFloat(row.price),
    discountPercent: row.compare_price ? Math.round((1 - parseFloat(row.price) / parseFloat(row.compare_price)) * 100) : null
  };
}

// Get All Products (Public)
router.get('/',
  [
    validatorQuery('page').optional().isInt({ min: 1 }),
    validatorQuery('limit').optional().isInt({ min: 1, max: 100 }),
    validatorQuery('minPrice').optional().isFloat({ min: 0 }),
    validatorQuery('maxPrice').optional().isFloat({ min: 0 })
  ],
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        brand,
        minPrice,
        maxPrice,
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const params: any[] = [];
      let whereClause = `WHERE is_active = TRUE AND COALESCE(status, 'published') = 'published'`;
      let paramIndex = 1;

      if (category) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (brand) {
        whereClause += ` AND brand = $${paramIndex}`;
        params.push(brand);
        paramIndex++;
      }

      if (minPrice) {
        whereClause += ` AND price >= $${paramIndex}`;
        params.push(Number(minPrice));
        paramIndex++;
      }

      if (maxPrice) {
        whereClause += ` AND price <= $${paramIndex}`;
        params.push(Number(maxPrice));
        paramIndex++;
      }

      if (search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const allowedSortFields = ['price', 'name', 'created_at', 'stock_quantity'];
      const sortField = allowedSortFields.includes(String(sortBy)) ? sortBy : 'created_at';
      const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      const productsResult = await query(
        `SELECT id, sku, name, slug, description, price, compare_price, category, brand,
                stock_quantity, image_url, specifications, tags, market_tag, is_featured,
                status, is_active, published_at, created_at
         FROM products
         ${whereClause}
         ORDER BY published_at DESC NULLS LAST, ${sortField} ${order}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, Number(limit), offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM products ${whereClause}`,
        params
      );

      const imagesByProduct = await getProductImages(productsResult.rows.map(p => p.id));
      const products = await Promise.all(productsResult.rows.map(p => serializeProduct(p, imagesByProduct)));

      res.json({
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
);

// Create Product Image Upload URL (Admin only)
router.post('/:productId/images/upload-url',
  authenticate,
  authorize('admin'),
  [
    param('productId').isUUID().withMessage('Invalid product ID'),
    body('fileName').notEmpty().withMessage('File name is required'),
    body('contentType').isIn([...allowedImageTypes]).withMessage('Only JPG, PNG, and WEBP images are allowed')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!imageBucket || !imageCdnUrl) {
        return res.status(500).json({ error: 'Image storage is not configured' });
      }

      const productId = String(req.params.productId);
      const { fileName, contentType } = req.body;

      const product = await query('SELECT id FROM products WHERE id = $1', [productId]);
      if (product.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const count = await query('SELECT COUNT(*) FROM product_images WHERE product_id = $1', [productId]);
      if (parseInt(count.rows[0].count) >= 5) {
        return res.status(400).json({ error: 'A product can have a maximum of 5 images' });
      }

      const ext = imageExtensionByType[contentType];
      const safeBaseName = String(fileName).replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'image';
      const objectKey = `products/${productId}/original/${Date.now()}-${randomUUID()}-${safeBaseName}.${ext}`;
      const command = new PutObjectCommand({
        Bucket: imageBucket,
        Key: objectKey,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable'
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

      res.json({
        uploadUrl,
        objectKey,
        publicUrl: publicImageUrl(objectKey),
        expiresIn: 900
      });
    } catch (error) {
      console.error('Create image upload URL error:', error);
      res.status(500).json({ error: 'Failed to create image upload URL' });
    }
  }
);

// Complete Product Image Upload (Admin only)
router.post('/:productId/images/complete',
  authenticate,
  authorize('admin'),
  [
    param('productId').isUUID().withMessage('Invalid product ID'),
    body('objectKey').notEmpty().withMessage('Object key is required')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const productId = String(req.params.productId);
      const { objectKey, altText, isPrimary } = req.body;
      const normalizedKey = String(objectKey);

      if (!normalizedKey.startsWith(`products/${productId}/`)) {
        return res.status(400).json({ error: 'Object key does not belong to this product' });
      }

      const count = await query('SELECT COUNT(*) FROM product_images WHERE product_id = $1', [productId]);
      const sortOrder = parseInt(count.rows[0].count);
      const makePrimary = Boolean(isPrimary) || sortOrder === 0;

      if (makePrimary) {
        await query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [productId]);
      }

      const imageUrl = publicImageUrl(normalizedKey);
      const result = await query(
        `INSERT INTO product_images (product_id, object_key, image_url, thumbnail_url, alt_text, sort_order, is_primary, status)
         VALUES ($1, $2, $3, $3, $4, $5, $6, 'uploaded')
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [productId, normalizedKey, imageUrl, altText || null, sortOrder, makePrimary]
      );

      if (makePrimary) {
        await query('UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2', [imageUrl, productId]);
      }

      const image = result.rows[0];
      res.status(201).json({
        id: image.id,
        objectKey: image.object_key,
        url: image.image_url,
        thumbnailUrl: image.thumbnail_url || image.image_url,
        altText: image.alt_text,
        sortOrder: image.sort_order,
        isPrimary: image.is_primary
      });
    } catch (error) {
      console.error('Complete product image upload error:', error);
      res.status(500).json({ error: 'Failed to save product image' });
    }
  }
);

// Publish Product (Admin only)
router.post('/:productId/publish',
  authenticate,
  authorize('admin'),
  [param('productId').isUUID().withMessage('Invalid product ID')],
  async (req: AuthRequest, res: Response) => {
    try {
      const productId = String(req.params.productId);
      const product = await query(
        `SELECT id, name, sku, price, stock_quantity
         FROM products
         WHERE id = $1`,
        [productId]
      );

      if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

      const imageCount = await query('SELECT COUNT(*) FROM product_images WHERE product_id = $1 AND status = $2', [productId, 'uploaded']);
      if (parseInt(imageCount.rows[0].count) < 1) {
        return res.status(400).json({ error: 'At least one product image is required before publishing' });
      }

      const primary = await query('SELECT image_url FROM product_images WHERE product_id = $1 AND is_primary = TRUE ORDER BY sort_order ASC LIMIT 1', [productId]);
      if (primary.rows.length === 0) {
        await query(
          `UPDATE product_images
           SET is_primary = TRUE
           WHERE id = (
             SELECT id FROM product_images WHERE product_id = $1 AND status = 'uploaded' ORDER BY sort_order ASC, created_at ASC LIMIT 1
           )`,
          [productId]
        );
      }

      const primaryImage = await query('SELECT image_url FROM product_images WHERE product_id = $1 AND is_primary = TRUE LIMIT 1', [productId]);
      const result = await query(
        `UPDATE products
         SET status = 'published',
             is_active = TRUE,
             image_url = $1,
             published_at = COALESCE(published_at, NOW()),
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [primaryImage.rows[0].image_url, productId]
      );

      const imagesByProduct = await getProductImages([productId]);
      res.json(await serializeProduct(result.rows[0], imagesByProduct));
    } catch (error) {
      console.error('Publish product error:', error);
      res.status(500).json({ error: 'Failed to publish product' });
    }
  }
);

// Reorder Product Images (Admin only)
router.patch('/:productId/images/reorder',
  authenticate,
  authorize('admin'),
  [param('productId').isUUID().withMessage('Invalid product ID')],
  async (req: AuthRequest, res: Response) => {
    try {
      const productId = String(req.params.productId);
      const { imageIds, primaryImageId } = req.body;

      if (!Array.isArray(imageIds)) {
        return res.status(400).json({ error: 'imageIds must be an array' });
      }

      await query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [productId]);
      for (const [index, imageId] of imageIds.entries()) {
        await query(
          'UPDATE product_images SET sort_order = $1, is_primary = $2 WHERE id = $3 AND product_id = $4',
          [index, imageId === primaryImageId || (!primaryImageId && index === 0), imageId, productId]
        );
      }

      const imagesByProduct = await getProductImages([productId]);
      res.json({ images: imagesByProduct.get(productId) || [] });
    } catch (error) {
      console.error('Reorder product images error:', error);
      res.status(500).json({ error: 'Failed to reorder product images' });
    }
  }
);

// Delete Product Image (Admin only)
router.delete('/:productId/images/:imageId',
  authenticate,
  authorize('admin'),
  [
    param('productId').isUUID().withMessage('Invalid product ID'),
    param('imageId').isUUID().withMessage('Invalid image ID')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const productId = String(req.params.productId);
      const imageId = String(req.params.imageId);
      const result = await query(
        'DELETE FROM product_images WHERE id = $1 AND product_id = $2 RETURNING object_key',
        [imageId, productId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Image not found' });
      }

      if (imageBucket) {
        await s3.send(new DeleteObjectCommand({ Bucket: imageBucket, Key: result.rows[0].object_key }));
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete product image error:', error);
      res.status(500).json({ error: 'Failed to delete product image' });
    }
  }
);

// Get Product by Slug (Public)
router.get('/:slug',
  [
    param('slug').notEmpty().withMessage('Slug is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      const result = await query(
        `SELECT p.*,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(r.id) as review_count
         FROM products p
         LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = TRUE
         WHERE p.slug = $1 AND p.is_active = TRUE
         GROUP BY p.id`,
        [slug]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const p = result.rows[0];
      const imagesByProduct = await getProductImages([p.id]);
      res.json({
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: parseFloat(p.price),
        comparePrice: p.compare_price ? parseFloat(p.compare_price) : null,
        category: p.category,
        brand: p.brand,
        stockQuantity: parseInt(p.stock_quantity),
        imageUrl: imagesByProduct.get(p.id)?.[0]?.url || p.image_url,
        images: imagesByProduct.get(p.id) || [],
        specifications: p.specifications,
        tags: p.tags || [],
        marketTag: p.market_tag,
        isFeatured: p.is_featured,
        weight: p.weight ? parseFloat(p.weight) : null,
        dimensions: p.dimensions,
        averageRating: Math.round(parseFloat(p.average_rating) * 10) / 10,
        reviewCount: parseInt(p.review_count),
        createdAt: p.created_at,
        updatedAt: p.updated_at
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }
);

// Create Product (Admin only)
router.post('/',
  authenticate,
  authorize('admin'),
  [
    body('sku').notEmpty().withMessage('SKU is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('category').notEmpty().withMessage('Category is required')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        sku, name, description, price, comparePrice, category, brand,
        stockQuantity, imageUrl, specifications, tags, marketTag, isFeatured
      } = req.body;

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const result = await query(
        `INSERT INTO products
         (sku, name, slug, description, price, compare_price, category, brand,
          stock_quantity, image_url, specifications, tags, market_tag, is_featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [sku, name, slug, description, price, comparePrice, category, brand,
         stockQuantity || 0, imageUrl, specifications, tags, marketTag, isFeatured || false]
      );

      const p = result.rows[0];
      res.status(201).json({
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: parseFloat(p.price),
        comparePrice: p.compare_price ? parseFloat(p.compare_price) : null,
        category: p.category,
        brand: p.brand,
        stockQuantity: parseInt(p.stock_quantity),
        imageUrl: p.image_url,
        createdAt: p.created_at
      });
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'SKU or slug already exists' });
      }
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

// Upsert Product by SKU (Admin only)
router.post('/admin/upsert',
  authenticate,
  authorize('admin'),
  [
    body('sku').notEmpty().withMessage('SKU is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('category').notEmpty().withMessage('Category is required')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        sku, name, description, price, comparePrice, category, brand,
        stockQuantity, imageUrl, specifications, tags, marketTag, isFeatured
      } = req.body;

      const slugBase = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = await query('SELECT id, slug FROM products WHERE sku = $1 LIMIT 1', [sku]);
      const slug = existing.rows[0]?.slug || slugBase;

      const result = await query(
        `INSERT INTO products
         (sku, name, slug, description, price, compare_price, category, brand,
          stock_quantity, image_url, specifications, tags, market_tag, is_featured, status, is_active, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'published', TRUE, NOW())
         ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          compare_price = EXCLUDED.compare_price,
          category = EXCLUDED.category,
          brand = EXCLUDED.brand,
          stock_quantity = EXCLUDED.stock_quantity,
          image_url = COALESCE(EXCLUDED.image_url, products.image_url),
          specifications = EXCLUDED.specifications,
          tags = EXCLUDED.tags,
          market_tag = EXCLUDED.market_tag,
          is_featured = EXCLUDED.is_featured,
          status = 'published',
          is_active = TRUE,
          published_at = COALESCE(products.published_at, NOW()),
          updated_at = NOW()
         RETURNING *`,
        [sku, name, slug, description, price, comparePrice, category, brand,
         stockQuantity || 0, imageUrl || null, specifications || null, tags || null, marketTag || null, isFeatured || false]
      );

      const p = result.rows[0];
      const imagesByProduct = await getProductImages([p.id]);
      res.json(await serializeProduct(p, imagesByProduct));
    } catch (error) {
      console.error('Upsert product error:', error);
      res.status(500).json({ error: 'Failed to save product' });
    }
  }
);

// Update Product (Admin only)
router.put('/:id',
  authenticate,
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    body('price').optional().isFloat({ min: 0 }),
    body('stockQuantity').optional().isInt({ min: 0 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const allowedFields = ['name', 'description', 'price', 'compare_price', 'category',
                          'brand', 'stock_quantity', 'image_url', 'specifications',
                          'tags', 'market_tag', 'is_active', 'is_featured'];

      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (allowedFields.includes(snakeKey)) {
          setClause.push(`${snakeKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (setClause.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(id);

      const result = await query(
        `UPDATE products SET ${setClause.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const p = result.rows[0];
      res.json({
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: parseFloat(p.price),
        comparePrice: p.compare_price ? parseFloat(p.compare_price) : null,
        category: p.category,
        brand: p.brand,
        stockQuantity: parseInt(p.stock_quantity),
        imageUrl: p.image_url,
        isFeatured: p.is_featured,
        updatedAt: p.updated_at
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

// Delete Product (Admin only)
router.delete('/:id',
  authenticate,
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Invalid product ID')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await query(
        'UPDATE products SET is_active = FALSE WHERE id = $1',
        [id]
      );

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
);

export default router;
