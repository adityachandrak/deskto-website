import { Router, Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const router = Router();

const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
const cmsBucket =
  process.env.PRODUCT_IMAGE_BUCKET ||
  process.env.S3_BUCKET_NAME ||
  process.env.HOMEPAGE_IMAGE_BUCKET ||
  '';
const cmsCdnBase = (
  process.env.PRODUCT_IMAGE_CDN_URL ||
  process.env.IMAGE_CLOUDFRONT_BASE_URL ||
  ''
).replace(/\/+$/, '');
const s3 = new S3Client({ region: awsRegion });

const CMS_CONTENT_TYPES = new Set([
  'featured-build', 'offer', 'gaming-news', 'testimonial', 'faq',
]);
const CMS_PUBLISHED_STATUS = 'published';

const CMS_WRITABLE_COLUMNS = new Set([
  'title', 'slug', 'content_type', 'category', 'short_description', 'content',
  'author', 'cover_image', 'thumbnail_image', 'banner_image', 'gallery_images',
  'intro', 'specs', 'benchmark_data', 'tips', 'pros', 'cons', 'tags',
  'offer_details', 'discount', 'cta_text', 'cta_link', 'related_services',
  'display_order', 'show_on_gaming_hub', 'show_in_category',
  'is_featured', 'is_trending', 'is_latest_news',
  'is_exclusive_offer', 'is_signature_machine',
  'meta_title', 'meta_description', 'keywords',
  'status', 'publish_date', 'scheduled_at',
]);

const CMS_COLUMN_MAP: Record<string, string> = {
  title: 'title',
  slug: 'slug',
  type: 'content_type',
  contentType: 'content_type',
  category: 'category',
  shortDescription: 'short_description',
  body: 'content',
  content: 'content',
  author: 'author',
  coverImage: 'cover_image',
  coverImageKey: 'cover_image',
  thumbnailImage: 'thumbnail_image',
  thumbnailImageKey: 'thumbnail_image',
  bannerImage: 'banner_image',
  bannerImageKey: 'banner_image',
  gallery: 'gallery_images',
  galleryImages: 'gallery_images',
  intro: 'intro',
  specs: 'specs',
  benchmarkData: 'benchmark_data',
  tips: 'tips',
  pros: 'pros',
  cons: 'cons',
  tags: 'tags',
  offerDetails: 'offer_details',
  discount: 'discount',
  ctaText: 'cta_text',
  ctaHref: 'cta_link',
  ctaLink: 'cta_link',
  relatedServices: 'related_services',
  order: 'display_order',
  displayOrder: 'display_order',
  showOnGamingHub: 'show_on_gaming_hub',
  showInCategory: 'show_in_category',
  isFeatured: 'is_featured',
  isTrending: 'is_trending',
  isLatestNews: 'is_latest_news',
  isExclusiveOffer: 'is_exclusive_offer',
  isSignatureMachine: 'is_signature_machine',
  showInSignatureMachines: 'is_signature_machine',
  showInExclusiveOffers: 'is_exclusive_offer',
  metaTitle: 'meta_title',
  metaDescription: 'meta_description',
  keywords: 'keywords',
  status: 'status',
  publishDate: 'publish_date',
  scheduledAt: 'scheduled_at',
};

function cmsNormalizeRow(payload: any): Record<string, any> {
  if (!payload || typeof payload !== 'object') return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    const col = CMS_COLUMN_MAP[k];
    if (!col || !CMS_WRITABLE_COLUMNS.has(col) || v === undefined) continue;
    out[col] = v;
  }
  return out;
}

function cmsSlugify(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240);
}

