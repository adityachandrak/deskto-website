const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'deskto-secret-2024-change-in-production';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
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
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Access denied. Required role: ' + roles.join(' or ') });
    next();
  };
}

function logAudit(userId, action, entityType, entityId, newValues) {
  pool.query(
    'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1,$2,$3,$4,$5)',
    [userId, action, entityType, entityId, JSON.stringify(newValues)]
  ).catch(() => {});
}

// Helper to generate unique numbers
function generateNumber(type) {
  const prefix = type === 'repair' ? 'REP' : type === 'build' ? 'BLD' : type === 'assembly' ? 'ASM' : type === 'upgrade' ? 'UPG' : type === 'software' ? 'SOF' : type === 'rental' ? 'RNT' : type === 'support' ? 'TKT' : type === 'sell' ? 'SEL' : type === 'delivery' ? 'DEL' : 'ORD';
  return `${prefix}-${Date.now()}`;
}

// =============================================
// AUTH
// =============================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Email/phone and password required' });

    const result = await pool.query('SELECT * FROM users WHERE email=$1 OR phone=$1', [identifier]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    if (user.status === 'locked') return res.status(423).json({ error: 'Account locked. Contact admin.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      user: {
        id: user.id, email: user.email,
        firstName: user.first_name, lastName: user.last_name,
        role: user.role, status: user.status,
        isVerified: user.is_verified, avatarUrl: user.avatar_url,
        createdAt: user.created_at
      },
      accessToken: token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    if (!email || !password || !firstName) return res.status(400).json({ error: 'Email, password and first name required' });

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, phone, password_hash, first_name, last_name, role) VALUES ($1,$2,$3,$4,$5,\'customer\') RETURNING *',
      [email, phone, hash, firstName, lastName]
    );

    await pool.query('INSERT INTO customer_stats (customer_id) VALUES ($1)', [result.rows[0].id]);

    const u = result.rows[0];
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      user: { id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, status: u.status },
      accessToken: token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.role, u.status, u.is_verified, u.avatar_url, u.created_at,
              sp.department, sp.employee_id
       FROM users u LEFT JOIN staff_profiles sp ON u.id = sp.user_id WHERE u.id=$1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// =============================================
// DASHBOARD / OVERVIEW
// =============================================

app.get('/api/dashboard/stats', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const results = await Promise.all([
      pool.query("SELECT COALESCE(SUM(total_amount),0) as v FROM orders WHERE status!='cancelled'"),
      pool.query('SELECT COUNT(*) as v FROM orders'),
      pool.query("SELECT COUNT(*) as v FROM repairs WHERE status NOT IN ('completed','delivered','cancelled')"),
      pool.query("SELECT COUNT(*) as v FROM pc_builds WHERE status NOT IN ('completed','delivered','cancelled')"),
      pool.query("SELECT COUNT(*) as v FROM users WHERE role='customer'"),
      pool.query("SELECT COUNT(*) as v FROM products WHERE stock_quantity<=low_stock_threshold"),
      pool.query("SELECT COUNT(*) as v FROM orders WHERE DATE(created_at)=CURRENT_DATE"),
      pool.query("SELECT COUNT(*) as v FROM support_tickets WHERE status NOT IN ('resolved','closed')"),
    ]);

    res.json({
      totalRevenue: +results[0].rows[0].v, totalOrders: +results[1].rows[0].v,
      activeRepairs: +results[2].rows[0].v, activeBuilds: +results[3].rows[0].v,
      totalCustomers: +results[4].rows[0].v, lowStock: +results[5].rows[0].v,
      todayOrders: +results[6].rows[0].v, activeTickets: +results[7].rows[0].v
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/dashboard/charts/orders-by-status', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders by status' });
  }
});

app.get('/api/dashboard/charts/revenue-trend', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT DATE_TRUNC('month', created_at) as month, SUM(total_amount) as revenue FROM orders WHERE status!='cancelled' GROUP BY month ORDER BY month DESC LIMIT 12"
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch revenue trend' });
  }
});

// =============================================
// CATEGORIES
// =============================================

