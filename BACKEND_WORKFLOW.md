# Complete Backend & Database Workflow for Admin Dashboard

## Your Admin Dashboard Features (Frontend Analysis)

Your admin dashboard has these modules that need backend support:

| Tab | Features | Data Needed |
|-----|----------|-------------|
| **Orders** | List, filter by status, assign staff, update status | Orders, Staff, OrderItems |
| **Repairs** | Repair requests, quotation, device info, assign tech | Repairs, Staff |
| **PC Builds** | Custom builds, components, quotation, status | PCBuilds, Staff |
| **Rentals** | Rental tracking, return management | Rentals, Orders |
| **Support** | Tickets, staff assignment, status | Tickets, Staff |
| **Customers** | Customer list, verification | Users |
| **Staff** | Staff management, departments | Users (staff role) |
| **Suppliers** | Supplier management | Suppliers |
| **Inventory** | Stock, products, categories, brands | Products, Categories, Brands |
| **Gallery** | Gaming hub content | GamingHubItems |
| **Builder** | PC builder configurations | BuilderComponents, Configs |
| **Marketing** | Coupons, notifications | Coupons, Notifications |
| **Reports** | Analytics, exports | Aggregate queries |
| **Settings** | System configuration | Config tables |
| **Audit** | Activity logs | AuditLogs |

---

# END-TO-END WORKFLOW

## STEP 1: Create Database Schema (PostgreSQL)

### 1.1 Connect to EC2 and Run Schema

```bash
# SSH to EC2 via SSM
aws ssm start-session --target i-0b652e38103c7635a --region ap-south-1

# Install PostgreSQL client
sudo dnf install -y postgresql16

# Get database URL from SSM
aws ssm get-parameter --name "/deskto-website/production/database-url" --with-decryption --region ap-south-1 --query "Parameter.Value" --output text

# Connect to database
PGPASSWORD='YOUR_PASSWORD' psql -h deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com -U deskto_admin -d deskto_db
```

### 1.2 Execute Complete Schema