async function cmsResolveSlug(row: Record<string, any>, existingId?: string): Promise<string> {
  const base = row.slug && String(row.slug).trim() ? cmsSlugify(row.slug) : cmsSlugify(row.title);
  let candidate = base || `item-${Date.now()}`;
  for (let i = 0; i < 50; i += 1) {
    const params: any[] = [candidate];
    let sql = 'SELECT 1 FROM gaming_hub WHERE slug = $1';
    if (existingId) {
      sql += ' AND id <> $2';
      params.push(existingId);
    }
    const r = await query(sql, params);
    if (r.rows.length === 0) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base || 'item'}-${randomUUID().slice(0, 8)}`;
}

function cmsCdnUrl(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (!cmsCdnBase) return value;
  return `${cmsCdnBase}/${String(value).replace(/^\/+/, '')}`;
}

function cmsProjectRow(row: any) {
  if (!row) return row;
  const gallery = Array.isArray(row.gallery_images) ? row.gallery_images.map(cmsCdnUrl) : [];
  return {
    id: row.id,
    type: row.content_type,
    slug: row.slug,
    title: row.title,
    category: row.category,
    shortDescription: row.short_description,
    body: row.content,
    intro: row.intro,
    specs: row.specs,
    benchmarkData: row.benchmark_data,
    tags: row.tags || [],
    pros: row.pros || [],
    cons: row.cons || [],
    tips: row.tips || [],
    offerDetails: row.offer_details,
    discount: row.discount,
    ctaText: row.cta_text,
    ctaHref: row.cta_link,
    coverImage: cmsCdnUrl(row.cover_image),
    coverImageKey: row.cover_image,
    thumbnailImage: cmsCdnUrl(row.thumbnail_image),
    thumbnailImageKey: row.thumbnail_image,
    bannerImage: cmsCdnUrl(row.banner_image),
    bannerImageKey: row.banner_image,
    gallery,
    imageUrls: gallery,
    order: row.display_order,
    displayOrder: row.display_order,
    showOnGamingHub: row.show_on_gaming_hub,
    showInCategory: row.show_in_category,
    isFeatured: row.is_featured,
    isTrending: row.is_trending,
    isLatestNews: row.is_latest_news,
    isExclusiveOffer: row.is_exclusive_offer,
    isSignatureMachine: row.is_signature_machine,
    status: row.status,
    publishDate: row.publish_date,
    publishedAt: row.publish_date,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function cmsLog(level: string, action: string, req: Request, extra: Record<string, any> = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    action,
    requestId: req.headers['x-request-id'] || null,
    userId: (req as any).user?.id || null,
    role: (req as any).user?.role || null,
    ...extra,
  };
  console.log(JSON.stringify(entry));
}

// ── Admin routes ──────────────────────────────────────────────────────────

router.get('/admin/homepage-content', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { type, status } = req.query as { type?: string; status?: string };
    const params: any[] = [];
    const where: string[] = [];
    if (type) {
      if (!CMS_CONTENT_TYPES.has(type)) {
        return res.status(400).json({ error: `Invalid type '${type}'` });
      }
      params.push(type);
      where.push(`content_type = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    const sql = `SELECT * FROM gaming_hub ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY content_type, display_order ASC, COALESCE(publish_date, created_at) DESC`;
    const r = await query(sql, params);
    cmsLog('info', 'admin.homepage.list', req, { count: r.rows.length, type: type || null });
    res.json(r.rows.map(cmsProjectRow));
  } catch (e: any) {
    cmsLog('error', 'admin.homepage.list', req, { message: String(e?.message) });
    res.status(500).json({ error: 'Failed to list homepage content' });
  }
});