app.get('/api/categories', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id=c.id AND is_active=TRUE) as product_count
       FROM categories c WHERE c.is_active=TRUE ORDER BY c.sort_order, c.name`
    );
    res.json(r.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description, icon, iconColor, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      'INSERT INTO categories (name, slug, description, icon, icon_color, parent_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, slug, description, icon, iconColor, parentId]
    );
    logAudit(req.user.id, 'create_category', 'category', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Category with this slug already exists' });
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, iconColor, parentId, sortOrder } = req.body;
    const r = await pool.query(
      'UPDATE categories SET name=COALESCE($1,name), description=COALESCE($2,description), icon=COALESCE($3,icon), icon_color=COALESCE($4,icon_color), parent_id=COALESCE($5,parent_id), sort_order=COALESCE($6,sort_order), updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, description, icon, iconColor, parentId, sortOrder, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    logAudit(req.user.id, 'update_category', 'category', id, r.rows[0]);
    res.json(r.rows[0]);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT COUNT(*) as c FROM products WHERE category_id=$1 AND is_active=TRUE', [id]);
    if (+check.rows[0].c > 0) {
      await pool.query('UPDATE categories SET is_active=FALSE WHERE id=$1', [id]);
    } else {
      await pool.query('DELETE FROM categories WHERE id=$1', [id]);
    }
    logAudit(req.user.id, 'delete_category', 'category', id, {});
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// =============================================
// BRANDS
// =============================================

app.get('/api/brands', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT b.*, (SELECT COUNT(*) FROM products WHERE brand_id=b.id AND is_active=TRUE) as product_count
       FROM brands b WHERE b.is_active=TRUE ORDER BY b.name`
    );
    res.json(r.rows);
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

app.post('/api/brands', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description, logoUrl, website } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      'INSERT INTO brands (name, slug, description, logo_url, website) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, slug, description, logoUrl, website]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Brand with this slug already exists' });
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