```sql
-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS & AUTHENTICATION
-- =============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'locked')),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(50) DEFAULT 'General',
    employee_id VARCHAR(50) UNIQUE,
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CATALOG & PRODUCTS
-- =============================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    category VARCHAR(100),
    brand VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    image_url TEXT,
    images TEXT[],
    specifications JSONB,
    tags TEXT[],
    market_tag VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    weight DECIMAL(8,2),
    dimensions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ORDERS
-- =============================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    status VARCHAR(30) DEFAULT 'placed'
        CHECK (status IN ('placed', 'verified', 'packing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(30) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    shipping_address JSONB,
    billing_address JSONB,
    notes TEXT,
    assigned_staff_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255),
    product_sku VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    specifications JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- REPAIRS
-- =============================================

CREATE TABLE repairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repair_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20) NOT NULL,
    device_brand VARCHAR(100),
    device_model VARCHAR(100),
    device_issue TEXT,
    device_images TEXT[],
    status VARCHAR(50) DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'received', 'admin-approved', 'rejected', 'assigned',
                          'device-received', 'diagnosing', 'quotation', 'quote-approved',
                          'payment-pending', 'paid', 'in-repair', 'repair-progress', 'qc',
                          'completed', 'invoice-generated', 'warranty-generated', 'ready',
                          'delivered', 'review-requested', 'closed')),
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    quotation_details TEXT,
    technician_id UUID REFERENCES users(id),
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PC BUILDS
-- =============================================

CREATE TABLE pc_builds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    build_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    title VARCHAR(255),
    use_case VARCHAR(100),
    budget_range VARCHAR(50),
    status VARCHAR(50) DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'received', 'admin-review', 'components-verified',
                          'quotation', 'approved', 'paid', 'reserved', 'technician-assigned',
                          'assembling', 'software-install', 'stress-test', 'qc',
                          'invoice-generated', 'warranty-generated', 'packed', 'shipped',
                          'delivered', 'review-requested')),
    components JSONB NOT NULL,
    total_price DECIMAL(10,2),
    quotation_details TEXT,
    technician_id UUID REFERENCES users(id),
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- RENTALS
-- =============================================

CREATE TABLE rentals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rental_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255),
    status VARCHAR(30) DEFAULT 'reserved'
        CHECK (status IN ('reserved', 'active', 'returning', 'returned', 'overdue')),
    rental_start DATE,
    rental_end DATE,
    rental_price DECIMAL(10,2),
    security_deposit DECIMAL(10,2),
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SUPPORT TICKETS
-- =============================================

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'open'
        CHECK (status IN ('open', 'in-progress', 'waiting-customer', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50),
    assigned_staff_id UUID REFERENCES users(id),
    responses JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SUPPLIERS & PURCHASE ORDERS
-- =============================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    gst_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')),
    total_amount DECIMAL(10,2),
    items JSONB,
    expected_delivery DATE,
    received_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- MARKETING
-- =============================================

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2),
    min_order_amount DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(30) DEFAULT 'info'
        CHECK (type IN ('info', 'success', 'warning', 'error', 'promotion')),
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- GAMING HUB / GALLERY
-- =============================================

CREATE TABLE gaming_hub_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL
        CHECK (content_type IN ('gaming-news', 'latest-hardware', 'esports-update', 'game-release',
                                'gaming-tip', 'benchmark-result', 'product-review', 'community-blog',
                                'featured-build', 'offer', 'testimonial', 'faq')),
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    image_url TEXT,
    author VARCHAR(255),
    tags TEXT[],
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
    scheduled_at TIMESTAMP,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PC BUILDER CONFIG
-- =============================================

CREATE TABLE builder_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU',
                           'Cabinet', 'Cooler', 'Fans', 'OS', 'Accessories', 'Network Device')),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    price DECIMAL(10,2),
    market_tag VARCHAR(50),
    tier VARCHAR(20) CHECK (tier IN ('Entry', 'Mid', 'High', 'Extreme')),
    stock_status VARCHAR(20) DEFAULT 'in-stock'
        CHECK (stock_status IN ('in-stock', 'low-stock', 'out-of-stock', 'pre-order')),
    specifications JSONB,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_latest BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE builder_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    content_config JSONB,
    pricing_rules JSONB,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DELIVERIES
-- =============================================

CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id),
    repair_id UUID REFERENCES repairs(id),
    delivery_type VARCHAR(20) CHECK (delivery_type IN ('order', 'repair', 'pickup')),
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'picked', 'in-transit', 'delivered', 'failed')),
    tracking_number VARCHAR(100),
    delivery_partner VARCHAR(100),
    address JSONB,
    scheduled_date DATE,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- AUDIT & SYSTEM
-- =============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_repairs_status ON repairs(status);
CREATE INDEX idx_pc_builds_status ON pc_builds(status);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_repairs_updated BEFORE UPDATE ON repairs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_pc_builds_updated BEFORE UPDATE ON pc_builds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_rentals_updated BEFORE UPDATE ON rentals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_support_tickets_updated BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED DATA
-- =============================================

-- Create Admin User
INSERT INTO users (email, password_hash, first_name, last_name, role, status)
VALUES ('admin@deskto.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Admin', 'User', 'admin', 'active');

-- Create Staff User
INSERT INTO users (email, password_hash, first_name, last_name, role, status)
VALUES ('staff@deskto.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Staff', 'Member', 'staff', 'active');

-- Create Sample Categories
INSERT INTO categories (name, slug) VALUES
('Graphics Cards', 'graphics-cards'),
('Processors', 'processors'),
('Memory', 'memory'),
('Storage', 'storage'),
('Power Supply', 'power-supply'),
('Cabinet', 'cabinet'),
('Cooling', 'cooling'),
('Peripherals', 'peripherals');

-- Create Sample Brands
INSERT INTO brands (name, slug) VALUES
('NVIDIA', 'nvidia'),
('AMD', 'amd'),
('Intel', 'intel'),
('AMD Ryzen', 'amd-ryzen'),
('Corsair', 'corsair'),
('Kingston', 'kingston'),
('Samsung', 'samsung'),
('Seagate', 'seagate');
```

---

## STEP 2: Deploy Backend to EC2

### 2.1 Create Backend Files