router.get('/admin/homepage-content/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const r = await query('SELECT * FROM gaming_hub WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    cmsLog('info', 'admin.homepage.get', req, { id: req.params.id });
    res.json(cmsProjectRow(r.rows[0]));
  } catch (e: any) {
    cmsLog('error', 'admin.homepage.get', req, { id: req.params.id, message: String(e?.message) });
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

router.post('/admin/homepage-content', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    const row = cmsNormalizeRow(req.body);
    if (!row.title) return res.status(400).json({ error: 'title is required' });
    if (!row.content_type || !CMS_CONTENT_TYPES.has(row.content_type)) {
      return res.status(400).json({ error: 'content_type is required and must be valid' });
    }
    if (row.status && !['draft', 'published', 'scheduled', 'archived'].includes(row.status)) {
      return res.status(400).json({ error: `Invalid status '${row.status}'` });
    }
    row.slug = await cmsResolveSlug(row);
    row.status = row.status || 'draft';
    if (row.status === 'published' && !row.publish_date) {
      row.publish_date = new Date();
    }
    await client.query('BEGIN');
    const cols = Object.keys(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const values = cols.map((c) => row[c]);
    const insert = await client.query(
      `INSERT INTO gaming_hub (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    await client.query('COMMIT');
    const created = insert.rows[0];
    cmsLog('info', 'admin.homepage.create', req, { id: created.id, type: created.content_type, status: created.status });
    res.status(201).json(cmsProjectRow(created));
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    cmsLog('error', 'admin.homepage.create', req, { message: String(e?.message) });
    if (e?.code === '23505') {
      return res.status(409).json({ error: 'Duplicate slug', code: 'duplicate_slug' });
    }
    res.status(500).json({ error: 'Failed to create record' });
  } finally {
    client.release();
  }
});

router.put('/admin/homepage-content/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    const id = req.params.id;
    const existing = await client.query('SELECT * FROM gaming_hub WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = cmsNormalizeRow(req.body);
    if (Object.keys(row).length === 0) return res.status(400).json({ error: 'No writable fields provided' });
    if (row.content_type && !CMS_CONTENT_TYPES.has(row.content_type)) {
      return res.status(400).json({ error: `Invalid content_type '${row.content_type}'` });
    }
    if (row.status && !['draft', 'published', 'scheduled', 'archived'].includes(row.status)) {
      return res.status(400).json({ error: `Invalid status '${row.status}'` });
    }
    if (row.status === 'published' && !row.publish_date) {
      row.publish_date = new Date();
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'slug') || row.title) {
      row.slug = await cmsResolveSlug(row, String(id));
    }
    const cols = Object.keys(row);
    const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const values = cols.map((c) => row[c]);
    values.push(id);
    await client.query('BEGIN');
    const r = await client.query(
      `UPDATE gaming_hub SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    await client.query('COMMIT');
    const updated = r.rows[0];
    cmsLog('info', 'admin.homepage.update', req, { id: updated.id, type: updated.content_type, status: updated.status });
    res.json(cmsProjectRow(updated));
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    cmsLog('error', 'admin.homepage.update', req, { id: req.params.id, message: String(e?.message) });
    if (e?.code === '23505') {
      return res.status(409).json({ error: 'Duplicate slug', code: 'duplicate_slug' });
    }
    res.status(500).json({ error: 'Failed to update record' });
  } finally {
    client.release();
  }
});

router.patch('/admin/homepage-content/:id/publish', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const r = await query(
      `UPDATE gaming_hub SET status = 'published', publish_date = COALESCE(publish_date, NOW()), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    cmsLog('info', 'admin.homepage.publish', req, { id: r.rows[0].id });
    res.json(cmsProjectRow(r.rows[0]));
  } catch (e: any) {
    cmsLog('error', 'admin.homepage.publish', req, { id: req.params.id, message: String(e?.message) });
    res.status(500).json({ error: 'Failed to publish record' });
  }
});

router.patch('/admin/homepage-content/:id/unpublish', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const r = await query(
      `UPDATE gaming_hub SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    cmsLog('info', 'admin.homepage.unpublish', req, { id: r.rows[0].id });
    res.json(cmsProjectRow(r.rows[0]));
  } catch (e: any) {
    cmsLog('error', 'admin.homepage.unpublish', req, { id: req.params.id, message: String(e?.message) });
    res.status(500).json({ error: 'Failed to unpublish record' });
  }
});

router.patch('/admin/homepage-content/reorder', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Body must be { items: [...] }' });
    }
    await client.query('BEGIN');
    for (const it of items) {
      if (!it || typeof it.id !== 'string') continue;
      const order = Number(it.displayOrder);
      if (!Number.isFinite(order)) continue;
      await client.query(
        'UPDATE gaming_hub SET display_order = $1, updated_at = NOW() WHERE id = $2',
        [order, it.id]
      );
    }
    await client.query('COMMIT');
    cmsLog('info', 'admin.homepage.reorder', req, { count: items.length });
    res.json({ success: true, updated: items.length });
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    cmsLog('error', 'admin.homepage.reorder', req, { message: String(e?.message) });
    res.status(500).json({ error: 'Failed to reorder' });
  } finally {
    client.release();
  }
});