app.put('/api/brands/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logoUrl, website } = req.body;
    const r = await pool.query(
      'UPDATE brands SET name=COALESCE($1,name), description=COALESCE($2,description), logo_url=COALESCE($3,logo_url), website=COALESCE($4,website), updated_at=NOW() WHERE id=$5 RETURNING *',
      [name, description, logoUrl, website, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Brand not found' });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// =============================================
// PRODUCTS
// =============================================

app.get('/api/products', async (req, res) => {
  try {
    const { page=1, limit=20, category, brand, search, stockStatus } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE p.is_active=TRUE';
    const params = [];

    if (category) { params.push(category); where += ` AND p.category_id=$${params.length}`; }
    if (brand) { params.push(brand); where += ` AND p.brand_id=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`; }
    if (stockStatus === 'low') where += ' AND p.stock_quantity <= p.low_stock_threshold';
    if (stockStatus === 'out') where += ' AND p.stock_quantity = 0';

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
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { sku, name, description, price, categoryId, brandId, stockQuantity, imageUrl } = req.body;
    if (!sku || !name || !price) return res.status(400).json({ error: 'SKU, name and price required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const [catR, brandR] = await Promise.all([
      pool.query('SELECT name FROM categories WHERE id=$1', [categoryId]),
      pool.query('SELECT name FROM brands WHERE id=$1', [brandId]),
    ]);
    const r = await pool.query(
      `INSERT INTO products (sku,name,slug,description,price,category_id,category_name,brand_id,brand_name,stock_quantity,image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [sku, name, slug, description, price, categoryId, catR.rows[0]?.name, brandId, brandR.rows[0]?.name, stockQuantity||0, imageUrl]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Product with this SKU already exists' });
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u);
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    if (!setClause) return res.status(400).json({ error: 'No data provided' });
    const values = [...Object.values(u), id];
    const r = await pool.query(`UPDATE products SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
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
         LEFT JOIN users u ON o.assigned_staff_id=u.id ${where} ORDER BY o.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, +limit, +offset]
      )
    ]);
    res.json({ orders: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, items, shippingAddress, billingAddress } = req.body;
    if (!customerName || !items || !items.length) return res.status(400).json({ error: 'Customer name and items required' });
    const num = generateNumber('order');
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + taxAmount;

    const r = await pool.query(
      `INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, subtotal, tax_amount, total_amount, items, shipping_address, billing_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [num, req.user.id, customerName, customerEmail, customerPhone, subtotal, taxAmount, totalAmount, JSON.stringify(items), JSON.stringify(shippingAddress), JSON.stringify(billingAddress)]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.patch('/api/orders/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedStaffId, assignedStaffName, notes } = req.body;
    const updates = []; const params = [];
    if (status) { params.push(status); updates.push(`status=$${params.length}`); }
    if (assignedStaffId) { params.push(assignedStaffId); updates.push(`assigned_staff_id=$${params.length}`); }
    if (assignedStaffName) { params.push(assignedStaffName); updates.push(`assigned_staff_name=$${params.length}`); }
    if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
    if (!updates.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE orders SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    logAudit(req.user.id, 'update_order', 'order', id, { status, assignedStaffId });
    res.json(r.rows[0]);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// =============================================
// REPAIRS
// =============================================

app.get('/api/repairs', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1'; const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (repair_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM repairs ${where}`, params),
      pool.query(`SELECT r.*, u.first_name||' '||u.last_name as technician_name FROM repairs r LEFT JOIN users u ON r.technician_id=u.id ${where} ORDER BY r.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ repairs: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    console.error('Get repairs error:', error);
    res.status(500).json({ error: 'Failed to fetch repairs' });
  }
});

app.post('/api/repairs', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, deviceType, deviceBrand, deviceModel, deviceIssue } = req.body;
    if (!customerName || !customerPhone) return res.status(400).json({ error: 'Customer name and phone required' });
    const num = generateNumber('repair');
    const r = await pool.query(
      'INSERT INTO repairs (repair_number, user_id, customer_name, customer_email, customer_phone, device_type, device_brand, device_model, device_issue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [num, req.user.id, customerName, customerEmail, customerPhone, deviceType, deviceBrand, deviceModel, deviceIssue]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    console.error('Create repair error:', error);
    res.status(500).json({ error: 'Failed to create repair' });
  }
});

app.patch('/api/repairs/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, estimatedCost, finalCost, technicianId, quotationItems, quotationNotes, notes } = req.body;
    const updates = []; const params = [];
    if (status) { params.push(status); updates.push(`status=$${params.length}`); }
    if (estimatedCost !== undefined) { params.push(estimatedCost); updates.push(`estimated_cost=$${params.length}`); }
    if (finalCost !== undefined) { params.push(finalCost); updates.push(`final_cost=$${params.length}`); }
    if (technicianId) { params.push(technicianId); updates.push(`technician_id=$${params.length}`); }
    if (quotationItems !== undefined) { params.push(JSON.stringify(quotationItems)); updates.push(`quotation_items=$${params.length}`); }
    if (quotationNotes !== undefined) { params.push(quotationNotes); updates.push(`quotation_notes=$${params.length}`); }
    if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
    if (!updates.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE repairs SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Repair not found' });
    logAudit(req.user.id, 'update_repair', 'repair', id, { status, estimatedCost, finalCost });
    res.json(r.rows[0]);
  } catch (error) {
    console.error('Update repair error:', error);
    res.status(500).json({ error: 'Failed to update repair' });
  }
});

// =============================================
// PC BUILDS
// =============================================

app.get('/api/pc-builds', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1'; const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (title ILIKE $${params.length} OR build_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM pc_builds ${where}`, params),
      pool.query(`SELECT * FROM pc_builds ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ builds: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    console.error('Get PC builds error:', error);
    res.status(500).json({ error: 'Failed to fetch PC builds' });
  }
});

app.post('/api/pc-builds', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, title, description, useCase, budgetRange, components } = req.body;
    if (!customerName || !title) return res.status(400).json({ error: 'Customer name and title required' });
    const num = generateNumber('build');
    const r = await pool.query(
      'INSERT INTO pc_builds (build_number, user_id, customer_name, customer_email, customer_phone, title, description, use_case, budget_range, components) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [num, req.user.id, customerName, customerEmail, customerPhone, title, description, useCase, budgetRange, JSON.stringify(components || [])]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    console.error('Create PC build error:', error);
    res.status(500).json({ error: 'Failed to create PC build' });
  }
});

app.patch('/api/pc-builds/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const updates = []; const params = [];
    const fieldMap = {
      status: 'status', title: 'title', description: 'description',
      useCase: 'use_case', budgetRange: 'budget_range',
      technicianId: 'technician_id', technicianName: 'technician_name',
      assignedStaffId: 'assigned_staff_id', assignedStaffName: 'assigned_staff_name',
      currentStage: 'current_stage', progressPercent: 'progress_percent',
      progressSteps: 'progress_steps', compatibilityChecks: 'compatibility_checks',
      quotationItems: 'quotation_items', subtotal: 'subtotal',
      gstAmount: 'gst_amount', shippingAmount: 'shipping_amount',
      totalAmount: 'total_amount', quotationNotes: 'quotation_notes',
      components: 'components', notes: 'notes'
    };
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (u[key] !== undefined) {
        const val = ['progressSteps', 'compatibilityChecks', 'quotationItems', 'components'].includes(key) ? JSON.stringify(u[key]) : u[key];
        params.push(val);
        updates.push(`${dbKey}=$${params.length}`);
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE pc_builds SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
    if (r.rows.length === 0) return res.status(404).json({ error: 'PC build not found' });
    logAudit(req.user.id, 'update_pc_build', 'pc_build', id, u);
    res.json(r.rows[0]);
  } catch (error) {
    console.error('Update PC build error:', error);
    res.status(500).json({ error: 'Failed to update PC build' });
  }
});

// =============================================
// ASSEMBLIES, UPGRADES, SOFTWARE, RENTALS, DELIVERIES, SUPPORT, SELL USED
// All follow same pattern — simplified endpoints
// =============================================

const SERVICE_TABLES = {
  assemblies: { numberField: 'assembly_number' },
  upgrades: { numberField: 'upgrade_number' },
  software_services: { numberField: 'service_number' },
  rentals: { numberField: 'rental_number' },
  deliveries: { numberField: 'delivery_number' },
  support_tickets: { numberField: 'ticket_number' },
  sell_used: { numberField: 'request_number' }
};

Object.entries(SERVICE_TABLES).forEach(([key, config]) => {
  app.get(`/api/${key}`, authenticateToken, async (req, res) => {
    try {
      const { page=1, limit=20, status } = req.query;
      const offset = (page - 1) * limit;
      let where = 'WHERE 1=1'; const params = [];
      if (status) { params.push(status); where += ` AND status=$${params.length}`; }
      const [countR, dataR] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM ${key} ${where}`, params),
        pool.query(`SELECT * FROM ${key} ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
      ]);
      const dataKey = key === 'support_tickets' ? 'tickets' : key === 'sell_used' ? 'requests' : key;
      res.json({ [dataKey]: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
    } catch (error) {
      console.error(`Get ${key} error:`, error);
      res.status(500).json({ error: `Failed to fetch ${key}` });
    }
  });

  app.post(`/api/${key}`, authenticateToken, async (req, res) => {
    try {
      const data = req.body;
      const num = generateNumber(key.replace(/_$/, ''));
      const columns = Object.keys(data).map(k => k.replace(/([A-Z])/g, '_$1').toLowerCase());
      const values = Object.values(data);
      await pool.query(`INSERT INTO ${key} (${config.numberField}, ${columns.join(', ')}, user_id) VALUES ($1, ${columns.map((_, i) => `$${i+2}`).join(', ')}, $${columns.length+2})`, [num, ...values, req.user?.id]);
      res.status(201).json({ message: 'Created successfully' });
    } catch (error) {
      console.error(`Create ${key} error:`, error);
      res.status(500).json({ error: `Failed to create ${key.replace(/_$/, '')}` });
    }
  });

  app.patch(`/api/${key.replace(/_$/, '-')}}/:id`, authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
      const { id } = req.params;
      const u = req.body;
      const updates = []; const params = [];
      Object.keys(u).forEach(k => {
        const dbK = k.replace(/([A-Z])/g, '_$1').toLowerCase();
        params.push(Array.isArray(u[k]) || typeof u[k] === 'object' ? JSON.stringify(u[k]) : u[k]);
        updates.push(`${dbK}=$${params.length}`);
      });
      if (!updates.length) return res.status(400).json({ error: 'No updates provided' });
      params.push(id);
      const r = await pool.query(`UPDATE ${key} SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
      if (r.rows.length === 0) return res.status(404).json({ error: `${key.replace(/_$/, '')} not found` });
      res.json(r.rows[0]);
    } catch (error) {
      console.error(`Update ${key} error:`, error);
      res.status(500).json({ error: `Failed to update ${key.replace(/_$/, '')}` });
    }
  });
});