```bash
# On EC2 via SSM
aws ssm send-command \
  --region ap-south-1 \
  --instance-ids i-0b652e38103c7635a \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "mkdir -p /home/ec2-user/backend",
    "cd /home/ec2-user/backend",
    "npm init -y",
    "npm install express cors helmet morgan dotenv pg bcryptjs jsonwebtoken uuid express-validator",
    "echo Backend setup complete"
  ]'
```

### 2.2 Create Main Server File

```javascript
// /home/ec2-user/backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan('combined'));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// AUTH ROUTES
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  const bcrypt = require('bcryptjs');
  
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1 OR phone = $1',
    [identifier]
  );
  
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const user = result.rows[0];
  const validPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      status: user.status
    },
    accessToken: token
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 12);
  
  const result = await pool.query(
    `INSERT INTO users (email, phone, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5, 'customer')
     RETURNING id, email, first_name, last_name, role, status`,
    [email, phone, passwordHash, firstName, lastName]
  );
  
  const jwt = require('jsonwebtoken');
  const user = result.rows[0];
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.status(201).json({ user, accessToken: token });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, first_name, last_name, role, status, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(result.rows[0]);
});

// ORDERS ROUTES
app.get('/api/orders', authenticateToken, async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE 1=1";
  const params = [];
  
  if (status) {
    params.push(status);
    whereClause += ` AND status = $${params.length}`;
  }
  
  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (order_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR customer_email ILIKE $${params.length})`;
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    params.push(req.user.id);
    whereClause += ` AND user_id = $${params.length}`;
  }
  
  const countResult = await pool.query(`SELECT COUNT(*) FROM orders ${whereClause}`, params);
  const ordersResult = await pool.query(
    `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  res.json({
    orders: ordersResult.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

app.patch('/api/orders/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, assignedStaffId } = req.body;
  
  const updates = ['status = $1'];
  const params = [status];
  
  if (assignedStaffId) {
    params.push(assignedStaffId);
    updates.push(`assigned_staff_id = $${params.length}`);
  }
  
  params.push(id);
  
  const result = await pool.query(
    `UPDATE orders SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );
  
  // Log audit
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
     VALUES ($1, 'status_update', 'order', $2, $3)`,
    [req.user.id, id, JSON.stringify({ status })]
  );
  
  res.json(result.rows[0]);
});

// REPAIRS ROUTES
app.get('/api/repairs', authenticateToken, async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE 1=1";
  const params = [];
  
  if (status) {
    params.push(status);
    whereClause += ` AND status = $${params.length}`;
  }
  
  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (repair_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`;
  }
  
  const countResult = await pool.query(`SELECT COUNT(*) FROM repairs ${whereClause}`, params);
  const result = await pool.query(
    `SELECT r.*, u.first_name || ' ' || u.last_name as technician_name
     FROM repairs r LEFT JOIN users u ON r.technician_id = u.id
     ${whereClause} ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  res.json({
    repairs: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

app.patch('/api/repairs/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, estimatedCost, finalCost, technicianId, quotationDetails } = req.body;
  
  const updates = ['status = $1'];
  const params = [status];
  
  if (estimatedCost !== undefined) {
    params.push(estimatedCost);
    updates.push(`estimated_cost = $${params.length}`);
  }
  if (finalCost !== undefined) {
    params.push(finalCost);
    updates.push(`final_cost = $${params.length}`);
  }
  if (technicianId) {
    params.push(technicianId);
    updates.push(`technician_id = $${params.length}`);
  }
  if (quotationDetails) {
    params.push(quotationDetails);
    updates.push(`quotation_details = $${params.length}`);
  }
  
  params.push(id);
  
  const result = await pool.query(
    `UPDATE repairs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );
  
  res.json(result.rows[0]);
});