router.delete('/admin/homepage-content/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await query('SELECT * FROM gaming_hub WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await query('DELETE FROM gaming_hub WHERE id = $1', [req.params.id]);
    cmsLog('info', 'admin.homepage.delete', req, { id: req.params.id });
    res.json({ success: true });
  } catch (e: any) {
    cmsLog('error', 'admin.homepage.delete', req, { id: req.params.id, message: String(e?.message) });
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// ── Public routes ────────────────────────────────────────────────────────

function publicNoCache(_req: Request, res: Response, next: any) {
  res.set('Cache-Control', 'no-store, max-age=0');
  res.set('Pragma', 'no-cache');
  next();
}

router.get('/public/homepage-content', publicNoCache, async (req: Request, res: Response) => {
  try {
    const { type } = req.query as { type?: string };
    const params: any[] = [CMS_PUBLISHED_STATUS];
    let where = 'WHERE status = $1';
    if (type) {
      if (!CMS_CONTENT_TYPES.has(type)) {
        return res.status(400).json({ error: `Invalid type '${type}'` });
      }
      params.push(type);
      where += ` AND content_type = $${params.length}`;
    }
    const sql = `SELECT * FROM gaming_hub ${where}
      ORDER BY content_type, display_order ASC, COALESCE(publish_date, created_at) DESC`;
    const r = await query(sql, params);
    res.json(r.rows.map(cmsProjectRow));
  } catch (e: any) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', action: 'public.homepage.list', message: String(e?.message) }));
    res.status(500).json({ error: 'Failed to load homepage content' });
  }
});

router.get('/public/homepage-content/:slug', publicNoCache, async (req: Request, res: Response) => {
  try {
    const r = await query(
      'SELECT * FROM gaming_hub WHERE slug = $1 AND status = $2 LIMIT 1',
      [req.params.slug, CMS_PUBLISHED_STATUS]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(cmsProjectRow(r.rows[0]));
  } catch (e: any) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', action: 'public.homepage.slug', slug: req.params.slug, message: String(e?.message) }));
    res.status(500).json({ error: 'Failed to load record' });
  }
});

// ── S3 image routes ──────────────────────────────────────────────────────

const CMS_ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CMS_IMAGE_EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const CMS_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function cmsSanitizeFilename(name: string): string {
  return String(name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/(^-+|-+$)/g, '')
    .toLowerCase() || 'image';
}

const CMS_IMAGE_SLOT_TO_COLUMN: Record<string, string> = {
  cover: 'cover_image',
  thumbnail: 'thumbnail_image',
  banner: 'banner_image',
};

router.post('/admin/homepage-content/:id/images/upload-url', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  if (!cmsBucket) {
    return res.status(503).json({ error: 'Image upload is not configured. Set PRODUCT_IMAGE_BUCKET.', code: 'image_bucket_not_configured' });
  }
  try {
    const id = req.params.id;
    const existing = await query('SELECT id, content_type FROM gaming_hub WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Content not found' });
    const { fileName, contentType, slot } = req.body || {};
    if (!fileName || typeof fileName !== 'string') return res.status(400).json({ error: 'fileName is required' });
    if (!CMS_ALLOWED_IMAGE_TYPES.has(contentType)) {
      return res.status(400).json({ error: `Unsupported contentType '${contentType}'` });
    }
    const col = CMS_IMAGE_SLOT_TO_COLUMN[String(slot || 'cover')] || 'cover_image';
    if (!['cover_image', 'thumbnail_image', 'banner_image'].includes(col)) {
      return res.status(400).json({ error: 'Invalid slot' });
    }
    const ext = CMS_IMAGE_EXT_BY_TYPE[contentType];
    const safe = cmsSanitizeFilename(fileName);
    const contentTypeSlug = String(existing.rows[0].content_type || 'misc').replace(/[^a-z0-9-]/gi, '-');
    const objectKey = `homepage-content/${contentTypeSlug}/${id}/${Date.now()}-${randomUUID().slice(0, 8)}-${safe}.${ext}`;
    const command = new PutObjectCommand({
      Bucket: cmsBucket,
      Key: objectKey,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });
    const expiresIn = 900;
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
    const publicUrl = cmsCdnBase ? `${cmsCdnBase}/${objectKey}` : `https://${cmsBucket}.s3.${awsRegion}.amazonaws.com/${objectKey}`;
    cmsLog('info', 'admin.homepage.image.uploadUrl', req, { id, slot: col });
    res.json({
      uploadUrl,
      objectKey,
      publicUrl,
      cdnUrl: publicUrl,
      bucket: cmsBucket,
      slot: col,
      contentType,
      expiresIn,
      maxBytes: CMS_MAX_IMAGE_BYTES,
    });
  } catch (e: any) {
    cmsLog('error', 'admin.homepage.image.uploadUrl', req, { id: req.params.id, message: String(e?.message) });
    res.status(500).json({ error: 'Failed to create image upload URL' });
  }
});