// =============================================
// CRM
// =============================================

app.get('/api/crm/customers/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const [userR, statsR, notesR] = await Promise.all([
      pool.query('SELECT id, email, phone, first_name, last_name, status, is_verified, avatar_url, created_at FROM users WHERE id=$1 AND role=\'customer\'', [id]),
      pool.query('SELECT * FROM customer_stats WHERE customer_id=$1', [id]),
      pool.query('SELECT * FROM crm_notes WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 50', [id]),
    ]);
    if (userR.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer: userR.rows[0], stats: statsR.rows[0] || {}, notes: notesR.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

app.post('/api/crm/notes', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { customerId, noteType, note, isPrivate } = req.body;
    if (!customerId || !note) return res.status(400).json({ error: 'Customer ID and note required' });
    const r = await pool.query('INSERT INTO crm_notes (customer_id, created_by, note_type, note, is_private) VALUES ($1,$2,$3,$4,$5) RETURNING *', [customerId, req.user.id, noteType || 'general', note, isPrivate || false]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// =============================================
// CUSTOMERS
// =============================================

app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, search, verified } = req.query;
    const offset = (page - 1) * limit;
    let where = "WHERE role='customer'"; const params = [];
    if (search) { params.push(`%${search}%`); where += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length})`; }
    if (verified !== undefined) { params.push(verified==='true'); where += ` AND is_verified=$${params.length}`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users ${where}`, params),
      pool.query(`SELECT id,email,phone,first_name,last_name,status,is_verified,avatar_url,created_at FROM users ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ customers: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.patch('/api/customers/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isVerified } = req.body;
    const updates = []; const params = [];
    if (status) { params.push(status); updates.push(`status=$${params.length}`); }
    if (isVerified !== undefined) { params.push(isVerified); updates.push(`is_verified=$${params.length}`); }
    if (!updates.length) return res.status(400).json({ error: 'No updates provided' });
    params.push(id);
    const r = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id=$${params.length} AND role='customer' RETURNING id,email,first_name,last_name,status,is_verified`, params);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// =============================================