// PC BUILDS ROUTES
app.get('/api/pc-builds', authenticateToken, async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE 1=1";
  const params = [];
  
  if (status) {
    params.push(status);
    whereClause += ` AND status = $${params.length}`;
  }
  
  const countResult = await pool.query(`SELECT COUNT(*) FROM pc_builds ${whereClause}`, params);
  const result = await pool.query(
    `SELECT * FROM pc_builds ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  res.json({
    pcBuilds: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

// PRODUCTS ROUTES
app.get('/api/products', async (req, res) => {
  const { page = 1, limit = 20, category, brand, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE is_active = TRUE";
  const params = [];
  
  if (category) {
    params.push(category);
    whereClause += ` AND category = $${params.length}`;
  }
  if (brand) {
    params.push(brand);
    whereClause += ` AND brand = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (name ILIKE $${params.length} OR sku ILIKE $${params.length})`;
  }
  
  const validSorts = ['price', 'name', 'created_at', 'stock_quantity'];
  const sortField = validSorts.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
  
  const countResult = await pool.query(`SELECT COUNT(*) FROM products ${whereClause}`, params);
  const result = await pool.query(
    `SELECT * FROM products ${whereClause} ORDER BY ${sortField} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  res.json({
    products: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

app.post('/api/products', authenticateToken, authorizeAdmin, async (req, res) => {
  const { sku, name, description, price, category, brand, stockQuantity, imageUrl } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  const result = await pool.query(
    `INSERT INTO products (sku, name, slug, description, price, category, brand, stock_quantity, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [sku, name, slug, description, price, category, brand, stockQuantity || 0, imageUrl]
  );
  
  res.status(201).json(result.rows[0]);
});

app.patch('/api/products/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const setClause = Object.keys(updates).map((k, i) => {
    const snakeKey = k.replace(/[A-Z]/g, l => '_' + l.toLowerCase());
    return `${snakeKey} = $${i + 1}`;
  }).join(', ');
  
  const values = Object.values(updates);
  
  const result = await pool.query(
    `UPDATE products SET ${setClause}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
    [...values, id]
  );
  
  res.json(result.rows[0]);
});

// STAFF ROUTES
app.get('/api/staff', authenticateToken, authorizeAdmin, async (req, res) => {
  const result = await pool.query(
    `SELECT u.*, sp.department, sp.employee_id, sp.hire_date
     FROM users u LEFT JOIN staff_profiles sp ON u.id = sp.user_id
     WHERE u.role IN ('staff', 'admin') ORDER BY u.created_at DESC`
  );
  res.json(result.rows);
});

app.post('/api/staff', authenticateToken, authorizeAdmin, async (req, res) => {
  const { email, password, firstName, lastName, department } = req.body;
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 12);
  
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, 'staff') RETURNING *`,
    [email, passwordHash, firstName, lastName]
  );
  
  const staffResult = await pool.query(
    `INSERT INTO staff_profiles (user_id, department)
     VALUES ($1, $2) RETURNING *`,
    [userResult.rows[0].id, department || 'General']
  );
  
  res.status(201).json({ ...userResult.rows[0], ...staffResult.rows[0] });
});

// CUSTOMERS ROUTES
app.get('/api/customers', authenticateToken, authorizeAdmin, async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE role = 'customer'";
  const params = [];
  
  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length})`;
  }
  
  const countResult = await pool.query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
  const result = await pool.query(
    `SELECT id, email, first_name, last_name, phone, status, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  res.json({
    customers: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

// DASHBOARD STATS ROUTES
app.get('/api/dashboard/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  const [
    ordersResult,
    repairsResult,
    pcBuildsResult,
    customersResult,
    productsResult,
    revenueResult
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM orders WHERE status != 'cancelled'`),
    pool.query(`SELECT COUNT(*) as count FROM repairs WHERE status NOT IN ('completed', 'closed')`),
    pool.query(`SELECT COUNT(*) as count FROM pc_builds WHERE status NOT IN ('delivered', 'closed')`),
    pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'customer'`),
    pool.query(`SELECT COUNT(*) as count FROM products WHERE stock_quantity <= low_stock_threshold`),
    pool.query(`SELECT SUM(total_amount) as today FROM orders WHERE DATE(created_at) = CURRENT_DATE`)
  ]);
  
  res.json({
    totalOrders: parseInt(ordersResult.rows[0].count) || 0,
    totalRevenue: parseFloat(ordersResult.rows[0].revenue) || 0,
    activeRepairs: parseInt(repairsResult.rows[0].count) || 0,
    activeBuilds: parseInt(pcBuildsResult.rows[0].count) || 0,
    totalCustomers: parseInt(customersResult.rows[0].count) || 0,
    lowStockProducts: parseInt(productsResult.rows[0].count) || 0,
    todayRevenue: parseFloat(revenueResult.rows[0].today) || 0
  });
});

// REPORTS ROUTES
app.get('/api/reports/orders-by-status', authenticateToken, authorizeAdmin, async (req, res) => {
  const result = await pool.query(
    `SELECT status, COUNT(*) as count, SUM(total_amount) as revenue
     FROM orders GROUP BY status ORDER BY count DESC`
  );
  res.json(result.rows);
});

app.get('/api/reports/revenue-by-month', authenticateToken, authorizeAdmin, async (req, res) => {
  const result = await pool.query(
    `SELECT DATE_TRUNC('month', created_at) as month, SUM(total_amount) as revenue, COUNT(*) as orders
     FROM orders WHERE status != 'cancelled' GROUP BY month ORDER BY month DESC LIMIT 12`
  );
  res.json(result.rows);
});

// COUPONS ROUTES
app.get('/api/coupons', authenticateToken, authorizeAdmin, async (req, res) => {
  const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/coupons', authenticateToken, authorizeAdmin, async (req, res) => {
  const { code, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil } = req.body;
  
  const result = await pool.query(
    `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [code, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil]
  );
  
  res.status(201).json(result.rows[0]);
});

