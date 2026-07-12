// =============================================
// DESKTO COMPLETE BACKEND API (60+ Endpoints)
// Supports all 32 dashboard pages
// =============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'deskto-secret-2024';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    next();
  };
}

function logAudit(userId, action, entityType, entityId, newValues) {
  pool.query(
    'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1,$2,$3,$4,$5)',
    [userId, action, entityType, entityId, JSON.stringify(newValues)]
  ).catch(() => {});
}

function generateNumber(type) {
  const prefix = type === 'repair' ? 'REP' : type === 'build' ? 'BLD' : type === 'assembly' ? 'ASM' : type === 'upgrade' ? 'UPG' : type === 'software' ? 'SOF' : type === 'rental' ? 'RNT' : type === 'support' ? 'TKT' : type === 'sell' ? 'SEL' : type === 'delivery' ? 'DEL' : type === 'purchase' ? 'PO' : 'ORD';
  return `${prefix}-${Date.now()}`;
}

// =============================================
// HEALTH & AUTH
// =============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Missing fields' });

    const result = await pool.query('SELECT * FROM users WHERE email=$1 OR phone=$1', [identifier]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    if (user.status === 'locked') return res.status(423).json({ error: 'Account locked' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    const refreshToken = crypto.randomBytes(64).toString('hex');

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.first_name, lastName: user.last_name,
        avatarUrl: user.avatar_url
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, email, first_name, last_name, role, avatar_url, status, is_verified FROM users WHERE id=$1', [req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// DASHBOARD (Overview Page)
// =============================================

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const [
      revenueR, ordersR, repairsR, buildsR,
      pendingR, deliveredR, customersR, staffR,
      categoryR, brandR, productR, lowStockR, outOfStockR
    ] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status!='cancelled'"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status!='cancelled'"),
      pool.query("SELECT COUNT(*) FROM repairs WHERE status NOT IN ('completed','delivered','cancelled')"),
      pool.query("SELECT COUNT(*) FROM pc_builds WHERE status NOT IN ('completed','delivered','cancelled')"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status='placed'"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status='delivered'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role='customer'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role='staff' AND status='active'"),
      pool.query("SELECT COUNT(*) FROM categories WHERE is_active=TRUE"),
      pool.query("SELECT COUNT(*) FROM brands WHERE is_active=TRUE"),
      pool.query("SELECT COUNT(*) FROM products WHERE is_active=TRUE"),
      pool.query("SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0"),
      pool.query("SELECT COUNT(*) FROM products WHERE stock_quantity = 0"),
    ]);

    res.json({
      revenue: revenueR.rows[0].total,
      orders: ordersR.rows[0].count,
      repairs: repairsR.rows[0].count,
      builds: buildsR.rows[0].count,
      pendingOrders: pendingR.rows[0].count,
      deliveredOrders: deliveredR.rows[0].count,
      customers: customersR.rows[0].count,
      activeStaff: staffR.rows[0].count,
      categories: categoryR.rows[0].count,
      brands: brandR.rows[0].count,
      products: productR.rows[0].count,
      lowStock: lowStockR.rows[0].count,
      outOfStock: outOfStockR.rows[0].count,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/dashboard/charts/revenue', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT DATE_TRUNC('month', created_at) as month, SUM(total_amount) as revenue FROM orders WHERE status!='cancelled' GROUP BY month ORDER BY month DESC LIMIT 12"
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/dashboard/recent-activity', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20"
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// CATEGORIES
// =============================================

app.get('/api/categories', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id=c.id) as product_count
       FROM categories c WHERE c.is_active=TRUE ORDER BY c.sort_order, c.name`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

app.get('/api/categories/all', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM categories ORDER BY sort_order, name');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/categories', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description, icon, iconColor, parentId, sortOrder } = req.body;
    const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      'INSERT INTO categories (name, slug, description, icon, icon_color, parent_id, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, slug, description, icon, iconColor, parentId, sortOrder || 0]
    );
    logAudit(req.user.id, 'create_category', 'category', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Slug exists' });
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, iconColor, parentId, sortOrder, isActive } = req.body;
    const r = await pool.query(
      'UPDATE categories SET name=COALESCE($1,name), description=COALESCE($2,description), icon=COALESCE($3,icon), icon_color=COALESCE($4,icon_color), parent_id=COALESCE($5,parent_id), sort_order=COALESCE($6,sort_order), is_active=COALESCE($7,is_active), updated_at=NOW() WHERE id=$8 RETURNING *',
      [name, description, icon, iconColor, parentId, sortOrder, isActive, id]
    );
    logAudit(req.user.id, 'update_category', 'category', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT COUNT(*) as c FROM products WHERE category_id=$1', [id]);
    if (+check.rows[0].c > 0) {
      await pool.query('UPDATE categories SET is_active=FALSE WHERE id=$1', [id]);
    } else {
      await pool.query('DELETE FROM categories WHERE id=$1', [id]);
    }
    logAudit(req.user.id, 'delete_category', 'category', id, {});
    res.json({ message: 'Done' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// =============================================
// BRANDS
// =============================================

app.get('/api/brands', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT b.*, (SELECT COUNT(*) FROM products WHERE brand_id=b.id) as product_count
       FROM brands b WHERE b.is_active=TRUE ORDER BY b.name`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/brands/all', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM brands ORDER BY name');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/brands', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description, logoUrl, website } = req.body;
    const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      'INSERT INTO brands (name, slug, description, logo_url, website) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, slug, description, logoUrl, website]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/brands/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logoUrl, website, isActive } = req.body;
    const r = await pool.query(
      'UPDATE brands SET name=COALESCE($1,name), description=COALESCE($2,description), logo_url=COALESCE($3,logo_url), website=COALESCE($4,website), is_active=COALESCE($5,is_active) WHERE id=$6 RETURNING *',
      [name, description, logoUrl, website, isActive, id]
    );
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// PRODUCTS
// =============================================

app.get('/api/products', async (req, res) => {
  try {
    const { page=1, limit=20, category, brand, search, stockStatus, isFeatured } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];

    if (category) { params.push(category); where += ` AND p.category_id=$${params.length}`; }
    if (brand) { params.push(brand); where += ` AND p.brand_id=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`; }
    if (stockStatus === 'low') where += ' AND p.stock_quantity <= p.low_stock_threshold AND p.stock_quantity > 0';
    if (stockStatus === 'out') where += ' AND p.stock_quantity = 0';
    if (isFeatured === 'true') where += ' AND p.is_featured = TRUE';

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM products p ${where}`, params),
      pool.query(
        `SELECT p.*, c.name as category_name, b.name as brand_name FROM products p
         LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN brands b ON p.brand_id=b.id
         ${where} ORDER BY p.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, +limit, +offset]
      )
    ]);
    res.json({ products: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `SELECT p.*, c.name as category_name, b.name as brand_name FROM products p
       LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN brands b ON p.brand_id=b.id WHERE p.id=$1`,
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/products', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { sku, name, description, price, categoryId, brandId, stockQuantity, imageUrl, specifications, tags, isFeatured, lowStockThreshold } = req.body;
    const slug = (name||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const [catR, brandR] = await Promise.all([
      pool.query('SELECT name FROM categories WHERE id=$1', [categoryId]),
      pool.query('SELECT name FROM brands WHERE id=$1', [brandId]),
    ]);
    const r = await pool.query(
      `INSERT INTO products (sku,name,slug,description,price,category_id,category_name,brand_id,brand_name,stock_quantity,image_url,specifications,tags,is_featured,low_stock_threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [sku, name, slug, description, price, categoryId, catR.rows[0]?.name, brandId, brandR.rows[0]?.name, stockQuantity||0, imageUrl, JSON.stringify(specifications||{}), tags||[], isFeatured||false, lowStockThreshold||5]
    );
    logAudit(req.user.id, 'create_product', 'product', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/products/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u);
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    if (!setClause) return res.status(400).json({ error: 'No data' });
    const values = [...Object.values(u), id];
    const r = await pool.query(`UPDATE products SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    logAudit(req.user.id, 'update_product', 'product', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.delete('/api/products/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE products SET is_active=FALSE WHERE id=$1', [id]);
    logAudit(req.user.id, 'delete_product', 'product', id, {});
    res.json({ message: 'Product deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// ORDERS
// =============================================

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = req.user.role === 'customer' ? 'WHERE user_id=$1' : 'WHERE 1=1';
    const params = req.user.role === 'customer' ? [req.user.id] : [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (order_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM orders ${where}`, params),
      pool.query(
        `SELECT o.*, u.first_name||' '||u.last_name as assigned_staff_name FROM orders o
         LEFT JOIN users u ON o.assigned_staff_id=u.id ${where}
         ORDER BY o.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, +limit, +offset]
      )
    ]);
    res.json({ orders: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/orders/my', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    const params = [req.user.id];
    let where = 'WHERE user_id=$1';
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM orders ${where}`, params),
      pool.query(
        `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, +limit, +offset]
      )
    ]);
    res.json({ orders: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    console.error('[orders] getMy failed:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/orders/number/:orderNumber', authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const r = await pool.query('SELECT * FROM orders WHERE order_number=$1', [orderNumber]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role === 'customer' && r.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Allow lookup by id (UUID) or order_number (ORD-...)
    const r = await pool.query(
      'SELECT * FROM orders WHERE id::text=$1 OR order_number=$1',
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const row = r.rows[0];
    if (req.user.role === 'customer' && row.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const {
      customerName, customerEmail, customerPhone,
      items, subtotal, taxAmount, shippingAmount, discountAmount,
      paymentMethod, shippingAddress, notes, postalCode, status,
    } = req.body;

    // Normalize items: frontend may send new shape ({sku, name, price, quantity, img})
    // or old shape ({productId, name, qty, price, img}). Persist the rich shape so the
    // admin UI renders without a second lookup.
    const normalizedItems = (items || []).map((it) => ({
      sku: it.sku || it.productSku || null,
      productId: it.productId || null,
      name: it.name || it.productName || "Item",
      price: typeof it.price === "number" ? it.price : (it.unitPrice || 0),
      quantity: it.quantity ?? it.qty ?? 1,
      img: it.img || it.productImage || "",
    }));

    // Subtotal can be derived from items if missing — keep client's value when supplied.
    const computedSubtotal =
      typeof subtotal === "number"
        ? subtotal
        : normalizedItems.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);

    const safeShippingAddress = shippingAddress
      ? { ...shippingAddress, postalCode: postalCode || shippingAddress.postalCode || shippingAddress.pincode || "" }
      : {};

    const orderNumber = `ORD-${Date.now()}`;
    const totalAmount = computedSubtotal + (taxAmount||0) + (shippingAmount||0) - (discountAmount||0);

    // Customers can only create orders for themselves.
    const userId = req.user.id;

    const r = await pool.query(
      `INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, payment_method, items, shipping_address, notes, assigned_staff_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        orderNumber, userId,
        customerName || "", customerEmail || "", customerPhone || "",
        status || 'placed',
        computedSubtotal, taxAmount || 0, shippingAmount || 0, discountAmount || 0,
        totalAmount, paymentMethod || 'cod',
        JSON.stringify(normalizedItems),
        JSON.stringify(safeShippingAddress),
        notes || "",
        req.user.role === 'admin' || req.user.role === 'staff' ? userId : null,
      ]
    );
    logAudit(req.user.id, 'create_order', 'order', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    console.error('[orders] create failed:', error);
    res.status(500).json({ error: 'Failed to create order', detail: error.message });
  }
});

app.put('/api/orders/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u).filter(k => !['id','created_at'].includes(k));
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    if (!setClause) return res.status(400).json({ error: 'No data' });
    const values = [...Object.values(u).filter((_,i) => !['id','created_at'].includes(Object.keys(u)[i])), id];
    const r = await pool.query(`UPDATE orders SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    logAudit(req.user.id, 'update_order', 'order', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// PATCH status — frontend ordersApi.updateStatus() calls PATCH.
app.patch('/api/orders/:id/status', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const r = await pool.query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [status, id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    logAudit(req.user.id, 'update_order_status', 'order', id, { status });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// PUT status — keep working as a fallback for older clients
app.put('/api/orders/:id/status', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const r = await pool.query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [status, id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    logAudit(req.user.id, 'update_order_status', 'order', id, { status });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// REPAIRS
// =============================================

app.get('/api/repairs', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = req.user.role === 'customer' ? 'WHERE user_id=$1' : 'WHERE 1=1';
    const params = req.user.role === 'customer' ? [req.user.id] : [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (repair_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM repairs ${where}`, params),
      pool.query(`SELECT r.*, u.first_name||' '||u.last_name as technician_name FROM repairs r LEFT JOIN users u ON r.technician_id=u.id ${where} ORDER BY r.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ repairs: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/repairs/:id', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM repairs WHERE id=$1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/repairs', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, deviceType, deviceBrand, deviceModel, deviceIssue, deviceImages } = req.body;
    const repairNumber = `REP-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO repairs (repair_number, user_id, customer_name, customer_email, customer_phone, device_type, device_brand, device_model, device_issue, device_images, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'submitted') RETURNING *`,
      [repairNumber, req.user.id, customerName, customerEmail, customerPhone, deviceType, deviceBrand, deviceModel, deviceIssue, deviceImages||[]]
    );
    logAudit(req.user.id, 'create_repair', 'repair', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/repairs/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u).filter(k => !['id','repair_number','created_at'].includes(k));
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    const values = [...Object.values(u).filter((_,i) => !['id','repair_number','created_at'].includes(Object.keys(u)[i])), id];
    const r = await pool.query(`UPDATE repairs SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    logAudit(req.user.id, 'update_repair', 'repair', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// PC BUILDS
// =============================================

app.get('/api/pc-builds', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = req.user.role === 'customer' ? 'WHERE user_id=$1' : 'WHERE 1=1';
    const params = req.user.role === 'customer' ? [req.user.id] : [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (build_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR title ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM pc_builds ${where}`, params),
      pool.query(`SELECT * FROM pc_builds ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ builds: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/pc-builds', authenticateToken, async (req, res) => {
  try {
    const { title, description, useCase, budgetRange, components, customerName, customerEmail, customerPhone } = req.body;
    const buildNumber = `BLD-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO pc_builds (build_number, user_id, customer_name, customer_email, customer_phone, title, description, use_case, budget_range, status, components) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'submitted',$10) RETURNING *`,
      [buildNumber, req.user.id, customerName, customerEmail, customerPhone, title, description, useCase, budgetRange, JSON.stringify(components||[])]
    );
    logAudit(req.user.id, 'create_build', 'pc_build', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/pc-builds/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u).filter(k => !['id','build_number','created_at'].includes(k));
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    const values = [...Object.values(u).filter((_,i) => !['id','build_number','created_at'].includes(Object.keys(u)[i])), id];
    const r = await pool.query(`UPDATE pc_builds SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    logAudit(req.user.id, 'update_build', 'pc_build', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// ASSEMBLY
// =============================================

app.get('/api/assemblies', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (assembly_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM assemblies ${where}`, params),
      pool.query(`SELECT * FROM assemblies ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ assemblies: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/assemblies', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { buildId, repairId, customerName, title, components, technicianId } = req.body;
    const assemblyNumber = `ASM-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO assemblies (assembly_number, build_id, repair_id, user_id, customer_name, title, status, components, technician_id) VALUES ($1,$2,$3,$4,$5,$6,'queued',$7,$8) RETURNING *`,
      [assemblyNumber, buildId, repairId, req.user.id, customerName, title, JSON.stringify(components||[]), technicianId]
    );
    logAudit(req.user.id, 'create_assembly', 'assembly', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// UPGRADES
// =============================================

app.get('/api/upgrades', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = req.user.role === 'customer' ? 'WHERE user_id=$1' : 'WHERE 1=1';
    const params = req.user.role === 'customer' ? [req.user.id] : [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (upgrade_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM upgrades ${where}`, params),
      pool.query(`SELECT * FROM upgrades ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ upgrades: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/upgrades', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, deviceType, deviceModel, currentSpecs, upgradeItems, estimatedCost } = req.body;
    const upgradeNumber = `UPG-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO upgrades (upgrade_number, user_id, customer_name, customer_email, customer_phone, device_type, device_model, current_specs, upgrade_items, estimated_cost, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'requested') RETURNING *`,
      [upgradeNumber, req.user.id, customerName, customerEmail, customerPhone, deviceType, deviceModel, JSON.stringify(currentSpecs||{}), JSON.stringify(upgradeItems||[]), estimatedCost]
    );
    logAudit(req.user.id, 'create_upgrade', 'upgrade', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// SOFTWARE SERVICES
// =============================================

app.get('/api/software-services', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = req.user.role === 'customer' ? 'WHERE user_id=$1' : 'WHERE 1=1';
    const params = req.user.role === 'customer' ? [req.user.id] : [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (service_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR software_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM software_services ${where}`, params),
      pool.query(`SELECT * FROM software_services ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ services: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/software-services', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, softwareName, licenseType, deviceInfo } = req.body;
    const serviceNumber = `SOF-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO software_services (service_number, user_id, customer_name, customer_email, customer_phone, software_name, license_type, device_info, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'requested') RETURNING *`,
      [serviceNumber, req.user.id, customerName, customerEmail, customerPhone, softwareName, licenseType, JSON.stringify(deviceInfo||{})]
    );
    logAudit(req.user.id, 'create_software_service', 'software_service', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// RENTALS
// =============================================

app.get('/api/rentals', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (rental_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM rentals ${where}`, params),
      pool.query(`SELECT * FROM rentals ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ rentals: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/rentals', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, productId, productName, productSnapshot, rentalStart, rentalEnd, rentalPrice, securityDeposit } = req.body;
    const rentalNumber = `RNT-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO rentals (rental_number, user_id, customer_name, customer_email, customer_phone, product_id, product_name, product_snapshot, status, rental_start, rental_end, rental_price, security_deposit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'reserved',$9,$10,$11,$12) RETURNING *`,
      [rentalNumber, req.user.id, customerName, customerEmail, customerPhone, productId, productName, JSON.stringify(productSnapshot||{}), rentalStart, rentalEnd, rentalPrice, securityDeposit]
    );
    logAudit(req.user.id, 'create_rental', 'rental', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// SUPPORT TICKETS
// =============================================

app.get('/api/support-tickets', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, priority, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (priority) { params.push(priority); where += ` AND priority=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (ticket_number ILIKE $${params.length} OR subject ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM support_tickets ${where}`, params),
      pool.query(`SELECT t.*, u.first_name||' '||u.last_name as assigned_staff_name FROM support_tickets t LEFT JOIN users u ON t.assigned_staff_id=u.id ${where} ORDER BY t.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ tickets: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/support-tickets', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, subject, description, category, priority } = req.body;
    const ticketNumber = `TKT-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO support_tickets (ticket_number, user_id, customer_name, customer_email, customer_phone, subject, description, category, priority, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open') RETURNING *`,
      [ticketNumber, req.user.id, customerName, customerEmail, customerPhone, subject, description, category, priority||'medium']
    );
    logAudit(req.user.id, 'create_ticket', 'support_ticket', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// SELL USED / TRADE-IN
// =============================================

app.get('/api/sell-used', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (sale_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR product_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM sell_used ${where}`, params),
      pool.query(`SELECT * FROM sell_used ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ trades: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/sell-used', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, productName, productBrand, model, purchaseYear, originalPrice, currentCondition, issues } = req.body;
    const saleNumber = `SEL-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO sell_used (sale_number, user_id, customer_name, customer_email, customer_phone, product_name, product_brand, model, purchase_year, original_price, current_condition, issues, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'quoted') RETURNING *`,
      [saleNumber, req.user.id, customerName, customerEmail, customerPhone, productName, productBrand, model, purchaseYear, originalPrice, currentCondition, issues]
    );
    logAudit(req.user.id, 'create_tradein', 'sell_used', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// DELIVERIES
// =============================================

app.get('/api/deliveries', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (delivery_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM deliveries ${where}`, params),
      pool.query(`SELECT * FROM deliveries ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ deliveries: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/deliveries', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { relatedType, relatedId, customerName, customerPhone, address, scheduledDate, scheduledTime, deliveryPartner, trackingNumber } = req.body;
    const deliveryNumber = `DEL-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO deliveries (delivery_number, related_type, related_id, customer_name, customer_phone, address, status, scheduled_date, scheduled_time, delivery_partner, tracking_number) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10) RETURNING *`,
      [deliveryNumber, relatedType, relatedId, customerName, customerPhone, JSON.stringify(address||{}), scheduledDate, scheduledTime, deliveryPartner, trackingNumber]
    );
    logAudit(req.user.id, 'create_delivery', 'delivery', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// SUPPLIERS
// =============================================

app.get('/api/suppliers', async (req, res) => {
  try {
    const { page=1, limit=20, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); where += ` AND (name ILIKE $${params.length} OR contact_person ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM suppliers ${where}`, params),
      pool.query(`SELECT * FROM suppliers ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ suppliers: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/suppliers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, city, state, pincode, gstNumber, website, notes } = req.body;
    const slug = (name||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      `INSERT INTO suppliers (name, slug, contact_person, email, phone, address, city, state, pincode, gst_number, website, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, slug, contactPerson, email, phone, address, city, state, pincode, gstNumber, website, notes]
    );
    logAudit(req.user.id, 'create_supplier', 'supplier', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/suppliers/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u).filter(k => !['id','slug','created_at'].includes(k));
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    const values = [...Object.values(u).filter((_,i) => !['id','slug','created_at'].includes(Object.keys(u)[i])), id];
    const r = await pool.query(`UPDATE suppliers SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    logAudit(req.user.id, 'update_supplier', 'supplier', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// PURCHASE ORDERS
// =============================================

app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (po_number ILIKE $${params.length} OR supplier_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM purchase_orders ${where}`, params),
      pool.query(`SELECT * FROM purchase_orders ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ purchaseOrders: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/purchase-orders', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { supplierId, supplierName, items, totalAmount, notes } = req.body;
    const poNumber = `PO-${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, supplier_name, status, items, total_amount, notes, created_by) VALUES ($1,$2,$3,'draft',$4,$5,$6,$7) RETURNING *`,
      [poNumber, supplierId, supplierName, JSON.stringify(items||[]), totalAmount, notes, req.user.id]
    );
    logAudit(req.user.id, 'create_purchase_order', 'purchase_order', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// COUPONS
// =============================================

app.get('/api/coupons', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { page=1, limit=20, search, isActive } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); where += ` AND (code ILIKE $${params.length} OR name ILIKE $${params.length})`; }
    if (isActive !== undefined) { params.push(isActive === 'true'); where += ` AND is_active=$${params.length}`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM coupons ${where}`, params),
      pool.query(`SELECT * FROM coupons ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ coupons: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/coupons', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { code, name, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil } = req.body;
    const r = await pool.query(
      `INSERT INTO coupons (code, name, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_until, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [code.toUpperCase(), name, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil, req.user.id]
    );
    logAudit(req.user.id, 'create_coupon', 'coupon', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/coupons/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u).filter(k => !['id','code','created_at','created_by','usage_count'].includes(k));
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    if (!setClause) return res.status(400).json({ error: 'No data' });
    const values = [...Object.values(u).filter((_,i) => !['id','code','created_at','created_by','usage_count'].includes(Object.keys(u)[i])), id];
    const r = await pool.query(`UPDATE coupons SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    logAudit(req.user.id, 'update_coupon', 'coupon', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// OFFERS
// =============================================

app.get('/api/offers', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM offers ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/offers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { title, description, discountValue, discountType, startDate, endDate } = req.body;
    const slug = (title||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      'INSERT INTO offers (title, slug, description, discount_value, discount_type, start_date, end_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [title, slug, description, discountValue, discountType, startDate, endDate]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// GAMING HUB
// =============================================

app.get('/api/gaming-hub', async (req, res) => {
  try {
    const { type, featured, status='published', search } = req.query;
    let where = 'WHERE status=$1';
    const params = [status];
    if (type) { params.push(type); where += ` AND content_type=$${params.length}`; }
    if (featured === 'true') where += ' AND is_featured=TRUE';
    if (search) { params.push(`%${search}%`); where += ` AND (title ILIKE $${params.length} OR short_description ILIKE $${params.length})`; }

    const r = await pool.query(`SELECT * FROM gaming_hub ${where} ORDER BY display_order, created_at DESC LIMIT 50`, params);
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/gaming-hub/:slug', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM gaming_hub WHERE slug=$1 AND status=\'published\'', [req.params.slug]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/gaming-hub', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { title, contentType, category, shortDescription, content, author, coverImage, tags, status, isFeatured, isTrending, isExclusiveOffer, metaTitle, metaDescription, publishDate } = req.body;
    const slug = (title||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      `INSERT INTO gaming_hub (title, slug, content_type, category, short_description, content, author, cover_image, tags, status, is_featured, is_trending, is_exclusive_offer, meta_title, meta_description, publish_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [title, slug, contentType, category, shortDescription, content, author, coverImage, tags||[], status||'draft', isFeatured||false, isTrending||false, isExclusiveOffer||false, metaTitle, metaDescription, publishDate]
    );
    logAudit(req.user.id, 'create_gaming_hub', 'gaming_hub', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/gaming-hub/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u).filter(k => !['id','slug','created_at'].includes(k));
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    const values = [...Object.values(u).filter((_,i) => !['id','slug','created_at'].includes(Object.keys(u)[i])), id];
    const r = await pool.query(`UPDATE gaming_hub SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    logAudit(req.user.id, 'update_gaming_hub', 'gaming_hub', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.delete('/api/gaming-hub/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM gaming_hub WHERE id=$1', [id]);
    logAudit(req.user.id, 'delete_gaming_hub', 'gaming_hub', id, {});
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// FEATURED BUILDS
// =============================================

app.get('/api/featured-builds', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM featured_builds WHERE is_published=TRUE ORDER BY sort_order, created_at DESC');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/featured-builds/all', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM featured_builds ORDER BY sort_order, created_at DESC');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/featured-builds', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { title, description, useCase, budgetRange, components, totalPrice, imageUrl, isPublished, sortOrder } = req.body;
    const slug = (title||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      `INSERT INTO featured_builds (title, slug, description, use_case, budget_range, components, total_price, image_url, is_published, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title, slug, description, useCase, budgetRange, JSON.stringify(components||[]), totalPrice, imageUrl, isPublished||false, sortOrder||0]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// CRM / CUSTOMER MANAGEMENT
// =============================================

app.get('/api/customers', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { page=1, limit=20, search, loyaltyTier, vipStatus } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE u.role=\'customer\'';
    const params = [];
    if (search) { params.push(`%${search}%`); where += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`; }
    if (loyaltyTier) { params.push(loyaltyTier); where += ` AND cs.loyalty_tier=$${params.length}`; }
    if (vipStatus !== undefined) { params.push(vipStatus === 'true'); where += ` AND cs.vip_status=$${params.length}`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users u LEFT JOIN customer_stats cs ON u.id=cs.customer_id ${where}`, params),
      pool.query(`SELECT u.*, cs.* FROM users u LEFT JOIN customer_stats cs ON u.id=cs.customer_id ${where} ORDER BY u.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ customers: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/customers/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const [userR, statsR, notesR] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id=$1 AND role=\'customer\'', [id]),
      pool.query('SELECT * FROM customer_stats WHERE customer_id=$1', [id]),
      pool.query('SELECT cn.*, u.first_name||\' \'||u.last_name as created_by_name FROM crm_notes cn LEFT JOIN users u ON cn.created_by=u.id WHERE cn.customer_id=$1 ORDER BY cn.created_at DESC', [id]),
    ]);
    if (userR.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ ...userR.rows[0], stats: statsR.rows[0] || null, notes: notesR.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/customers/:id/notes', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { noteType, note, isPrivate } = req.body;
    const r = await pool.query(
      'INSERT INTO crm_notes (customer_id, created_by, note_type, note, is_private) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, req.user.id, noteType||'general', note, isPrivate||false]
    );
    logAudit(req.user.id, 'create_crm_note', 'crm_note', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/customers/:id/stats', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u);
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ') + ', updated_at=NOW()';
    const values = [...Object.values(u), id];
    const r = await pool.query(`UPDATE customer_stats SET ${setClause} WHERE customer_id=$${values.length} RETURNING *`, values);
    logAudit(req.user.id, 'update_customer_stats', 'customer_stats', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// STAFF
// =============================================

app.get('/api/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT u.*, sp.department, sp.employee_id, sp.hire_date, sp.specialization, sp.is_active as staff_active
       FROM users u LEFT JOIN staff_profiles sp ON u.id=sp.user_id WHERE u.role='staff' ORDER BY u.created_at DESC`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, department, employeeId, specialization, phone } = req.body;
    const password_hash = await bcrypt.hash(password || 'admin123', 12);
    const r = await pool.query(
      'INSERT INTO users (email, phone, password_hash, first_name, last_name, role, status) VALUES ($1,$2,$3,$4,$5,\'staff\',\'active\') RETURNING *',
      [email, phone, password_hash, firstName, lastName]
    );
    await pool.query(
      'INSERT INTO staff_profiles (user_id, department, employee_id, specialization) VALUES ($1,$2,$3,$4)',
      [r.rows[0].id, department, employeeId, specialization]
    );
    logAudit(req.user.id, 'create_staff', 'staff', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// NOTIFICATIONS
// =============================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/notifications', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { userId, title, message, type, link } = req.body;
    const r = await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [userId || null, title, message, type||'info', link]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 RETURNING *', [id]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// SYSTEM SETTINGS
// =============================================

app.get('/api/settings', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM system_settings ORDER BY category, key');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/settings/:key', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM system_settings WHERE key=$1', [req.params.key]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/settings/:key', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { value, description, category } = req.body;
    const r = await pool.query(
      'UPDATE system_settings SET value=COALESCE($1,value), description=COALESCE($2,description), category=COALESCE($3,category), updated_at=NOW() WHERE key=$4 RETURNING *',
      [value, description, category, req.params.key]
    );
    logAudit(req.user.id, 'update_setting', 'setting', req.params.key, { value });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// AUDIT LOGS
// =============================================

app.get('/api/audit-logs', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { page=1, limit=50, action, entityType, userId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (action) { params.push(action); where += ` AND action=$${params.length}`; }
    if (entityType) { params.push(entityType); where += ` AND entity_type=$${params.length}`; }
    if (userId) { params.push(userId); where += ` AND user_id=$${params.length}`; }
    if (startDate) { params.push(startDate); where += ` AND created_at>=$${params.length}`; }
    if (endDate) { params.push(endDate); where += ` AND created_at<=$${params.length}`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM audit_logs ${where}`, params),
      pool.query(`SELECT al.*, u.first_name||' '||u.last_name as user_name FROM audit_logs al LEFT JOIN users u ON al.user_id=u.id ${where} ORDER BY al.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ logs: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// BACKUP RECORDS
// =============================================

app.get('/api/backups', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM backup_records ORDER BY created_at DESC LIMIT 50');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/backups', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { backupName, backupType, fileSize, fileUrl } = req.body;
    const r = await pool.query(
      'INSERT INTO backup_records (backup_name, backup_type, file_size, file_url, status) VALUES ($1,$2,$3,$4,\'completed\') RETURNING *',
      [backupName, backupType||'full', fileSize, fileUrl]
    );
    logAudit(req.user.id, 'create_backup', 'backup', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// REPORTS
// =============================================

app.get('/api/reports/sales', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { period='monthly' } = req.query;
    const interval = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
    const r = await pool.query(
      `SELECT DATE_TRUNC('${interval}', created_at) as period, COUNT(*) as orders, SUM(total_amount) as revenue, AVG(total_amount) as avg_order
       FROM orders WHERE status!='cancelled' GROUP BY period ORDER BY period DESC LIMIT 24`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/reports/inventory', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.name as category, b.name as brand, COUNT(*) as total_products,
              SUM(CASE WHEN stock_quantity=0 THEN 1 ELSE 0 END) as out_of_stock,
              SUM(CASE WHEN stock_quantity <= low_stock_threshold AND stock_quantity > 0 THEN 1 ELSE 0 END) as low_stock,
              SUM(stock_quantity * COALESCE(cost_price,0)) as inventory_value
       FROM products p LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN brands b ON p.brand_id=b.id
       GROUP BY c.name, b.name ORDER BY total_products DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/reports/services', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT 'repairs' as service, status, COUNT(*) as count FROM repairs GROUP BY status
       UNION ALL SELECT 'pc_builds' as service, status, COUNT(*) as count FROM pc_builds GROUP BY status
       UNION ALL SELECT 'assemblies' as service, status, COUNT(*) as count FROM assemblies GROUP BY status
       UNION ALL SELECT 'upgrades' as service, status, COUNT(*) as count FROM upgrades GROUP BY status
       UNION ALL SELECT 'software_services' as service, status, COUNT(*) as count FROM software_services GROUP BY status
       UNION ALL SELECT 'rentals' as service, status, COUNT(*) as count FROM rentals GROUP BY status
       ORDER BY service, status`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/reports/customers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT loyalty_tier, COUNT(*) as count, SUM(total_spent) as total_revenue, AVG(total_spent) as avg_spend,
              SUM(CASE WHEN vip_status THEN 1 ELSE 0 END) as vip_count
       FROM customer_stats cs JOIN users u ON cs.customer_id=u.id
       GROUP BY loyalty_tier ORDER BY loyalty_tier`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// REPORT SCHEDULES
// =============================================

app.get('/api/report-schedules', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM report_schedules ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/report-schedules', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, reportType, frequency, recipients } = req.body;
    const r = await pool.query(
      'INSERT INTO report_schedules (name, report_type, frequency, recipients) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, reportType, frequency, recipients||[]]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// HOMEPAGE CMS (admin + public)
// =============================================
// Centralized content store for the homepage sections:
//   featured-build  •  offer  •  gaming-news  •  testimonial  •  faq
// Backed by the existing `gaming_hub` table. These routes exist so the
// admin dashboard and the customer homepage read/write through the same
// API surface and so content survives across browsers/devices.

const CMS_CONTENT_TYPES = new Set([
  'featured-build', 'offer', 'gaming-news', 'testimonial', 'faq',
]);

const CMS_PUBLISHED_STATUS = 'published';

// Whitelist of writable columns on gaming_hub. Anything outside this list
// is silently dropped so the admin UI can never mass-assign columns.
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

// Map frontend camelCase payload keys → DB snake_case columns.
const CMS_COLUMN_MAP = {
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

// Translate the camelCase payload from the admin UI into the snake_case
// row that the gaming_hub table expects. Unknown keys are dropped.
function cmsNormalizeRow(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    const col = CMS_COLUMN_MAP[k];
    if (!col) continue;
    if (!CMS_WRITABLE_COLUMNS.has(col)) continue;
    if (v === undefined) continue;
    out[col] = v;
  }
  return out;
}

function cmsSlugify(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240);
}

async function cmsResolveSlug(row, existingId) {
  const base = row.slug && String(row.slug).trim() ? cmsSlugify(row.slug) : cmsSlugify(row.title);
  let candidate = base || `item-${Date.now()}`;
  // Loop until we find a free slug (skipping this row's own id on update)
  // Bound the loop so a flood can't pin the request thread.
  for (let i = 0; i < 50; i += 1) {
    const params = [candidate];
    let sql = 'SELECT 1 FROM gaming_hub WHERE slug = $1';
    if (existingId) {
      sql += ' AND id <> $2';
      params.push(existingId);
    }
    const r = await pool.query(sql, params);
    if (r.rowCount === 0) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  // Fall back to a uuid-suffixed slug if all attempts collide.
  return `${base || 'item'}-${uuidv4().slice(0, 8)}`;
}

// Replace stored object keys (or full URLs) with the public CDN URL for
// any caller that should never see raw S3 paths. The DB stores the object
// key; we rewrite here so consumers always receive a publicly reachable
// image URL.
function cmsCdnBase() {
  return (process.env.IMAGE_CLOUDFRONT_BASE_URL || '').replace(/\/+$/, '');
}

function cmsToCdnUrl(value) {
  if (!value) return value;
  const base = cmsCdnBase();
  if (!base) return value; // no CDN configured → return whatever was stored
  // Already absolute (http/https) — leave alone.
  if (/^https?:\/\//i.test(value)) return value;
  // Strip leading slash, treat as an object key.
  return `${base}/${String(value).replace(/^\/+/, '')}`;
}

function cmsProjectRow(row) {
  if (!row) return row;
  const base = cmsCdnBase();
  const rewrite = (val) => (base ? cmsToCdnUrl(val) : val);
  const gallery = Array.isArray(row.gallery_images) ? row.gallery_images.map(rewrite) : [];
  // Cover/thumbnail/banner may be either keys or full URLs.
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
    coverImage: rewrite(row.cover_image),
    coverImageKey: row.cover_image,
    thumbnailImage: rewrite(row.thumbnail_image),
    thumbnailImageKey: row.thumbnail_image,
    bannerImage: rewrite(row.banner_image),
    bannerImageKey: row.banner_image,
    gallery: gallery,
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

function cmsLog(level, action, req, extra) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    action,
    requestId: req.headers['x-request-id'] || null,
    userId: req.user ? req.user.id : null,
    role: req.user ? req.user.role : null,
    ...extra,
  };
  // Log single-line JSON so production log shippers pick it up.
  // Never include the request body — payloads may contain sensitive text.
  console.log(JSON.stringify(entry));
}

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────
// All write endpoints below require a valid admin JWT.

function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin role required' });
  next();
}

// GET /api/admin/homepage-content — list every row (drafts included).
// Optional ?type=featured-build etc.
app.get('/api/admin/homepage-content', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { type, status } = req.query;
    const params = [];
    const where = [];
    if (type) {
      if (!CMS_CONTENT_TYPES.has(String(type))) {
        return res.status(400).json({ error: `Invalid type '${type}'. Allowed: ${Array.from(CMS_CONTENT_TYPES).join(', ')}` });
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
    const r = await pool.query(sql, params);
    cmsLog('info', 'admin.homepage.list', req, { count: r.rowCount, type: type || null });
    res.json(r.rows.map(cmsProjectRow));
  } catch (error) {
    cmsLog('error', 'admin.homepage.list', req, { message: String(error && error.message) });
    res.status(500).json({ error: 'Failed to list homepage content' });
  }
});

// GET /api/admin/homepage-content/:id — single record (any status).
app.get('/api/admin/homepage-content/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM gaming_hub WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    cmsLog('info', 'admin.homepage.get', req, { id: req.params.id });
    res.json(cmsProjectRow(r.rows[0]));
  } catch (error) {
    cmsLog('error', 'admin.homepage.get', req, { id: req.params.id, message: String(error && error.message) });
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// POST /api/admin/homepage-content — create a draft (or published) row.
app.post('/api/admin/homepage-content', authenticateToken, adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    const row = cmsNormalizeRow(req.body);
    if (!row.title) return res.status(400).json({ error: 'title is required' });
    if (!row.content_type || !CMS_CONTENT_TYPES.has(row.content_type)) {
      return res.status(400).json({ error: `content_type is required and must be one of: ${Array.from(CMS_CONTENT_TYPES).join(', ')}` });
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
    logAudit(req.user.id, 'homepage_create', 'gaming_hub', created.id, created);
    cmsLog('info', 'admin.homepage.create', req, { id: created.id, type: created.content_type, status: created.status });
    res.status(201).json(cmsProjectRow(created));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    cmsLog('error', 'admin.homepage.create', req, { message: String(error && error.message) });
    if (error && error.code === '23505') {
      return res.status(409).json({ error: 'Duplicate slug', code: 'duplicate_slug' });
    }
    res.status(500).json({ error: 'Failed to create record' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/homepage-content/:id — update an existing row.
app.put('/api/admin/homepage-content/:id', authenticateToken, adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = req.params.id;
    const existing = await client.query('SELECT * FROM gaming_hub WHERE id = $1', [id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    const row = cmsNormalizeRow(req.body);
    if (Object.keys(row).length === 0) {
      return res.status(400).json({ error: 'No writable fields provided' });
    }
    if (row.content_type && !CMS_CONTENT_TYPES.has(row.content_type)) {
      return res.status(400).json({ error: `Invalid content_type '${row.content_type}'` });
    }
    if (row.status && !['draft', 'published', 'scheduled', 'archived'].includes(row.status)) {
      return res.status(400).json({ error: `Invalid status '${row.status}'` });
    }
    // Auto-promote publish_date on status flip → published.
    if (row.status === 'published' && !row.publish_date) {
      row.publish_date = new Date();
    }
    // Re-resolve slug only if the caller changed the slug field.
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'slug') || row.title) {
      const next = await cmsResolveSlug(row, id);
      row.slug = next;
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
    logAudit(req.user.id, 'homepage_update', 'gaming_hub', updated.id, updated);
    cmsLog('info', 'admin.homepage.update', req, { id: updated.id, type: updated.content_type, status: updated.status });
    res.json(cmsProjectRow(updated));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    cmsLog('error', 'admin.homepage.update', req, { id: req.params.id, message: String(error && error.message) });
    if (error && error.code === '23505') {
      return res.status(409).json({ error: 'Duplicate slug', code: 'duplicate_slug' });
    }
    res.status(500).json({ error: 'Failed to update record' });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/homepage-content/:id/publish — flip to published.
app.patch('/api/admin/homepage-content/:id/publish', authenticateToken, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE gaming_hub SET status = 'published', publish_date = COALESCE(publish_date, NOW()), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req.user.id, 'homepage_publish', 'gaming_hub', r.rows[0].id, r.rows[0]);
    cmsLog('info', 'admin.homepage.publish', req, { id: r.rows[0].id, type: r.rows[0].content_type });
    res.json(cmsProjectRow(r.rows[0]));
  } catch (error) {
    cmsLog('error', 'admin.homepage.publish', req, { id: req.params.id, message: String(error && error.message) });
    res.status(500).json({ error: 'Failed to publish record' });
  }
});

// PATCH /api/admin/homepage-content/:id/unpublish — archive the row.
app.patch('/api/admin/homepage-content/:id/unpublish', authenticateToken, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE gaming_hub SET status = 'archived', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req.user.id, 'homepage_unpublish', 'gaming_hub', r.rows[0].id, r.rows[0]);
    cmsLog('info', 'admin.homepage.unpublish', req, { id: r.rows[0].id });
    res.json(cmsProjectRow(r.rows[0]));
  } catch (error) {
    cmsLog('error', 'admin.homepage.unpublish', req, { id: req.params.id, message: String(error && error.message) });
    res.status(500).json({ error: 'Failed to unpublish record' });
  }
});

// PATCH /api/admin/homepage-content/reorder — body: [{id, displayOrder}, ...]
app.patch('/api/admin/homepage-content/reorder', authenticateToken, adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    const items = Array.isArray(req.body && req.body.items) ? req.body.items : null;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Body must be { items: [{id, displayOrder}, ...] }' });
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
    logAudit(req.user.id, 'homepage_reorder', 'gaming_hub', null, { count: items.length });
    cmsLog('info', 'admin.homepage.reorder', req, { count: items.length });
    res.json({ success: true, updated: items.length });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    cmsLog('error', 'admin.homepage.reorder', req, { message: String(error && error.message) });
    res.status(500).json({ error: 'Failed to reorder' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/homepage-content/:id — hard delete (audit-logged).
app.delete('/api/admin/homepage-content/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM gaming_hub WHERE id = $1', [req.params.id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM gaming_hub WHERE id = $1', [req.params.id]);
    logAudit(req.user.id, 'homepage_delete', 'gaming_hub', req.params.id, existing.rows[0]);
    cmsLog('info', 'admin.homepage.delete', req, { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    cmsLog('error', 'admin.homepage.delete', req, { id: req.params.id, message: String(error && error.message) });
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────
// Anonymous, read-only, cache-bypassed. Returns ONLY status='published' rows.

function publicNoCache(req, res, next) {
  res.set('Cache-Control', 'no-store, max-age=0');
  res.set('Pragma', 'no-cache');
  next();
}

// GET /api/public/homepage-content       — all published rows
// GET /api/public/homepage-content?type= — one section
app.get('/api/public/homepage-content', publicNoCache, async (req, res) => {
  try {
    const { type } = req.query;
    const params = [CMS_PUBLISHED_STATUS];
    let where = 'WHERE status = $1';
    if (type) {
      if (!CMS_CONTENT_TYPES.has(String(type))) {
        return res.status(400).json({ error: `Invalid type '${type}'. Allowed: ${Array.from(CMS_CONTENT_TYPES).join(', ')}` });
      }
      params.push(type);
      where += ` AND content_type = $${params.length}`;
    }
    const sql = `SELECT * FROM gaming_hub ${where}
      ORDER BY content_type, display_order ASC, COALESCE(publish_date, created_at) DESC`;
    const r = await pool.query(sql, params);
    res.json(r.rows.map(cmsProjectRow));
  } catch (error) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', action: 'public.homepage.list', message: String(error && error.message) }));
    res.status(500).json({ error: 'Failed to load homepage content' });
  }
});

// GET /api/public/homepage-content/:slug — single published record by slug.
app.get('/api/public/homepage-content/:slug', publicNoCache, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM gaming_hub WHERE slug = $1 AND status = $2 LIMIT 1',
      [req.params.slug, CMS_PUBLISHED_STATUS]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(cmsProjectRow(r.rows[0]));
  } catch (error) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', action: 'public.homepage.slug', slug: req.params.slug, message: String(error && error.message) }));
    res.status(500).json({ error: 'Failed to load record' });
  }
});

// =============================================
// HOMEPAGE CMS — S3 image upload (admin only)
// =============================================
// Two-step secure upload flow:
//   1. POST /api/admin/homepage-content/:id/images/upload-url
//      → returns a presigned S3 PUT URL + the object key to use
//   2. Browser does `PUT <uploadUrl>` with the file bytes.
//   3. POST /api/admin/homepage-content/:id/images/complete
//      → records the object key in MySQL and rewrites the row's
//        cover_image / thumbnail_image / banner_image / gallery_images.
//
// Credentials are picked up from the EC2 instance role automatically
// when the AWS SDK is installed. If the SDK is missing, the routes
// return a 503 with a clear message instead of crashing the server.

const CMS_ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CMS_IMAGE_EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const CMS_MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Lazy SDK loader so the rest of the API still works if @aws-sdk/* is
// not installed (e.g. older EC2 image that predates Phase 6).
let _s3 = null;
let _s3LoadError = null;
let _getSignedUrl = null;
function loadS3() {
  if (_s3 || _s3LoadError) return _s3;
  try {
    // Use require() so the module can be installed/uninstalled without
    // changing the file structure.
    // eslint-disable-next-line global-require
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    // eslint-disable-next-line global-require
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
    _s3 = { S3Client, PutObjectCommand };
    _getSignedUrl = getSignedUrl;
    // Eagerly construct the client so any credential errors surface here.
    _s3.client = new S3Client({ region });
  } catch (e) {
    _s3LoadError = e;
  }
  return _s3;
}

function cmsImageBucket() {
  return (
    process.env.PRODUCT_IMAGE_BUCKET ||
    process.env.S3_BUCKET_NAME ||
    process.env.HOMEPAGE_IMAGE_BUCKET ||
    ''
  );
}

function cmsImageCdnBase() {
  return (
    process.env.PRODUCT_IMAGE_CDN_URL ||
    process.env.IMAGE_CLOUDFRONT_BASE_URL ||
    cmsCdnBase() ||
    ''
  ).replace(/\/+$/, '');
}

function cmsSanitizeFilename(name) {
  return String(name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/(^-+|-+$)/g, '')
    .toLowerCase() || 'image';
}

// Slot → DB column mapping. `cover` is the default slot.
const CMS_IMAGE_SLOT_TO_COLUMN = {
  cover: 'cover_image',
  thumbnail: 'thumbnail_image',
  banner: 'banner_image',
};

function cmsImageColumnForSlot(slot) {
  return CMS_IMAGE_SLOT_TO_COLUMN[String(slot || 'cover')] || 'cover_image';
}

// POST /api/admin/homepage-content/:id/images/upload-url
// body: { fileName, contentType, slot?: 'cover'|'thumbnail'|'banner' }
app.post('/api/admin/homepage-content/:id/images/upload-url', authenticateToken, adminOnly, async (req, res) => {
  const bucket = cmsImageBucket();
  if (!bucket) {
    return res.status(503).json({
      error: 'Image upload is not configured. Set PRODUCT_IMAGE_BUCKET (or S3_BUCKET_NAME) on the backend.',
      code: 'image_bucket_not_configured',
    });
  }
  const sdk = loadS3();
  if (!sdk) {
    return res.status(503).json({
      error: 'AWS SDK not installed on backend. Run `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`.',
      code: 'aws_sdk_missing',
      detail: _s3LoadError ? String(_s3LoadError.message) : undefined,
    });
  }
  try {
    const id = req.params.id;
    const existing = await pool.query('SELECT id, content_type FROM gaming_hub WHERE id = $1', [id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Content not found' });
    const { fileName, contentType, slot } = req.body || {};
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'fileName is required' });
    }
    if (!CMS_ALLOWED_IMAGE_TYPES.has(contentType)) {
      return res.status(400).json({ error: `Unsupported contentType '${contentType}'. Allowed: ${Array.from(CMS_ALLOWED_IMAGE_TYPES).join(', ')}` });
    }
    const col = cmsImageColumnForSlot(slot);
    if (!['cover_image', 'thumbnail_image', 'banner_image'].includes(col)) {
      return res.status(400).json({ error: `Invalid slot '${slot}'. Allowed: cover, thumbnail, banner` });
    }
    const ext = CMS_IMAGE_EXT_BY_TYPE[contentType];
    const safe = cmsSanitizeFilename(fileName);
    const contentTypeSlug = String(existing.rows[0].content_type || 'misc').replace(/[^a-z0-9-]/gi, '-');
    const objectKey = `homepage-content/${contentTypeSlug}/${id}/${Date.now()}-${uuidv4().slice(0, 8)}-${safe}.${ext}`;
    const command = new sdk.PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType,
      // Long cache, immutable key — uniquely versioned per upload.
      CacheControl: 'public, max-age=31536000, immutable',
    });
    const expiresIn = 900; // 15 min
    const uploadUrl = await _getSignedUrl(sdk.client, command, { expiresIn });
    const cdnBase = cmsImageCdnBase();
    const publicUrl = cdnBase ? `${cdnBase}/${objectKey}` : `https://${bucket}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${objectKey}`;
    cmsLog('info', 'admin.homepage.image.uploadUrl', req, { id, slot: col });
    res.json({
      uploadUrl,
      objectKey,
      publicUrl,
      cdnUrl: publicUrl,
      bucket,
      slot: col,
      contentType,
      expiresIn,
      maxBytes: CMS_MAX_IMAGE_BYTES,
    });
  } catch (error) {
    cmsLog('error', 'admin.homepage.image.uploadUrl', req, { id: req.params.id, message: String(error && error.message) });
    res.status(500).json({ error: 'Failed to create image upload URL' });
  }
});

// POST /api/admin/homepage-content/:id/images/complete
// body: { objectKey, slot?: 'cover'|'thumbnail'|'banner'|'gallery', altText?, galleryIndex? }
app.post('/api/admin/homepage-content/:id/images/complete', authenticateToken, adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = req.params.id;
    const { objectKey, slot, galleryIndex } = req.body || {};
    if (!objectKey || typeof objectKey !== 'string') {
      return res.status(400).json({ error: 'objectKey is required' });
    }
    const col = slot === 'gallery' ? null : cmsImageColumnForSlot(slot);
    if (slot && slot !== 'gallery' && !col) {
      return res.status(400).json({ error: 'Invalid slot' });
    }
    const existing = await client.query('SELECT * FROM gaming_hub WHERE id = $1', [id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Content not found' });
    const row = existing.rows[0];
    // Enforce key ownership — uploaded key must start with the content's
    // expected prefix, preventing arbitrary object references.
    const expectedPrefix = `homepage-content/${String(row.content_type).replace(/[^a-z0-9-]/gi, '-')}/${id}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      return res.status(400).json({
        error: 'objectKey does not belong to this content record',
        expectedPrefix,
      });
    }
    await client.query('BEGIN');
    let updated;
    if (slot === 'gallery') {
      const current = Array.isArray(row.gallery_images) ? row.gallery_images.slice() : [];
      const idx = Number.isInteger(galleryIndex) ? galleryIndex : current.length;
      if (idx < 0) {
        return res.status(400).json({ error: 'galleryIndex must be >= 0' });
      }
      if (idx >= current.length) current.push(objectKey);
      else current[idx] = objectKey;
      // Cap at 5 gallery images to match the admin UI.
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
    logAudit(req.user.id, 'homepage_image_attach', 'gaming_hub', id, { slot: slot || col, objectKey });
    cmsLog('info', 'admin.homepage.image.complete', req, { id, slot: slot || col });
    res.json(cmsProjectRow(updated));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    cmsLog('error', 'admin.homepage.image.complete', req, { id: req.params.id, message: String(error && error.message) });
    res.status(500).json({ error: 'Failed to attach image' });
  } finally {
    client.release();
  }
});

// POST /api/admin/homepage-content/:id/images/gallery-delete
// body: { galleryIndex: number }
app.post('/api/admin/homepage-content/:id/images/gallery-delete', authenticateToken, adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = req.params.id;
    const { galleryIndex } = req.body || {};
    const idx = Number(galleryIndex);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: 'galleryIndex must be a non-negative integer' });
    }
    await client.query('BEGIN');
    const existing = await client.query('SELECT gallery_images FROM gaming_hub WHERE id = $1', [id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Content not found' });
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
    logAudit(req.user.id, 'homepage_image_gallery_delete', 'gaming_hub', id, { galleryIndex: idx });
    res.json(cmsProjectRow(r.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    cmsLog('error', 'admin.homepage.image.galleryDelete', req, { id: req.params.id, message: String(error && error.message) });
    res.status(500).json({ error: 'Failed to remove gallery image' });
  } finally {
    client.release();
  }
});

// =============================================
// ERROR HANDLER
// =============================================

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ DESKTO Backend API running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Database: ${process.env.DB_NAME || 'deskto_db'}`);
});

module.exports = app;