// STAFF
// =============================================

app.get('/api/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.role, u.status, u.is_verified, u.avatar_url, u.created_at,
              sp.department, sp.employee_id, sp.hire_date, sp.is_active, sp.specialization
       FROM users u LEFT JOIN staff_profiles sp ON u.id=sp.user_id WHERE u.role IN ('staff','admin') ORDER BY u.created_at DESC`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

app.post('/api/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, department, employeeId } = req.body;
    if (!email || !password || !firstName) return res.status(400).json({ error: 'Email, password and first name required' });
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query('INSERT INTO users (email, phone, password_hash, first_name, last_name, role) VALUES ($1,$2,$3,$4,$5,\'staff\') RETURNING *', [email, phone, hash, firstName, lastName]);
    await pool.query('INSERT INTO staff_profiles (user_id, department, employee_id) VALUES ($1,$2,$3)', [r.rows[0].id, department || 'General', employeeId]);
    const finalR = await pool.query('SELECT u.*, sp.department, sp.employee_id FROM users u LEFT JOIN staff_profiles sp ON u.id=sp.user_id WHERE u.id=$1', [r.rows[0].id]);
    res.status(201).json(finalR.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

app.patch('/api/staff/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isVerified, department, isActive } = req.body;
    if (status) await pool.query('UPDATE users SET status=$1 WHERE id=$2', [status, id]);
    if (isVerified !== undefined) await pool.query('UPDATE users SET is_verified=$1 WHERE id=$2', [isVerified, id]);
    if (department) await pool.query('UPDATE staff_profiles SET department=$1 WHERE user_id=$2', [department, id]);
    if (isActive !== undefined) await pool.query('UPDATE staff_profiles SET is_active=$1 WHERE user_id=$2', [isActive, id]);
    const r = await pool.query('SELECT u.*, sp.department, sp.employee_id FROM users u LEFT JOIN staff_profiles sp ON u.id=sp.user_id WHERE u.id=$1', [id]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

// =============================================
// SUPPLIERS
// =============================================

app.get('/api/suppliers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM suppliers ORDER BY name');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

app.post('/api/suppliers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, email, phone, address, city, state, pincode, gstNumber, contactPerson } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const r = await pool.query('INSERT INTO suppliers (name, email, phone, address, city, state, pincode, gst_number, contact_person) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [name, email, phone, address, city, state, pincode, gstNumber, contactPerson]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

app.put('/api/suppliers/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u);
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    if (!setClause) return res.status(400).json({ error: 'No data provided' });
    const values = [...Object.values(u), id];
    const r = await pool.query(`UPDATE suppliers SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// =============================================
// COUPONS
// =============================================

app.get('/api/coupons', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

app.post('/api/coupons', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { code, name, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil } = req.body;
    if (!code || !discountValue) return res.status(400).json({ error: 'Code and discount value required' });
    const r = await pool.query('INSERT INTO coupons (code, name, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [code, name, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Coupon code already exists' });
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// =============================================
// GAMING HUB
// =============================================

app.get('/api/gaming-hub', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status, contentType } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1'; const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    if (contentType) { params.push(contentType); where += ` AND content_type=$${params.length}`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM gaming_hub ${where}`, params),
      pool.query(`SELECT * FROM gaming_hub ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ items: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    console.error('Get gaming hub error:', error);
    res.status(500).json({ error: 'Failed to fetch gaming hub content' });
  }
});

app.post('/api/gaming-hub', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { title, contentType, category, shortDescription, content, author, coverImage, thumbnailImage, bannerImage, galleryImages, intro, specs, benchmarkData, tips, pros, cons, tags, offerDetails, discount, ctaText, ctaLink, relatedServices, displayOrder, showOnGamingHub, showInCategory, isFeatured, isTrending, isLatestNews, isExclusiveOffer, isSignatureMachine, metaTitle, metaDescription, keywords } = req.body;
    if (!title || !contentType) return res.status(400).json({ error: 'Title and content type required' });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(`INSERT INTO gaming_hub (title, slug, content_type, category, short_description, content, author, cover_image, thumbnail_image, banner_image, gallery_images, intro, specs, benchmark_data, tips, pros, cons, tags, offer_details, discount, cta_text, cta_link, related_services, display_order, show_on_gaming_hub, show_in_category, is_featured, is_trending, is_latest_news, is_exclusive_offer, is_signature_machine, meta_title, meta_description, keywords) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31) RETURNING *`, [title, slug, contentType, category, shortDescription, content, author, coverImage, thumbnailImage, bannerImage, galleryImages || [], intro, specs, benchmarkData, tips || [], pros || [], cons || [], tags || [], offerDetails, discount, ctaText, ctaLink, relatedServices || [], displayOrder || 0, showOnGamingHub !== false, showInCategory !== false, isFeatured || false, isTrending || false, isLatestNews || false, isExclusiveOffer || false, isSignatureMachine || false, metaTitle, metaDescription, keywords]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Content with this slug already exists' });
    console.error('Create gaming hub error:', error);
    res.status(500).json({ error: 'Failed to create gaming hub content' });
  }
});

// =============================================
// NOTIFICATIONS
// =============================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/notifications', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { userId, title, message, type, link } = req.body;
    if (!userId || !title) return res.status(400).json({ error: 'User ID and title required' });
    const r = await pool.query('INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,$4,$5) RETURNING *', [userId, title, message, type || 'info', link]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.user.id]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// =============================================
// AUDIT LOGS
// =============================================

app.get('/api/audit-logs', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { page=1, limit=50, entityType, userId } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1'; const params = [];
    if (entityType) { params.push(entityType); where += ` AND entity_type=$${params.length}`; }
    if (userId) { params.push(userId); where += ` AND user_id=$${params.length}`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM audit_logs ${where}`, params),
      pool.query(`SELECT al.*, u.email FROM audit_logs al LEFT JOIN users u ON al.user_id=u.id ${where} ORDER BY al.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ logs: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// =============================================
// SETTINGS
// =============================================

app.get('/api/settings', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM system_settings ORDER BY category, key');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings/:key', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const r = await pool.query('UPDATE system_settings SET value=$1, updated_at=NOW() WHERE key=$2 RETURNING *', [value, key]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// =============================================
// HEALTH CHECK
// =============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'DESKTO Backend API', version: '1.0.0' });
});

// =============================================
// ERROR HANDLING
// =============================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// =============================================
// START SERVER
// =============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('  DESKTO Backend API');
  console.log(`  Running on port ${PORT}`);
  console.log('  Health: http://localhost:' + PORT + '/health');
  console.log('========================================\n');
});