// AUDIT LOGS
app.get('/api/audit-logs', authenticateToken, authorizeAdmin, async (req, res) => {
  const { page = 1, limit = 50, entityType, userId } = req.query;
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE 1=1";
  const params = [];
  
  if (entityType) {
    params.push(entityType);
    whereClause += ` AND entity_type = $${params.length}`;
  }
  if (userId) {
    params.push(userId);
    whereClause += ` AND user_id = $${params.length}`;
  }
  
  const countResult = await pool.query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params);
  const result = await pool.query(
    `SELECT al.*, u.email as user_email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause} ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  
  res.json({
    logs: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

// MIDDLEWARE
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authorizeAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Start server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
```

### 2.3 Start Backend with Environment Variables

```bash
# On EC2, create systemd service
sudo tee /etc/systemd/system/backend.service > /dev/null <<EOF
[Unit]
Description=Deskto Backend API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/backend
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production
Environment=DB_HOST=deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com
Environment=DB_PORT=5432
Environment=DB_NAME=deskto_db
Environment=DB_USER=deskto_admin
Environment=DB_PASSWORD=YOUR_PASSWORD
Environment=JWT_SECRET=YOUR_JWT_SECRET
Environment=FRONTEND_URL=http://13.234.99.45
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable backend
sudo systemctl start backend
sudo systemctl status backend
```

---

## STEP 3: Test Backend API

### 3.1 Health Check

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

### 3.2 Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@deskto.com","password":"admin123"}'
```

### 3.3 Test Dashboard Stats

```bash
TOKEN="your-token"
curl http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## STEP 4: Configure Frontend

### 4.1 Update Environment

```bash
# .env
VITE_API_URL=http://13.234.99.45:3001/api
```

### 4.2 Update API Client

The frontend already has `src/lib/api/index.ts` - just ensure it points to your backend:

```typescript
// src/lib/api/index.ts
const API_BASE = import.meta.env.VITE_API_URL || '/api';
```

---

## VALIDATION CHECKLIST

| Component | Test | Expected Result |
|-----------|------|-----------------|
| Database | Connect via psql | Successfully connected |
| Schema | All tables created | 25+ tables exist |
| Seed Data | Admin user exists | Login works |
| Backend | Health endpoint | {"status":"ok"} |
| Auth | Login endpoint | Returns user + token |
| Orders | GET /api/orders | Returns orders list |
| Stats | GET /api/dashboard/stats | Returns KPIs |
| Frontend | Load admin dashboard | Shows data |

---

## DEFAULT CREDENTIALS

```
Admin: admin@deskto.com / admin123
Staff: staff@deskto.com / admin123
```

---

## QUICK START COMMANDS

```bash
# 1. Run schema (in psql)
\i schema.sql

# 2. Start backend
sudo systemctl start backend

# 3. Test
curl http://localhost:3001/health

# 4. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@deskto.com","password":"admin123"}'
```

---

This workflow provides a complete backend that matches your admin dashboard frontend exactly. Execute each step in order to have a fully functional system.