router.post('/admin/homepage-content/:id/images/complete', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    const id = req.params.id;
    const { objectKey, slot, galleryIndex } = req.body || {};
    if (!objectKey || typeof objectKey !== 'string') return res.status(400).json({ error: 'objectKey is required' });
    const col = slot === 'gallery' ? null : (CMS_IMAGE_SLOT_TO_COLUMN[String(slot || 'cover')] || 'cover_image');
    if (slot && slot !== 'gallery' && !col) return res.status(400).json({ error: 'Invalid slot' });
    const existing = await client.query('SELECT * FROM gaming_hub WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Content not found' });
    const row = existing.rows[0];
    const expectedPrefix = `homepage-content/${String(row.content_type).replace(/[^a-z0-9-]/gi, '-')}/${id}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      return res.status(400).json({ error: 'objectKey does not belong to this content record', expectedPrefix });
    }
    await client.query('BEGIN');
    let updated: any;
    if (slot === 'gallery') {
      const current = Array.isArray(row.gallery_images) ? row.gallery_images.slice() : [];
      const idx = Number.isInteger(galleryIndex) ? galleryIndex : current.length;
      if (idx < 0) return res.status(400).json({ error: 'galleryIndex must be >= 0' });
      if (idx >= current.length) current.push(objectKey);
      else current[idx] = objectKey;
      if (current.length > 5) current.length = 5;
      const r = await client.query(
        'UPDATE gaming_hub SET gallery_images = $1::text[], updated_at = NOW() WHERE id = $2 RETURNING *',
        [current, id]
      );
      updated = r.rows[0];
    } else {
      const r = await client.query(
        `UPDATE gaming_hub SET ${col} = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [objectKey, id]
      );
      updated = r.rows[0];
    }
    await client.query('COMMIT');
    cmsLog('info', 'admin.homepage.image.complete', req, { id, slot: slot || col });
    res.json(cmsProjectRow(updated));
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    cmsLog('error', 'admin.homepage.image.complete', req, { id: req.params.id, message: String(e?.message) });
    res.status(500).json({ error: 'Failed to attach image' });
  } finally {
    client.release();
  }
});

router.post('/admin/homepage-content/:id/images/gallery-delete', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    const id = req.params.id;
    const { galleryIndex } = req.body || {};
    const idx = Number(galleryIndex);
    if (!Number.isInteger(idx) || idx < 0) return res.status(400).json({ error: 'galleryIndex must be a non-negative integer' });
    await client.query('BEGIN');
    const existing = await client.query('SELECT gallery_images FROM gaming_hub WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Content not found' });
    const current = Array.isArray(existing.rows[0].gallery_images) ? existing.rows[0].gallery_images.slice() : [];
    if (idx >= current.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'galleryIndex out of range' });
    }
    current.splice(idx, 1);
    const r = await client.query(
      'UPDATE gaming_hub SET gallery_images = $1::text[], updated_at = NOW() WHERE id = $2 RETURNING *',
      [current, id]
    );
    await client.query('COMMIT');
    res.json(cmsProjectRow(r.rows[0]));
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'Failed to remove gallery image' });
  } finally {
    client.release();
  }
});

export default router;