# DESKTO Backend & Database - End-to-End Workflow
# Based on Your Admin Dashboard Images

## Your Dashboard Screens (From Images)

Based on the screenshots you provided, your admin dashboard has these specific pages:

### 1. OVERVIEW (Dashboard Home)
- KPI Cards: Revenue, Orders, Repair Jobs, Active Builds, Customers, Low Stock
- Bar Chart: Monthly Orders
- Pie Chart: Orders by Category
- Line Chart: Revenue Trend
- Recent Activity Feed

### 2. CATALOG MANAGEMENT
- **Categories** (What you see in images)
  - Grid of category cards with colored icons
  - Shows: Gaming PC (6 products), Desktop PC (4), Gaming Laptop (3), Laptop (5), Monitor (4), Components (9)
  - Each card has: Name, Icon, Product Count, EDIT/DELETE buttons
  - "+ NEW CATEGORY" button
  - EDIT modal: Name, Slug, Description, Icon, Parent Category

- **Brands** (in sidebar)
  - Brand cards with logo, name, product count
  - EDIT/DELETE actions

- **Inventory** (in sidebar)
  - Product list with image, name, SKU, category, price, stock
  - Filters by category, brand, stock status
  - Search functionality

### 3. ORDERS (Operations)
- Order cards/table with:
  - Order number, date, customer name, items count
  - Status badges (Placed, Verified, Packing, Shipped, Delivered)
  - Amount, Payment status
  - Assign Staff dropdown
  - UPDATE STATUS button
  - View Details

### 4. STAFF MANAGEMENT
- Staff cards showing:
  - Avatar, Name, Email
  - Department (Sales, Technical, Admin)
  - Status (Active, Locked)
  - VERIFY/UNVERIFY toggle
  - EDIT/DELETE actions

### 5. CUSTOMERS
- Customer list with:
  - Avatar, Name, Email, Phone
  - Member Since date
  - Verified status (blue/gray badge)
  - EDIT/DELETE actions

---

# END-TO-END WORKFLOW

## STEP 1: DATABASE SCHEMA

### 1.1 Connect to PostgreSQL on RDS

```bash
# SSH to EC2
aws ssm start-session --target i-0b652e38103c7635a --region ap-south-1

# Install psql if not installed
sudo dnf install -y postgresql16

# Connect to database (use your actual password)
PGPASSWORD='YOUR_DB_PASSWORD' psql \
  -h deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com \
  -U deskto_admin \
  -d deskto_db
```

### 1.2 Create Complete Schema

Copy and run this entire SQL block in psql:

```sql
-- =============================================
-- DESKTO E-COMMERCE DATABASE SCHEMA
-- =============================================

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS (Admin, Staff, Customer)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff', 'customer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'locked')),
    is_verified BOOLEAN DEFAULT FALSE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- STAFF PROFILES (Extended staff info)
-- =============================================
CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(50) DEFAULT 'General' CHECK (department IN ('Sales', 'Technical', 'Admin', 'Support', 'Delivery')),
    employee_id VARCHAR(50) UNIQUE,
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- REFRESH TOKENS
-- =============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CATEGORIES
-- =============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),  -- Icon name/identifier
    icon_color VARCHAR(20),  -- Background color for icon
    parent_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    product_count INTEGER DEFAULT 0,  -- Cached count
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BRANDS
-- =============================================
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    description TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    product_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PRODUCTS (Inventory)
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    category_id UUID REFERENCES categories(id),
    category_name VARCHAR(100),  -- Denormalized for display
    brand_id UUID REFERENCES brands(id),
    brand_name VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    image_url VARCHAR(500),
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
    customer_name VARCHAR(255) NOT NULL,
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
    items JSONB,  -- Array of order items
    notes TEXT,
    assigned_staff_id UUID REFERENCES users(id),
    assigned_staff_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    device_type VARCHAR(100),
    device_brand VARCHAR(100),
    device_model VARCHAR(100),
    device_issue TEXT,
    device_images TEXT[],
    status VARCHAR(50) DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'received', 'quoted', 'approved', 'in-repair', 'completed', 'delivered', 'cancelled')),
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
-- PC BUILDS (Custom Builds)
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
        CHECK (status IN ('submitted', 'quoted', 'approved', 'building', 'completed', 'delivered', 'cancelled')),
    components JSONB,  -- Array of selected components
    total_price DECIMAL(10,2),
    quotation_details TEXT,
    technician_id UUID REFERENCES users(id),
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
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
        CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_staff_id UUID REFERENCES users(id),
    responses JSONB DEFAULT '[]',
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
        CHECK (status IN ('reserved', 'active', 'returned', 'overdue', 'cancelled')),
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
-- COUPONS
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

-- =============================================
-- NOTIFICATIONS
-- =============================================
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
-- AUDIT LOGS
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

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_repairs_status ON repairs(status);
CREATE INDEX idx_pc_builds_status ON pc_builds(status);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_repairs_updated BEFORE UPDATE ON repairs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pc_builds_updated BEFORE UPDATE ON pc_builds FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED DATA
-- =============================================

-- Admin User (password: admin123)
INSERT INTO users (email, phone, password_hash, first_name, last_name, role, status, is_verified)
VALUES ('admin@deskto.com', '+91-9876543210', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Admin', 'User', 'admin', 'active', TRUE);

-- Staff Users
INSERT INTO users (email, phone, password_hash, first_name, last_name, role, status, is_verified)
VALUES 
('sales@deskto.com', '+91-9876543211', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Rahul', 'Sharma', 'staff', 'active', TRUE),
('tech@deskto.com', '+91-9876543212', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Priya', 'Patel', 'staff', 'active', TRUE),
('support@deskto.com', '+91-9876543213', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Amit', 'Singh', 'staff', 'active', TRUE);

-- Staff Profiles
INSERT INTO staff_profiles (user_id, department, employee_id, hire_date, is_active)
SELECT id, 'Sales', 'EMP001', CURRENT_DATE, TRUE FROM users WHERE email = 'sales@deskto.com';

INSERT INTO staff_profiles (user_id, department, employee_id, hire_date, is_active)
SELECT id, 'Technical', 'EMP002', CURRENT_DATE, TRUE FROM users WHERE email = 'tech@deskto.com';

INSERT INTO staff_profiles (user_id, department, employee_id, hire_date, is_active)
SELECT id, 'Support', 'EMP003', CURRENT_DATE, TRUE FROM users WHERE email = 'support@deskto.com';

-- Sample Customers
INSERT INTO users (email, phone, password_hash, first_name, last_name, role, status, is_verified)
VALUES 
('test4@gmail.com', '+91-9988776655', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Test4', 'User', 'customer', 'active', TRUE),
('customer@example.com', '+91-9988776656', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'John', 'Doe', 'customer', 'active', FALSE),
('gamer@example.com', '+91-9988776657', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Gamer', 'One', 'customer', 'active', TRUE);

-- Categories (matching your dashboard)
INSERT INTO categories (name, slug, icon, icon_color, product_count, sort_order)
VALUES 
('Gaming PC', 'gaming-pc', 'gamepad-2', '#ff0000', 6, 1),
('Desktop PC', 'desktop-pc', 'monitor', '#0088ff', 4, 2),
('Gaming Laptop', 'gaming-laptop', 'laptop', '#8800ff', 3, 3),
('Laptop', 'laptop', 'briefcase', '#00cc66', 5, 4),
('Monitor', 'monitor', 'monitor', '#ffcc00', 4, 5),
('Components', 'components', 'cpu', '#ff6600', 9, 6);

-- Brands
INSERT INTO brands (name, slug, product_count)
VALUES 
('ASUS', 'asus', 5),
('Dell', 'dell', 4),
('HP', 'hp', 3),
('MSI', 'msi', 4),
('Lenovo', 'lenovo', 3),
('NVIDIA', 'nvidia', 2);

-- Sample Products
INSERT INTO products (sku, name, slug, description, price, category_id, category_name, brand_id, brand_name, stock_quantity, is_active)
SELECT 
    'GPU-001', 
    'NVIDIA RTX 4090 Gaming PC',
    'nvidia-rtx-4090-gaming-pc',
    'High-end gaming desktop with RTX 4090',
    249999.00,
    id, 'Gaming PC',
    (SELECT id FROM brands WHERE slug = 'nvidia'),
    'NVIDIA',
    5,
    TRUE
FROM categories WHERE slug = 'gaming-pc';

-- Sample Orders
INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, status, total_amount, payment_status, created_at)
VALUES 
('ORD-2024-001', 'Test4 User', 'test4@gmail.com', '+91-9988776655', 'delivered', 149999.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '5 days'),
('ORD-2024-002', 'John Doe', 'customer@example.com', '+91-9988776656', 'shipped', 79999.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('ORD-2024-003', 'Gamer One', 'gamer@example.com', '+91-9988776657', 'placed', 129999.00, 'pending', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('ORD-2024-004', 'Test4 User', 'test4@gmail.com', '+91-9988776655', 'packing', 89999.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '12 hours');

-- Dashboard Stats (as JSON for quick access)
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
SELECT 
    (SELECT id FROM users WHERE email = 'admin@deskto.com'),
    'login',
    'user',
    (SELECT id FROM users WHERE email = 'admin@deskto.com'),
    '{"ip": "127.0.0.1"}',
    CURRENT_TIMESTAMP;
```

---

## STEP 2: BACKEND API SERVER

### 2.1 Create Backend Files on EC2

```bash
# Create backend directory
mkdir -p /home/ec2-user/backend/src/{routes,config,middleware}

# Initialize npm
cd /home/ec2-user/backend
npm init -y

# Install dependencies
npm install express cors helmet morgan dotenv pg bcryptjs jsonwebtoken uuid express-validator

# Create main server file (see 2.2)
```

### 2.2 Complete Backend Code

Create `/home/ec2-user/backend/src/index.js` with this complete code:

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'deskto-secret-key-2024';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// =============================================
// MIDDLEWARE
// =============================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

// =============================================
// HEALTH CHECK
// =============================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =============================================
// AUTH ROUTES
// =============================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password required' });
    }
    
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR phone = $1',
      [identifier]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check status
    if (user.status === 'locked') {
      return res.status(423).json({ error: 'Account locked' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        isVerified: user.is_verified,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      },
      accessToken: token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    // Check if exists
    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, 'customer')
       RETURNING id, email, first_name, last_name, role, status`,
      [email, phone, passwordHash, firstName, lastName]
    );
    
    const user = result.rows[0];
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
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
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, 
              u.is_verified, u.avatar_url, u.created_at,
              sp.department, sp.employee_id
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const u = result.rows[0];
    res.json({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      status: u.status,
      isVerified: u.is_verified,
      avatarUrl: u.avatar_url,
      createdAt: u.created_at,
      department: u.department,
      employeeId: u.employee_id
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// =============================================
// DASHBOARD / OVERVIEW
// =============================================

// GET /api/dashboard/stats
app.get('/api/dashboard/stats', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const [
      revenueResult,
      ordersResult,
      repairsResult,
      buildsResult,
      customersResult,
      lowStockResult,
      todayOrdersResult,
      todayRevenueResult
    ] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'cancelled'`),
      pool.query(`SELECT COUNT(*) as count FROM orders`),
      pool.query(`SELECT COUNT(*) as count FROM repairs WHERE status NOT IN ('completed', 'delivered', 'cancelled')`),
      pool.query(`SELECT COUNT(*) as count FROM pc_builds WHERE status NOT IN ('completed', 'delivered', 'cancelled')`),
      pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'customer'`),
      pool.query(`SELECT COUNT(*) as count FROM products WHERE stock_quantity <= low_stock_threshold`),
      pool.query(`SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE`),
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status = 'paid'`)
    ]);
    
    res.json({
      totalRevenue: parseFloat(revenueResult.rows[0].total),
      totalOrders: parseInt(ordersResult.rows[0].count),
      activeRepairs: parseInt(repairsResult.rows[0].count),
      activeBuilds: parseInt(buildsResult.rows[0].count),
      totalCustomers: parseInt(customersResult.rows[0].count),
      lowStockProducts: parseInt(lowStockResult.rows[0].count),
      todayOrders: parseInt(todayOrdersResult.rows[0].count),
      todayRevenue: parseFloat(todayRevenueResult.rows[0].total)
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// GET /api/dashboard/recent-activity
app.get('/api/dashboard/recent-activity', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// =============================================
// CATEGORIES (Your main focus)
// =============================================

// GET /api/categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count
       FROM categories c
       WHERE c.is_active = TRUE
       ORDER BY c.sort_order, c.name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// POST /api/categories
app.post('/api/categories', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description, icon, iconColor, parentId } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, icon, icon_color, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, slug, description, icon, iconColor, parentId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category slug already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id
app.put('/api/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, iconColor, parentId, sortOrder } = req.body;
    
    const result = await pool.query(
      `UPDATE categories 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           icon = COALESCE($3, icon),
           icon_color = COALESCE($4, icon_color),
           parent_id = COALESCE($5, parent_id),
           sort_order = COALESCE($6, sort_order),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, icon, iconColor, parentId, sortOrder, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id
app.delete('/api/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if has products
    const check = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
      [id]
    );
    
    if (parseInt(check.rows[0].count) > 0) {
      // Soft delete
      await pool.query(
        'UPDATE categories SET is_active = FALSE WHERE id = $1',
        [id]
      );
    } else {
      // Hard delete
      await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    }
    
    res.json({ message: 'Category deleted' });
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
    const result = await pool.query(
      `SELECT b.*,
              (SELECT COUNT(*) FROM products WHERE brand_id = b.id) as product_count
       FROM brands b
       WHERE b.is_active = TRUE
       ORDER BY b.name`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get brands' });
  }
});

app.post('/api/brands', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description, logoUrl, website } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const result = await pool.query(
      `INSERT INTO brands (name, slug, description, logo_url, website)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, slug, description, logoUrl, website]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

app.put('/api/brands/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logoUrl, website } = req.body;
    
    const result = await pool.query(
      `UPDATE brands 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           logo_url = COALESCE($3, logo_url),
           website = COALESCE($4, website)
       WHERE id = $5
       RETURNING *`,
      [name, description, logoUrl, website, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// =============================================
// PRODUCTS / INVENTORY
// =============================================

app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, brand, search, stockStatus } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE p.is_active = TRUE';
    const params = [];
    
    if (category) {
      params.push(category);
      whereClause += ` AND p.category_id = $${params.length}`;
    }
    if (brand) {
      params.push(brand);
      whereClause += ` AND p.brand_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
    }
    if (stockStatus === 'low') {
      whereClause += ' AND p.stock_quantity <= p.low_stock_threshold';
    } else if (stockStatus === 'out') {
      whereClause += ' AND p.stock_quantity = 0';
    }
    
    const countResult = await pool.query(`SELECT COUNT(*) FROM products p ${whereClause}`, params);
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, b.name as brand_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    res.json({
      products: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get products' });
  }
});

app.post('/api/products', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { sku, name, description, price, categoryId, brandId, stockQuantity, imageUrl, specifications } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const categoryResult = await pool.query('SELECT name FROM categories WHERE id = $1', [categoryId]);
    const brandResult = await pool.query('SELECT name FROM brands WHERE id = $1', [brandId]);
    
    const result = await pool.query(
      `INSERT INTO products (sku, name, slug, description, price, category_id, category_name, brand_id, brand_name, stock_quantity, image_url, specifications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [sku, name, slug, description, price, categoryId, categoryResult.rows[0]?.name, brandId, brandResult.rows[0]?.name, stockQuantity || 0, imageUrl, specifications]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// =============================================
// ORDERS (Matching your dashboard)
// =============================================

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, assignedStaff } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    // Non-admin can only see their own orders
    if (req.user.role === 'customer') {
      whereClause += ' AND user_id = $1';
      params.push(req.user.id);
    }
    
    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (order_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`;
    }
    if (assignedStaff) {
      params.push(assignedStaff);
      whereClause += ` AND assigned_staff_id = $${params.length}`;
    }
    
    const countResult = await pool.query(`SELECT COUNT(*) FROM orders ${whereClause}`, params);
    const result = await pool.query(
      `SELECT o.*, u.first_name || ' ' || u.last_name as assigned_staff_name
       FROM orders o
       LEFT JOIN users u ON o.assigned_staff_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    res.json({
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// PATCH /api/orders/:id
app.patch('/api/orders/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedStaffId, notes } = req.body;
    
    const updates = [];
    const params = [];
    
    if (status) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (assignedStaffId !== undefined) {
      params.push(assignedStaffId);
      updates.push(`assigned_staff_id = $${params.length}`);
      
      // Get staff name
      const staffResult = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [assignedStaffId]
      );
      if (staffResult.rows.length > 0) {
        params.push(`${staffResult.rows[0].first_name} ${staffResult.rows[0].last_name}`);
        updates.push(`assigned_staff_name = $${params.length}`);
      }
    }
    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    params.push(id);
    const result = await pool.query(
      `UPDATE orders SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// =============================================
// STAFF MANAGEMENT (Your dashboard)
// =============================================

app.get('/api/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.role, u.status, u.is_verified, u.avatar_url, u.created_at,
              sp.department, sp.employee_id, sp.hire_date, sp.is_active
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE u.role IN ('staff', 'admin')
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get staff' });
  }
});

app.post('/api/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, department, employeeId } = req.body;
    
    const passwordHash = await bcrypt.hash(password, 12);
    
    const userResult = await pool.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, 'staff')
       RETURNING *`,
      [email, phone, passwordHash, firstName, lastName]
    );
    
    const profileResult = await pool.query(
      `INSERT INTO staff_profiles (user_id, department, employee_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userResult.rows[0].id, department || 'General', employeeId]
    );
    
    res.status(201).json({ ...userResult.rows[0], ...profileResult.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

app.patch('/api/staff/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isVerified, department, isActive } = req.body;
    
    // Update user
    const userUpdates = [];
    const userParams = [];
    
    if (status) {
      userParams.push(status);
      userUpdates.push(`status = $${userParams.length}`);
    }
    if (isVerified !== undefined) {
      userParams.push(isVerified);
      userUpdates.push(`is_verified = $${userParams.length}`);
    }
    
    if (userUpdates.length > 0) {
      userParams.push(id);
      await pool.query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${userParams.length}`,
        userParams
      );
    }
    
    // Update profile
    if (department !== undefined || isActive !== undefined) {
      const profileUpdates = [];
      const profileParams = [];
      
      if (department) {
        profileParams.push(department);
        profileUpdates.push(`department = $${profileParams.length}`);
      }
      if (isActive !== undefined) {
        profileParams.push(isActive);
        profileUpdates.push(`is_active = $${profileParams.length}`);
      }
      
      if (profileUpdates.length > 0) {
        profileParams.push(id);
        await pool.query(
          `UPDATE staff_profiles SET ${profileUpdates.join(', ')} WHERE user_id = $${profileParams.length}`,
          profileParams
        );
      }
    }
    
    const result = await pool.query(
      `SELECT u.*, sp.department, sp.employee_id FROM users u LEFT JOIN staff_profiles sp ON u.id = sp.user_id WHERE u.id = $1`,
      [id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

// =============================================
// CUSTOMERS
// =============================================

app.get('/api/customers', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, verified } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = "WHERE role = 'customer'";
    const params = [];
    
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`;
    }
    if (verified !== undefined) {
      params.push(verified === 'true');
      whereClause += ` AND is_verified = $${params.length}`;
    }
    
    const countResult = await pool.query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    const result = await pool.query(
      `SELECT id, email, phone, first_name, last_name, status, is_verified, avatar_url, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    res.json({
      customers: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

app.patch('/api/customers/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isVerified } = req.body;
    
    const updates = [];
    const params = [];
    
    if (status) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (isVerified !== undefined) {
      params.push(isVerified);
      updates.push(`is_verified = $${params.length}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    params.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} AND role = 'customer' RETURNING id, email, first_name, last_name, status, is_verified`,
      params
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// =============================================
// ERROR HANDLING
// =============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  DESKTO Backend API`);
  console.log(`  Running on port ${PORT}`);
  console.log(`========================================\n`);
});
```

---

## STEP 3: START BACKEND ON EC2

### 3.1 Create Environment File

```bash
# On EC2 via SSM
sudo tee /home/ec2-user/backend/.env > /dev/null <<EOF
NODE_ENV=production
PORT=3001
DB_HOST=deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=deskto_db
DB_USER=deskto_admin
DB_PASSWORD=YOUR_DB_PASSWORD_HERE
JWT_SECRET=deskto-jwt-secret-2024-secure
FRONTEND_URL=*
EOF
```

### 3.2 Create Systemd Service

```bash
# Create service
sudo tee /etc/systemd/system/deskto-backend.service > /dev/null <<EOF
[Unit]
Description=DESKTO Backend API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/backend
ExecStart=/usr/bin/node src/index.js
Restart=always
EnvironmentFile=/home/ec2-user/backend/.env

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable deskto-backend
sudo systemctl start deskto-backend
sudo systemctl status deskto-backend
```

---

## STEP 4: TEST API

### 4.1 Health Check

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"2024-..."}
```

### 4.2 Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@deskto.com","password":"admin123"}'
```

### 4.3 Test Categories

```bash
# Get token first, then:
curl http://localhost:3001/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## QUICK REFERENCE

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@deskto.com | admin123 |
| Staff (Sales) | sales@deskto.com | admin123 |
| Staff (Technical) | tech@deskto.com | admin123 |
| Customer | test4@gmail.com | admin123 |

### API Endpoints Summary

```
Authentication:
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me

Dashboard:
GET  /api/dashboard/stats
GET  /api/dashboard/recent-activity

Categories (Your main focus):
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

Brands:
GET    /api/brands
POST   /api/brands
PUT    /api/brands/:id

Products:
GET    /api/products
POST   /api/products

Orders:
GET    /api/orders
PATCH  /api/orders/:id

Staff:
GET    /api/staff
POST   /api/staff
PATCH  /api/staff/:id

Customers:
GET    /api/customers
PATCH  /api/customers/:id
```

---

## YOUR WORKFLOW CHECKLIST

- [ ] Step 1: Connect to PostgreSQL and run schema
- [ ] Step 2: Deploy backend code to EC2
- [ ] Step 3: Configure environment and start service
- [ ] Step 4: Test with curl commands
- [ ] Step 5: Update frontend .env with API URL
- [ ] Step 6: Access admin dashboard at http://13.234.99.45/dashboard/admin

**Login with:** `admin@deskto.com` / `admin123`
