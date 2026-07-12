# DESKTO Backend & Database — Complete End-to-End Workflow
# For All Admin Dashboard Pages (Admin, Staff, Customer)

# ============================================
# YOUR DASHBOARD PAGES (FROM YOUR IMAGES)
# ============================================

## Pages You Have:

| # | Page | Table Columns | Key Features |
|---|------|--------------|-------------|
| 1 | **Categories** | Name, Icon, Product Count | Grid cards, Edit/Delete |
| 2 | **Brands** | Logo, Name, Product Count | Grid cards, Edit/Delete |
| 3 | **Inventory** | Image, Name, SKU, Category, Price, Stock | Search, Filter, Edit |
| 4 | **Orders** | Order#, Date, Customer, Items, Status, Amount | Assign Staff, Update Status |
| 5 | **Repairs** | Repair#, Customer, Device, Issue, Status, Cost | Quotation, Assign Tech |
| 6 | **PC Builds** | Build#, Customer, Components, Quote, Technician, Progress, Status | Inline quote editor, Compatibility |
| 7 | **Assembly** | Build#, Components, Technician, Progress, Status | Stage tracking |
| 8 | **Upgrades** | Customer, Device, Upgrade Items, Status, Cost | Quotation, Assign |
| 9 | **Software** | Customer, Software, License, Status, Cost | Activation, Assign |
| 10 | **Rentals** | Rental#, Customer, Product, Period, Status | Return tracking |
| 11 | **Deliveries** | Delivery#, Order/Repair, Tracking, Partner, Status | Tracking, Schedule |
| 12 | **Remote Support** | Ticket#, Customer, Issue, Status, Priority | Session tracking |
| 13 | **Sell Used** | Product, Customer, Offer, Status | Valuation, Approve |
| 14 | **Staff** | Name, Email, Department, Status | Verify/Unverify, Edit |
| 15 | **Customers** | Name, Email, Phone, Verified | Edit/Delete |
| 16 | **Suppliers** | Name, Email, Phone, GST | CRUD |
| 17 | **Coupons** | Code, Type, Value, Usage, Status | Create/Edit/Deactivate |
| 18 | **Gaming Hub** | Title, Type, Status, Author | Content management |
| 19 | **Overview** | KPI Cards + Charts | Revenue, Orders, Repairs, etc. |

## Shared Pattern Across All Service Tables (Repairs, PC Builds, Assembly, Upgrades, Software, Rentals, Support, Sell Used):

```
┌─────────────────────────────────────────────────────────────────┐
│  ID │ CUSTOMER │ DETAILS │ QUOTE/PRICE │ TECHNICIAN │ PROGRESS │ STATUS │ ACTIONS │
└─────────────────────────────────────────────────────────────────┘
```

All service tables share: customer info → details → pricing → technician assignment → progress tracking → status → action buttons

# ============================================
# STEP 1: DATABASE SCHEMA
# ============================================

## 1.1 — Connect to RDS PostgreSQL

```bash
# SSH to EC2
aws ssm start-session --target i-0b652e38103c7635a --region ap-south-1

# Install PostgreSQL client
sudo dnf install -y postgresql16

# Get database password (from SSM)
# NOTE: Run this on your LOCAL machine, not in EC2 session
aws ssm get-parameter --name "/deskto-website/production/database-url" \
  --with-decryption --region ap-south-1 --query "Parameter.Value" --output text

# Copy the password from output, then connect:
PGPASSWORD='<paste-password-from-above>' psql \
  -h deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com \
  -U deskto_admin \
  -d deskto_db
```

## 1.2 — Complete Schema (Run in psql)

```sql
-- =============================================
-- DESKTO COMPLETE DATABASE SCHEMA
-- All tables matching your dashboard images
-- =============================================

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
-- STAFF PROFILES
-- =============================================
CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(50) DEFAULT 'General'
        CHECK (department IN ('Sales', 'Technical', 'Admin', 'Support', 'Delivery', 'Assembly')),
    employee_id VARCHAR(50) UNIQUE,
    hire_date DATE,
    specialization VARCHAR(255),
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
-- CATEGORIES (Dashboard Page #1)
-- Grid cards: name, icon, color, product count, Edit/Delete
-- =============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    icon_color VARCHAR(20),
    parent_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BRANDS (Dashboard Page #2)
-- Grid cards: logo, name, product count, Edit/Delete
-- =============================================
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    description TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PRODUCTS / INVENTORY (Dashboard Page #3)
-- Columns: Image, Name, SKU, Category, Price, Stock
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    category_id UUID REFERENCES categories(id),
    category_name VARCHAR(100),
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
-- ORDERS (Dashboard Page #4)
-- Columns: Order#, Date, Customer, Items, Status, Amount
-- Features: Assign Staff, Update Status
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
    items JSONB,
    notes TEXT,
    assigned_staff_id UUID REFERENCES users(id),
    assigned_staff_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- REPAIRS (Dashboard Page #5)
-- Columns: Repair#, Customer, Device, Issue, Status, Cost
-- Features: Quotation, Assign Technician, Cost tracking
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
        CHECK (status IN ('submitted', 'received', 'quoted', 'approved', 'in-repair',
                          'repair-progress', 'qc', 'completed', 'delivered', 'cancelled')),
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    quotation_details JSONB,  -- Array of {item, cost}
    technician_id UUID REFERENCES users(id),
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PC BUILDS (Dashboard Page #6 — YOUR IMAGE)
-- Columns: Build#, Customer, Components, Quote, Technician, Progress, Status
-- Features: Inline quote editor, Compatibility check, Stage progress
-- =============================================
CREATE TABLE pc_builds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    build_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    use_case VARCHAR(100),
    budget_range VARCHAR(50),
    status VARCHAR(50) DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'reviewed', 'quoted', 'approved', 'reserved',
                          'building', 'assembling', 'software-install', 'stress-test',
                          'qc', 'completed', 'delivered', 'cancelled')),
    -- Components as array of objects
    components JSONB NOT NULL DEFAULT '[]',
    -- Compatibility check results
    compatibility_checks JSONB DEFAULT '{}',
    -- Quote/pricing
    quotation_items JSONB DEFAULT '[]',  -- [{item, cost}, ...]
    subtotal DECIMAL(10,2),
    gst_amount DECIMAL(10,2),
    shipping_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    quotation_notes TEXT,
    -- Technician & Progress
    technician_id UUID REFERENCES users(id),
    technician_name VARCHAR(255),
    current_stage VARCHAR(100),
    progress_steps JSONB DEFAULT '[]',  -- [{step, status, note, timestamp}]
    progress_percent INTEGER DEFAULT 0,
    -- Assignment
    assigned_staff_id UUID REFERENCES users(id),
    assigned_staff_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ASSEMBLY (Dashboard Page #7)
-- Same pattern as PC Builds — stages, technician, progress
-- =============================================
CREATE TABLE assemblies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assembly_number VARCHAR(50) UNIQUE NOT NULL,
    build_id UUID REFERENCES pc_builds(id),
    repair_id UUID REFERENCES repairs(id),
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'queued'
        CHECK (status IN ('queued', 'assigned', 'building', 'testing', 'completed', 'delivered')),
    components JSONB DEFAULT '[]',
    progress_steps JSONB DEFAULT '[]',
    progress_percent INTEGER DEFAULT 0,
    technician_id UUID REFERENCES users(id),
    technician_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- UPGRADES (Dashboard Page #8)
-- =============================================
CREATE TABLE upgrades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upgrade_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    device_type VARCHAR(100),
    device_model VARCHAR(100),
    current_specs JSONB,
    upgrade_items JSONB DEFAULT '[]',  -- [{component, current, upgrade, cost}]
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'requested'
        CHECK (status IN ('requested', 'quoted', 'approved', 'in-progress', 'completed', 'cancelled')),
    quotation_notes TEXT,
    technician_id UUID REFERENCES users(id),
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SOFTWARE (Dashboard Page #9)
-- =============================================
CREATE TABLE software_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    software_name VARCHAR(255) NOT NULL,
    license_type VARCHAR(100),
    device_info JSONB,
    status VARCHAR(50) DEFAULT 'requested'
        CHECK (status IN ('requested', 'quoted', 'approved', 'installing', 'activated', 'completed', 'cancelled')),
    cost DECIMAL(10,2),
    license_key VARCHAR(255),
    activation_details JSONB,
    technician_id UUID REFERENCES users(id),
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- RENTALS (Dashboard Page #10)
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
    product_snapshot JSONB,
    status VARCHAR(30) DEFAULT 'reserved'
        CHECK (status IN ('reserved', 'active', 'return-requested', 'returned', 'overdue', 'cancelled')),
    rental_start DATE,
    rental_end DATE,
    actual_return_date DATE,
    rental_price DECIMAL(10,2),
    security_deposit DECIMAL(10,2),
    deposit_returned BOOLEAN DEFAULT FALSE,
    condition_notes TEXT,
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DELIVERIES (Dashboard Page #11)
-- =============================================
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_number VARCHAR(50) UNIQUE NOT NULL,
    -- Links to any service type
    related_type VARCHAR(20) CHECK (related_type IN ('order', 'repair', 'pc_build', 'assembly', 'upgrade', 'rental')),
    related_id UUID,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    address JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'scheduled', 'picked', 'in-transit', 'delivered', 'failed', 'returned')),
    tracking_number VARCHAR(100),
    delivery_partner VARCHAR(100),
    partner_contact VARCHAR(20),
    scheduled_date DATE,
    scheduled_time TIME,
    delivered_at TIMESTAMP,
    delivered_by VARCHAR(255),
    proof_image VARCHAR(500),
    notes TEXT,
    assigned_staff_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- REMOTE SUPPORT (Dashboard Page #12)
-- =============================================
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('technical', 'billing', 'sales', 'warranty', 'general')),
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(30) DEFAULT 'open'
        CHECK (status IN ('open', 'assigned', 'in-progress', 'waiting-customer', 'resolved', 'closed')),
    -- Remote session details
    session_type VARCHAR(50),  -- 'remote-desktop', 'phone', 'chat', 'video'
    session_id VARCHAR(100),
    session_link VARCHAR(500),
    -- Resolution
    resolution TEXT,
    resolution_time_minutes INTEGER,
    -- Assignment
    assigned_staff_id UUID REFERENCES users(id),
    assigned_staff_name VARCHAR(255),
    -- Conversation history
    responses JSONB DEFAULT '[]',  -- [{staff, message, timestamp}]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SELL USED (Dashboard Page #13)
-- =============================================
CREATE TABLE sell_used (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20) NOT NULL,
    product_type VARCHAR(100) NOT NULL,
    product_brand VARCHAR(100),
    product_model VARCHAR(100),
    condition_rating VARCHAR(20) CHECK (condition_rating IN ('excellent', 'good', 'fair', 'poor')),
    condition_notes TEXT,
    asking_price DECIMAL(10,2),
    images TEXT[],
    status VARCHAR(50) DEFAULT 'received'
        CHECK (status IN ('received', 'inspected', 'offered', 'accepted', 'rejected', 'purchased', 'listed')),
    -- Valuation
    valuation_amount DECIMAL(10,2),
    valuation_notes TEXT,
    valuation_by UUID REFERENCES users(id),
    -- Purchase
    offer_amount DECIMAL(10,2),
    offer_accepted BOOLEAN,
    purchased_price DECIMAL(10,2),
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CUSTOMERS (Dashboard Page #14)
-- =============================================
-- Already in users table (role = 'customer')
-- Additional customer-specific data:
CREATE TABLE customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    member_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_order_date TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    notes TEXT
);

-- =============================================
-- STAFF (Dashboard Page #15)
-- Already in users table (role = 'staff') + staff_profiles
-- =============================================

-- =============================================
-- SUPPLIERS (Dashboard Page #16)
-- =============================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(20),
    contact_person VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PURCHASE ORDERS
-- =============================================
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'ordered', 'shipped', 'received', 'cancelled')),
    items JSONB NOT NULL DEFAULT '[]',
    total_amount DECIMAL(10,2),
    expected_delivery DATE,
    received_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- COUPONS (Dashboard Page #17)
-- =============================================
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- GAMING HUB / OFFERS (Dashboard Page #18)
-- =============================================
CREATE TABLE gaming_hub (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content_type VARCHAR(50) NOT NULL
        CHECK (content_type IN ('gaming-news', 'latest-hardware', 'esports-update',
                                'game-release', 'gaming-tip', 'benchmark-result',
                                'product-review', 'community-blog', 'featured-build',
                                'offer', 'testimonial', 'faq')),
    description TEXT,
    content TEXT,
    image_url VARCHAR(500),
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
-- FEATURED BUILDS (Homepage)
-- =============================================
CREATE TABLE featured_builds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    use_case VARCHAR(100),
    budget_range VARCHAR(50),
    components JSONB NOT NULL DEFAULT '[]',
    total_price DECIMAL(10,2),
    image_url VARCHAR(500),
    is_published BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
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
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_repairs_status ON repairs(status);
CREATE INDEX idx_pc_builds_status ON pc_builds(status);
CREATE INDEX idx_assemblies_status ON assemblies(status);
CREATE INDEX idx_upgrades_status ON upgrades(status);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_support_status ON support_tickets(status);
CREATE INDEX idx_sell_used_status ON sell_used(status);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =============================================
-- AUTO UPDATE TRIGGER
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
CREATE TRIGGER trg_assemblies_updated BEFORE UPDATE ON assemblies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_upgrades_updated BEFORE UPDATE ON upgrades FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rentals_updated BEFORE UPDATE ON rentals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_support_updated BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sell_used_updated BEFORE UPDATE ON sell_used FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED DATA
-- =============================================

-- Users (password: admin123 for all)
INSERT INTO users (email, phone, password_hash, first_name, last_name, role, status, is_verified)
VALUES
  ('admin@deskto.com', '+91-9876543210', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Admin', 'User', 'admin', 'active', TRUE),
  ('sales@deskto.com', '+91-9876543211', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Rahul', 'Sharma', 'staff', 'active', TRUE),
  ('tech@deskto.com', '+91-9876543212', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Priya', 'Patel', 'staff', 'active', TRUE),
  ('support@deskto.com', '+91-9876543213', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Amit', 'Singh', 'staff', 'active', TRUE),
  ('test4@gmail.com', '+91-9988776655', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Test4', 'User', 'customer', 'active', TRUE),
  ('demo@deskto.in', '+91-9876543214', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Demo', 'Customer', 'customer', 'active', TRUE);

-- Staff Profiles
INSERT INTO staff_profiles (user_id, department, employee_id, hire_date, specialization, is_active)
SELECT id, 'Sales', 'EMP001', CURRENT_DATE, 'Sales & Customer Relations', TRUE FROM users WHERE email = 'sales@deskto.com'
UNION ALL
SELECT id, 'Technical', 'EMP002', CURRENT_DATE, 'PC Assembly & Repair', TRUE FROM users WHERE email = 'tech@deskto.com'
UNION ALL
SELECT id, 'Support', 'EMP003', CURRENT_DATE, 'Remote Support', TRUE FROM users WHERE email = 'support@deskto.com';

-- Categories (matching your dashboard: Gaming PC, Desktop PC, etc.)
INSERT INTO categories (name, slug, icon, icon_color, sort_order)
VALUES
  ('Gaming PC', 'gaming-pc', 'gamepad-2', '#FF1F45', 1),
  ('Desktop PC', 'desktop-pc', 'monitor', '#0088ff', 2),
  ('Gaming Laptop', 'gaming-laptop', 'laptop', '#8800ff', 3),
  ('Laptop', 'laptop', 'briefcase', '#00cc66', 4),
  ('Monitor', 'monitor', 'monitor', '#ffcc00', 5),
  ('Components', 'components', 'cpu', '#ff6600', 6);

-- Brands
INSERT INTO brands (name, slug) VALUES
  ('ASUS', 'asus'), ('Dell', 'dell'), ('HP', 'hp'), ('MSI', 'msi'),
  ('Lenovo', 'lenovo'), ('NVIDIA', 'nvidia'), ('AMD', 'amd'), ('Intel', 'intel'),
  ('Corsair', 'corsair'), ('Kingston', 'kingston'), ('Samsung', 'samsung');

-- Sample Product (for inventory page)
INSERT INTO products (sku, name, slug, description, price, category_id, category_name, brand_id, brand_name, stock_quantity, is_active)
SELECT 'GPU-001', 'NVIDIA RTX 4090 Gaming PC', 'nvidia-rtx-4090',
  'High-end gaming desktop', 249999.00,
  id, 'Gaming PC',
  (SELECT id FROM brands WHERE slug='nvidia'), 'NVIDIA',
  5, TRUE FROM categories WHERE slug='gaming-pc';

-- Sample PC Build (matching your dashboard image)
INSERT INTO pc_builds (
  build_number, user_id, customer_name, customer_email, customer_phone,
  title, description, use_case, budget_range, status,
  components, quotation_items, subtotal, gst_amount, shipping_amount, total_amount,
  technician_id, technician_name, assigned_staff_id, current_stage, progress_percent
) VALUES (
  'BLD-2024-001',
  (SELECT id FROM users WHERE email='demo@deskto.in'),
  'Demo Customer', 'demo@deskto.in', '+91 98765 43210',
  'Content Creator Beast',
  'High-performance PC for video editing and streaming',
  'Editing', '₹2,00,000 - ₹3,00,000', 'stress-test',
  -- Components JSON
  '[{"category":"CPU","name":"Intel Core i9-14900K","price":54000},{"category":"GPU","name":"RTX 4080 Super","price":98000},{"category":"RAM","name":"64GB DDR5","price":28000},{"category":"Storage","name":"4TB NVMe SSD","price":38000},{"category":"Case","name":"Lian Li O11 Dynamic","price":17800}]',
  -- Quotation Items JSON
  '[{"item":"CPU: i9-14900K","cost":54000},{"item":"GPU: RTX 4080 Super","cost":98000},{"item":"RAM: 64GB DDR5","cost":28000},{"item":"Storage: 4TB NVMe","cost":38000},{"item":"Case: Lian Li O11 Dynamic","cost":17800},{"item":"Assembly Charge","cost":8000},{"item":"GST (18%)","cost":42462},{"item":"Shipping","cost":0}]',
  245800, 42462, 0, 206362,
  (SELECT id FROM users WHERE email='tech@deskto.com'), 'Anita Verma',
  (SELECT id FROM users WHERE email='sales@deskto.com'),
  'Stress Testing', 63
);

-- Update compatibility checks for the sample build
UPDATE pc_builds SET compatibility_checks = '{
  "cpu_socket": {"status": "pass", "note": "LGA 1700 socket compatible"},
  "psu_wattage": {"status": "pass", "note": "850W sufficient"},
  "gpu_clearance": {"status": "pass", "note": "Fits in O11 Dynamic"},
  "upgrade_path": {"status": "pass", "note": "Future upgrade ready"}
}' WHERE build_number = 'BLD-2024-001';

-- Sample Orders
INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, status, subtotal, tax_amount, total_amount, payment_status, items, created_at)
VALUES
  ('ORD-2024-001', 'Test4 User', 'test4@gmail.com', '+91-9988776655', 'delivered', 127540, 22957, 149999, 'paid',
   '[{"product":"RTX 4090 Gaming PC","qty":1,"price":249999}]'::jsonb,
   CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('ORD-2024-002', 'Demo Customer', 'demo@deskto.in', '+91-9876543214', 'shipped', 67999, 12239, 79999, 'paid',
   '[{"product":"Gaming Laptop Pro","qty":1,"price":79999}]'::jsonb,
   CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('ORD-2024-003', 'Demo Customer', 'demo@deskto.in', '+91-9876543214', 'placed', 110255, 19845, 129999, 'pending',
   '[{"product":"Custom PC Build","qty":1,"price":129999}]'::jsonb,
   CURRENT_TIMESTAMP - INTERVAL '1 day');
```

---

# ============================================
# STEP 2: COMPLETE BACKEND API
# ============================================

## 2.1 — On EC2: Setup

```bash
# SSH to EC2
aws ssm start-session --target i-0b652e38103c7635a --region ap-south-1

# Install Node.js (if not installed)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Create backend
mkdir -p /home/ec2-user/backend
cd /home/ec2-user/backend
npm init -y
npm install express cors helmet morgan dotenv pg bcryptjs jsonwebtoken uuid express-validator
```

## 2.2 — Create `/home/ec2-user/backend/src/index.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'deskto-secret-2024';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ── Middleware ──
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// ── Auth Middleware ──
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

// =============================================
// AUTH
// =============================================

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Missing fields' });

  const result = await pool.query('SELECT * FROM users WHERE email=$1 OR phone=$1', [identifier]);
  if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

  const user = result.rows[0];
  if (user.status === 'locked') return res.status(423).json({ error: 'Account locked' });

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
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;
  if (!email || !password || !firstName) return res.status(400).json({ error: 'Missing fields' });

  const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (exists.rows.length > 0) return res.status(400).json({ error: 'Email exists' });

  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    'INSERT INTO users (email, phone, password_hash, first_name, last_name, role) VALUES ($1,$2,$3,$4,$5,\'customer\') RETURNING *',
    [email, phone, hash, firstName, lastName]
  );

  const u = result.rows[0];
  const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '24h' });

  res.status(201).json({
    user: { id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, status: u.status },
    accessToken: token
  });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const result = await pool.query(
    `SELECT u.*, sp.department, sp.employee_id
     FROM users u LEFT JOIN staff_profiles sp ON u.id = sp.user_id WHERE u.id=$1`,
    [req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

// =============================================
// DASHBOARD / OVERVIEW (Page #1)
// =============================================

app.get('/api/dashboard/stats', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
    pool.query("SELECT COALESCE(SUM(total_amount),0) as v FROM orders WHERE status!='cancelled'"),
    pool.query('SELECT COUNT(*) as v FROM orders'),
    pool.query("SELECT COUNT(*) as v FROM repairs WHERE status NOT IN ('completed','delivered','cancelled')"),
    pool.query("SELECT COUNT(*) as v FROM pc_builds WHERE status NOT IN ('completed','delivered','cancelled')"),
    pool.query("SELECT COUNT(*) as v FROM users WHERE role='customer'"),
    pool.query("SELECT COUNT(*) as v FROM products WHERE stock_quantity<=low_stock_threshold"),
    pool.query("SELECT COUNT(*) as v FROM orders WHERE DATE(created_at)=CURRENT_DATE"),
  ]);
  res.json({
    totalRevenue: +r1.rows[0].v, totalOrders: +r2.rows[0].v,
    activeRepairs: +r3.rows[0].v, activeBuilds: +r4.rows[0].v,
    totalCustomers: +r5.rows[0].v, lowStock: +r6.rows[0].v,
    todayOrders: +r7.rows[0].v
  });
});

app.get('/api/dashboard/charts/orders-by-status', authenticateToken, async (req, res) => {
  const r = await pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
  res.json(r.rows);
});

app.get('/api/dashboard/charts/revenue-trend', authenticateToken, async (req, res) => {
  const r = await pool.query(
    "SELECT DATE_TRUNC('month', created_at) as month, SUM(total_amount) as revenue FROM orders WHERE status!='cancelled' GROUP BY month ORDER BY month DESC LIMIT 12"
  );
  res.json(r.rows);
});

// =============================================
// CATEGORIES (Page #2)
// =============================================

app.get('/api/categories', async (req, res) => {
  const r = await pool.query(
    `SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id=c.id) as product_count
     FROM categories c WHERE c.is_active=TRUE ORDER BY c.sort_order, c.name`
  );
  res.json(r.rows);
});

app.post('/api/categories', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, description, icon, iconColor, parentId } = req.body;
  const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const r = await pool.query(
    'INSERT INTO categories (name, slug, description, icon, icon_color, parent_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [name, slug, description, icon, iconColor, parentId]
  );
  logAudit(req.user.id, 'create_category', 'category', r.rows[0].id, r.rows[0]);
  res.status(201).json(r.rows[0]);
});

app.put('/api/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, description, icon, iconColor, parentId, sortOrder } = req.body;
  const r = await pool.query(
    'UPDATE categories SET name=COALESCE($1,name), description=COALESCE($2,description), icon=COALESCE($3,icon), icon_color=COALESCE($4,icon_color), parent_id=COALESCE($5,parent_id), sort_order=COALESCE($6,sort_order), updated_at=NOW() WHERE id=$7 RETURNING *',
    [name, description, icon, iconColor, parentId, sortOrder, id]
  );
  logAudit(req.user.id, 'update_category', 'category', id, r.rows[0]);
  res.json(r.rows[0]);
});

app.delete('/api/categories/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const check = await pool.query('SELECT COUNT(*) as c FROM products WHERE category_id=$1', [id]);
  if (+check.rows[0].c > 0) {
    await pool.query('UPDATE categories SET is_active=FALSE WHERE id=$1', [id]);
  } else {
    await pool.query('DELETE FROM categories WHERE id=$1', [id]);
  }
  logAudit(req.user.id, 'delete_category', 'category', id, {});
  res.json({ message: 'Done' });
});

// =============================================
// BRANDS (Page #3)
// =============================================

app.get('/api/brands', async (req, res) => {
  const r = await pool.query(
    `SELECT b.*, (SELECT COUNT(*) FROM products WHERE brand_id=b.id) as product_count
     FROM brands b WHERE b.is_active=TRUE ORDER BY b.name`
  );
  res.json(r.rows);
});

app.post('/api/brands', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, description, logoUrl, website } = req.body;
  const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const r = await pool.query(
    'INSERT INTO brands (name, slug, description, logo_url, website) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, slug, description, logoUrl, website]
  );
  res.status(201).json(r.rows[0]);
});

app.put('/api/brands/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, description, logoUrl, website } = req.body;
  const r = await pool.query(
    'UPDATE brands SET name=COALESCE($1,name), description=COALESCE($2,description), logo_url=COALESCE($3,logo_url), website=COALESCE($4,website) WHERE id=$5 RETURNING *',
    [name, description, logoUrl, website, id]
  );
  res.json(r.rows[0]);
});

// =============================================
// PRODUCTS / INVENTORY (Page #4)
// =============================================

app.get('/api/products', async (req, res) => {
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
});

app.post('/api/products', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { sku, name, description, price, categoryId, brandId, stockQuantity, imageUrl } = req.body;
  const slug = (name||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
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
});

app.put('/api/products/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  const keys = Object.keys(u);
  const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
  if (!setClause) return res.status(400).json({ error: 'No data' });
  const values = [...Object.values(u), id];
  const r = await pool.query(`UPDATE products SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
  res.json(r.rows[0]);
});

// =============================================
// ORDERS (Page #5)
// =============================================

app.get('/api/orders', authenticateToken, async (req, res) => {
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
});

app.patch('/api/orders/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { status, assignedStaffId, assignedStaffName, notes } = req.body;
  const updates = []; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (assignedStaffId) { params.push(assignedStaffId); updates.push(`assigned_staff_id=$${params.length}`); }
  if (assignedStaffName) { params.push(assignedStaffName); updates.push(`assigned_staff_name=$${params.length}`); }
  if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);
  const r = await pool.query(`UPDATE orders SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
  logAudit(req.user.id, 'update_order', 'order', id, { status, assignedStaffId });
  res.json(r.rows[0]);
});

// =============================================
// REPAIRS (Page #6)
// =============================================

app.get('/api/repairs', authenticateToken, async (req, res) => {
  const { page=1, limit=20, status, search } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1'; const params = [];
  if (status) { params.push(status); where += ` AND status=$${params.length}`; }
  if (search) { params.push(`%${search}%`); where += ` AND (repair_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

  const [countR, dataR] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM repairs ${where}`, params),
    pool.query(
      `SELECT r.*, u.first_name||' '||u.last_name as technician_name FROM repairs r
       LEFT JOIN users u ON r.technician_id=u.id ${where} ORDER BY r.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, +limit, +offset]
    )
  ]);
  res.json({ repairs: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
});

app.post('/api/repairs', authenticateToken, async (req, res) => {
  const { customerName, customerEmail, customerPhone, deviceType, deviceBrand, deviceModel, deviceIssue } = req.body;
  const num = 'REP-' + Date.now();
  const r = await pool.query(
    'INSERT INTO repairs (repair_number, user_id, customer_name, customer_email, customer_phone, device_type, device_brand, device_model, device_issue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [num, req.user.id, customerName, customerEmail, customerPhone, deviceType, deviceBrand, deviceModel, deviceIssue]
  );
  res.status(201).json(r.rows[0]);
});

app.patch('/api/repairs/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { status, estimatedCost, finalCost, technicianId, quotationDetails, notes } = req.body;
  const updates = []; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (estimatedCost !== undefined) { params.push(estimatedCost); updates.push(`estimated_cost=$${params.length}`); }
  if (finalCost !== undefined) { params.push(finalCost); updates.push(`final_cost=$${params.length}`); }
  if (technicianId) { params.push(technicianId); updates.push(`technician_id=$${params.length}`); }
  if (quotationDetails) { params.push(JSON.stringify(quotationDetails)); updates.push(`quotation_details=$${params.length}`); }
  if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);
  const r = await pool.query(`UPDATE repairs SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
  logAudit(req.user.id, 'update_repair', 'repair', id, { status, estimatedCost, finalCost });
  res.json(r.rows[0]);
});

// =============================================
// PC BUILDS (Page #7 — YOUR IMAGE)
// =============================================

app.get('/api/pc-builds', authenticateToken, async (req, res) => {
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
});

app.post('/api/pc-builds', authenticateToken, async (req, res) => {
  const { customerName, customerEmail, customerPhone, title, description, useCase, budgetRange, components } = req.body;
  const num = 'BLD-' + Date.now();
  const r = await pool.query(
    'INSERT INTO pc_builds (build_number, user_id, customer_name, customer_email, customer_phone, title, description, use_case, budget_range, components) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [num, req.user.id, customerName, customerEmail, customerPhone, title, description, useCase, budgetRange, JSON.stringify(components || [])]
  );
  res.status(201).json(r.rows[0]);
});

// Update PC Build (quote, technician, progress, status — all in one)
app.patch('/api/pc-builds/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const u = req.body;

  // Dynamic update
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
      const val = key === 'progressSteps' || key === 'compatibilityChecks' || key === 'quotationItems' || key === 'components'
        ? JSON.stringify(u[key]) : u[key];
      params.push(val);
      updates.push(`${dbKey}=$${params.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);

  const r = await pool.query(`UPDATE pc_builds SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
  logAudit(req.user.id, 'update_pc_build', 'pc_build', id, u);
  res.json(r.rows[0]);
});

// =============================================
// ASSEMBLY (Page #8) — same pattern as PC Builds
// =============================================

app.get('/api/assemblies', authenticateToken, async (req, res) => {
  const r = await pool.query('SELECT * FROM assemblies ORDER BY created_at DESC LIMIT 100');
  res.json(r.rows);
});

app.post('/api/assemblies', authenticateToken, async (req, res) => {
  const { buildId, repairId, customerName, title, components, technicianId } = req.body;
  const num = 'ASM-' + Date.now();
  const r = await pool.query(
    'INSERT INTO assemblies (assembly_number, build_id, repair_id, user_id, customer_name, title, components, technician_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [num, buildId, repairId, req.user.id, customerName, title, JSON.stringify(components || []), technicianId]
  );
  res.status(201).json(r.rows[0]);
});

app.patch('/api/assemblies/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  const keys = Object.keys(u);
  const setClause = keys.map((k, i) => {
    const dbK = k === 'progressSteps' || k === 'components' ? `${k}=$${i+1}` : `${k.replace(/([A-Z])/g,'_$1').toLowerCase()}=$${i+1}`;
    return dbK;
  }).join(', ');
  if (!setClause) return res.status(400).json({ error: 'No updates' });
  const values = keys.map(k => (k === 'progressSteps' || k === 'components') ? JSON.stringify(u[k]) : u[k]);
  values.push(id);
  const r = await pool.query(`UPDATE assemblies SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
  res.json(r.rows[0]);
});

// =============================================
// UPGRADES (Page #9)
// =============================================

app.get('/api/upgrades', authenticateToken, async (req, res) => {
  const r = await pool.query('SELECT * FROM upgrades ORDER BY created_at DESC LIMIT 100');
  res.json(r.rows);
});

app.post('/api/upgrades', authenticateToken, async (req, res) => {
  const { customerName, customerEmail, customerPhone, deviceType, deviceModel, currentSpecs, upgradeItems } = req.body;
  const num = 'UPG-' + Date.now();
  const r = await pool.query(
    'INSERT INTO upgrades (upgrade_number, user_id, customer_name, customer_email, customer_phone, device_type, device_model, current_specs, upgrade_items) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [num, req.user.id, customerName, customerEmail, customerPhone, deviceType, deviceModel, JSON.stringify(currentSpecs || {}), JSON.stringify(upgradeItems || [])]
  );
  res.status(201).json(r.rows[0]);
});

app.patch('/api/upgrades/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { status, estimatedCost, finalCost, quotationNotes, technicianId, assignedStaffId, notes } = req.body;
  const updates = []; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (estimatedCost !== undefined) { params.push(estimatedCost); updates.push(`estimated_cost=$${params.length}`); }
  if (finalCost !== undefined) { params.push(finalCost); updates.push(`final_cost=$${params.length}`); }
  if (quotationNotes !== undefined) { params.push(quotationNotes); updates.push(`quotation_notes=$${params.length}`); }
  if (technicianId) { params.push(technicianId); updates.push(`technician_id=$${params.length}`); }
  if (assignedStaffId) { params.push(assignedStaffId); updates.push(`assigned_staff_id=$${params.length}`); }
  if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);
  const r = await pool.query(`UPDATE upgrades SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
  res.json(r.rows[0]);
});

// =============================================
// SOFTWARE SERVICES (Page #10)
// =============================================

app.get('/api/software-services', authenticateToken, async (req, res) => {
  const r = await pool.query('SELECT * FROM software_services ORDER BY created_at DESC LIMIT 100');
  res.json(r.rows);
});

app.post('/api/software-services', authenticateToken, async (req, res) => {
  const { customerName, customerEmail, customerPhone, softwareName, licenseType, deviceInfo } = req.body;
  const num = 'SOF-' + Date.now();
  const r = await pool.query(
    'INSERT INTO software_services (service_number, user_id, customer_name, customer_email, customer_phone, software_name, license_type, device_info) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [num, req.user.id, customerName, customerEmail, customerPhone, softwareName, licenseType, JSON.stringify(deviceInfo || {})]
  );
  res.status(201).json(r.rows[0]);
});

app.patch('/api/software-services/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { status, cost, licenseKey, activationDetails, technicianId, assignedStaffId, notes } = req.body;
  const updates = []; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (cost !== undefined) { params.push(cost); updates.push(`cost=$${params.length}`); }
  if (licenseKey !== undefined) { params.push(licenseKey); updates.push(`license_key=$${params.length}`); }
  if (activationDetails !== undefined) { params.push(JSON.stringify(activationDetails)); updates.push(`activation_details=$${params.length}`); }
  if (technicianId) { params.push(technicianId); updates.push(`technician_id=$${params.length}`); }
  if (assignedStaffId) { params.push(assignedStaffId); updates.push(`assigned_staff_id=$${params.length}`); }
  if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);
  const r = await pool.query(`UPDATE software_services SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
  res.json(r.rows[0]);
});

// =============================================
// RENTALS (Page #11)
// =============================================

app.get('/api/rentals', authenticateToken, async (req, res) => {
  const { page=1, limit=20, status } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1'; const params = [];
  if (status) { params.push(status); where += ` AND status=$${params.length}`; }

  const [countR, dataR] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM rentals ${where}`, params),
    pool.query(`SELECT * FROM rentals ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
  ]);
  res.json({ rentals: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
});

app.post('/api/rentals', authenticateToken, async (req, res) => {
  const { customerName, customerEmail, customerPhone, productId, productName, rentalStart, rentalEnd, rentalPrice, securityDeposit } = req.body;
  const num = 'RNT-' + Date.now();
  const r = await pool.query(
    'INSERT INTO rentals (rental_number, user_id, customer_name, customer_email, customer_phone, product_id, product_name, rental_start, rental_end, rental_price, security_deposit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
    [num, req.user.id, customerName, customerEmail, customerPhone, productId, productName, rentalStart, rentalEnd, rentalPrice, securityDeposit]
  );
  res.status(201).json(r.rows[0]);
});

app.patch('/api/rentals/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { status, actualReturnDate, depositReturned, conditionNotes, assignedStaffId, notes } = req.body;
  const updates = []; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (actualReturnDate) { params.push(actualReturnDate); updates.push(`actual_return_date=$${params.length}`); }
  if (depositReturned !== undefined) { params.push(depositReturned); updates.push(`deposit_returned=$${params.length}`); }
  if (conditionNotes !== undefined) { params.push(conditionNotes); updates.push(`condition_notes=$${params.length}`); }
  if (assignedStaffId) { params.push(assignedStaffId); updates.push(`assigned_staff_id=$${params.length}`); }
  if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);
  const r = await pool.query(`UPDATE rentals SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
  res.json(r.rows[0]);
});

// =============================================
// DELIVERIES (Page #12)
// =============================================

app.get('/api/deliveries', authenticateToken, async (req, res) => {
  const { page=1, limit=20, status } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1'; const params = [];
  if (status) { params.push(status); where += ` AND status=$${params.length}`; }

  const [countR, dataR] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM deliveries ${where}`, params),
    pool.query(`SELECT * FROM deliveries ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
  ]);
  res.json({ deliveries: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
});

app.post('/api/deliveries', authenticateToken, async (req, res) => {
  const { relatedType, relatedId, customerName, customerPhone, address, scheduledDate, scheduledTime } = req.body;
  const num = 'DEL-' + Date.now();
  const r = await pool.query(
    'INSERT INTO deliveries (delivery_number, related_type, related_id, customer_name, customer_phone, address, scheduled_date, scheduled_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [num, relatedType, relatedId, customerName, customerPhone, JSON.stringify(address), scheduledDate, scheduledTime]
  );
  res.status(201).json(r.rows[0]);
});

app.patch('/api/deliveries/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber, deliveryPartner, partnerContact, scheduledDate, scheduledTime, deliveredAt, proofImage, notes } = req.body;
  const updates = []; const params = [];
  ['status','trackingNumber','deliveryPartner','partnerContact','scheduledDate','scheduledTime','deliveredAt','proofImage','notes'].forEach(k => {
    if (req.body[k] !== undefined) {
      params.push(k === 'address' ? JSON.stringify(req.body[k]) : req.body[k]);
      updates.push(`${k.replace(/([A-Z])/g,'_$1').toLowerCase()}=$${params.length}`);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);
  const r = await pool.query(`UPDATE deliveries SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
  res.json(r.rows[0]);
});

// =============================================
// REMOTE SUPPORT (Page #13)
// =============================================

app.get('/api/support-tickets', authenticateToken, async (req, res) => {
  const { page=1, limit=20, status, priority } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1'; const params = [];
  if (status) { params.push(status); where += ` AND status=$${params.length}`; }
  if (priority) { params.push(priority); where += ` AND priority=$${params.length}`; }

  const [countR, dataR] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM support_tickets ${where}`, params),
    pool.query(`SELECT * FROM support_tickets ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
  ]);
  res.json({ tickets: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
});

app.post('/api/support-tickets', authenticateToken, async (req, res) => {
  const { customerName, customerEmail, customerPhone, subject, description, category, priority } = req.body;
  const num = 'TKT-' + Date.now();
  const r = await pool.query(
    'INSERT INTO support_tickets (ticket_number, user_id, customer_name, customer_email, customer_phone, subject, description, category, priority) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [num, req.user.id, customerName, customerEmail, customerPhone, subject, description, category, priority]
  );
  res.status(201).json(r.rows[0]);
});

app.patch('/api/support-tickets/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { status, priority, assignedStaffId, assignedStaffName, resolution, responses } = req.body;
  const updates = []; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (priority) { params.push(priority); updates.push(`priority=$${params.length}`); }
  if (assignedStaffId) { params.push(assignedStaffId); updates.push(`assigned_staff_id=$${params.length}`); }
  if (assignedStaffName) { params.push(assignedStaffName); updates.push(`assigned_staff_name=$${params.length}`); }
  if (resolution !== undefined) { params.push(resolution); updates.push(`resolution=$${params.length}`); }
  if (responses !== undefined) { params.push(JSON.stringify(responses)); updates.push(`responses=$${params.length}`); }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);
  const r = await pool.query(`UPDATE support_tickets SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
  res.json(r.rows[0]);
});

// =============================================
// SELL USED (Page #14)
// =============================================

app.get('/api/sell-used', authenticateToken, async (req, res) => {
  const { page=1, limit=20, status } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1'; const params = [];
  if (status) { params.push(status); where += ` AND status=$${params.length}`; }

  const [countR, dataR] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM sell_used ${where}`, params),
    pool.query(`SELECT * FROM sell_used ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
  ]);
  res.json({ requests: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
});

app.post('/api/sell-used', authenticateToken, async (req, res) => {
  const { customerName, customerEmail, customerPhone, productType, productBrand, productModel, conditionRating, conditionNotes, askingPrice, images } = req.body;
  const num = 'SEL-' + Date.now();
  const r = await pool.query(
    'INSERT INTO sell_used (request_number, user_id, customer_name, customer_email, customer_phone, product_type, product_brand, product_model, condition_rating, condition_notes, asking_price, images) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
    [num, req.user.id, customerName, customerEmail, customerPhone, productType, productBrand, productModel, conditionRating, conditionNotes, askingPrice, images || []]
  );
  res.status(201).json(r.rows[0]);
});

app.patch('/api/sell-used/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { status, valuationAmount, valuationNotes, offerAmount, offerAccepted, purchasedPrice, assignedStaffId, notes } = req.body;
  const updates = []; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (valuationAmount !== undefined) { params.push(valuationAmount); updates.push(`valuation_amount=$${params.length}`); }
  if (valuationNotes !== undefined) { params.push(valuationNotes); updates.push(`valuation_notes=$${params.length}`); }
  if (offerAmount !== undefined) { params.push(offerAmount); updates.push(`offer_amount=$${params.length}`); }
  if (offerAccepted !== undefined) { params.push(offerAccepted); updates.push(`offer_accepted=$${params.length}`); }
  if (purchasedPrice !== undefined) { params.push(purchasedPrice); updates.push(`purchased_price=$${params.length}`); }
  if (assignedStaffId) { params.push(assignedStaffId); updates.push(`assigned_staff_id=$${params.length}`); }
  if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);
  const r = await pool.query(`UPDATE sell_used SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
  res.json(r.rows[0]);
});

// =============================================
// STAFF MANAGEMENT (Page #15)
// =============================================

app.get('/api/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const r = await pool.query(
    `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.role, u.status, u.is_verified, u.avatar_url, u.created_at,
            sp.department, sp.employee_id, sp.hire_date, sp.is_active, sp.specialization
     FROM users u LEFT JOIN staff_profiles sp ON u.id=sp.user_id
     WHERE u.role IN ('staff','admin') ORDER BY u.created_at DESC`
  );
  res.json(r.rows);
});

app.post('/api/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { email, password, firstName, lastName, phone, department, employeeId } = req.body;
  const hash = await bcrypt.hash(password, 12);
  const [userR, profileR] = await Promise.all([
    pool.query('INSERT INTO users (email, phone, password_hash, first_name, last_name, role) VALUES ($1,$2,$3,$4,$5,\'staff\') RETURNING *', [email, phone, hash, firstName, lastName]),
    pool.query('INSERT INTO staff_profiles (user_id, department, employee_id) VALUES ($1,$2,$3) RETURNING *', [null, department, employeeId]) // will update after
  ]);
  await pool.query('INSERT INTO staff_profiles (user_id, department, employee_id) VALUES ($1,$2,$3)', [userR.rows[0].id, department, employeeId]);
  const finalR = await pool.query('SELECT u.*, sp.department, sp.employee_id FROM users u LEFT JOIN staff_profiles sp ON u.id=sp.user_id WHERE u.id=$1', [userR.rows[0].id]);
  res.status(201).json(finalR.rows[0]);
});

app.patch('/api/staff/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { status, isVerified, department, isActive } = req.body;
  const updates = []; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (isVerified !== undefined) { params.push(isVerified); updates.push(`is_verified=$${params.length}`); }
  if (updates.length) { params.push(id); await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id=$${params.length}`, params); }
  if (department !== undefined) await pool.query('UPDATE staff_profiles SET department=$1 WHERE user_id=$2', [department, id]);
  if (isActive !== undefined) await pool.query('UPDATE staff_profiles SET is_active=$1 WHERE user_id=$2', [isActive, id]);
  const r = await pool.query('SELECT u.*, sp.department, sp.employee_id FROM users u LEFT JOIN staff_profiles sp ON u.id=sp.user_id WHERE u.id=$1', [id]);
  res.json(r.rows[0]);
});

// =============================================
// CUSTOMERS (Page #16)
// =============================================

app.get('/api/customers', authenticateToken, async (req, res) => {
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
});

app.patch('/api/customers/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { status, isVerified } = req.body;
  const updates = []; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (isVerified !== undefined) { params.push(isVerified); updates.push(`is_verified=$${params.length}`); }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  params.push(id);
  const r = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id=$${params.length} AND role='customer' RETURNING id,email,first_name,last_name,status,is_verified`, params);
  res.json(r.rows[0]);
});

// =============================================
// SUPPLIERS (Page #17)
// =============================================

app.get('/api/suppliers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const r = await pool.query('SELECT * FROM suppliers ORDER BY name');
  res.json(r.rows);
});

app.post('/api/suppliers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, email, phone, address, city, state, pincode, gstNumber, contactPerson } = req.body;
  const r = await pool.query(
    'INSERT INTO suppliers (name, email, phone, address, city, state, pincode, gst_number, contact_person) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [name, email, phone, address, city, state, pincode, gstNumber, contactPerson]
  );
  res.status(201).json(r.rows[0]);
});

app.put('/api/suppliers/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params; const u = req.body;
  const keys = Object.keys(u);
  const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
  if (!setClause) return res.status(400).json({ error: 'No data' });
  const values = [...Object.values(u), id];
  const r = await pool.query(`UPDATE suppliers SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
  res.json(r.rows[0]);
});

// =============================================
// COUPONS (Page #18)
// =============================================

app.get('/api/coupons', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const r = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json(r.rows);
});

app.post('/api/coupons', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { code, name, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil } = req.body;
  const r = await pool.query(
    'INSERT INTO coupons (code, name, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [code, name, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil]
  );
  res.status(201).json(r.rows[0]);
});

app.put('/api/coupons/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params; const u = req.body;
  const keys = Object.keys(u);
  const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
  if (!setClause) return res.status(400).json({ error: 'No data' });
  const values = [...Object.values(u), id];
  const r = await pool.query(`UPDATE coupons SET ${setClause} WHERE id=$${values.length} RETURNING *`, values);
  res.json(r.rows[0]);
});

// =============================================
// GAMING HUB / OFFERS (Page #19)
// =============================================

app.get('/api/gaming-hub', authenticateToken, async (req, res) => {
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
});

app.post('/api/gaming-hub', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { title, description, content, contentType, imageUrl, tags, status, scheduledAt } = req.body;
  const slug = (title||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const r = await pool.query(
    'INSERT INTO gaming_hub (title, slug, description, content, content_type, image_url, tags, status, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [title, slug, description, content, contentType, imageUrl, tags || [], status, scheduledAt]
  );
  res.status(201).json(r.rows[0]);
});

app.put('/api/gaming-hub/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params; const u = req.body;
  const keys = Object.keys(u);
  const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
  if (!setClause) return res.status(400).json({ error: 'No data' });
  const values = [...Object.values(u), id];
  const r = await pool.query(`UPDATE gaming_hub SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
  res.json(r.rows[0]);
});

// =============================================
// FEATURED BUILDS (Homepage)
// =============================================

app.get('/api/featured-builds', async (req, res) => {
  const r = await pool.query('SELECT * FROM featured_builds WHERE is_published=TRUE ORDER BY sort_order');
  res.json(r.rows);
});

app.post('/api/featured-builds', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { title, description, useCase, budgetRange, components, totalPrice, imageUrl } = req.body;
  const slug = (title||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const r = await pool.query(
    'INSERT INTO featured_builds (title, slug, description, use_case, budget_range, components, total_price, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [title, slug, description, useCase, budgetRange, JSON.stringify(components || []), totalPrice, imageUrl]
  );
  res.status(201).json(r.rows[0]);
});

// =============================================
// NOTIFICATIONS
// =============================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const r = await pool.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(r.rows);
});

app.post('/api/notifications', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { userId, title, message, type, link } = req.body;
  const r = await pool.query(
    'INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [userId, title, message, type, link]
  );
  res.status(201).json(r.rows[0]);
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const r = await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.user.id]);
  res.json(r.rows[0]);
});

// =============================================
// AUDIT LOGS
// =============================================

app.get('/api/audit-logs', authenticateToken, authorizeRoles('admin'), async (req, res) => {
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
});

// =============================================
// HEALTH
// =============================================

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// =============================================
// ERROR HANDLING
// =============================================

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });
app.use('*', (req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log('DESKTO Backend running on port ' + PORT);
});
```

---

# ============================================
# STEP 3: DEPLOY & START
# ============================================

## 3.1 Create .env on EC2

```bash
sudo tee /home/ec2-user/backend/.env > /dev/null << 'ENVEOF'
NODE_ENV=production
PORT=3001
DB_HOST=deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=deskto_db
DB_USER=deskto_admin
DB_PASSWORD=<YOUR_PASSWORD_FROM_SSM>
JWT_SECRET=<YOUR_JWT_SECRET_FROM_SSM>
FRONTEND_URL=http://13.234.99.45
ENVEOF
```

## 3.2 Create Systemd Service

```bash
sudo tee /etc/systemd/system/deskto-backend.service > /dev/null << 'SVCEOF'
[Unit]
Description=DESKTO Backend
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
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable --now deskto-backend
sudo systemctl status deskto-backend
```

## 3.3 Open Port in Security Group

```bash
# Add port 3001 to EC2 security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-07b5c27ca04272c84 \
  --protocol tcp --port 3001 \
  --cidr 0.0.0.0/0 \
  --region ap-south-1
```

---

# ============================================
# STEP 4: TEST EVERYTHING
# ============================================

```bash
# Health check
curl http://localhost:3001/health
# → {"status":"ok"}

# Login as admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@deskto.com","password":"admin123"}'
# → {user: {...}, accessToken: "..."}

# Dashboard stats (use token from login)
curl http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer <TOKEN>"

# Get categories
curl http://localhost:3001/api/categories

# Get PC Builds
curl http://localhost:3001/api/pc-builds \
  -H "Authorization: Bearer <TOKEN>"

# Get Orders
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer <TOKEN>"
```

---

# ============================================
# COMPLETE API REFERENCE
# ============================================

## Auth
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
```

## Dashboard
```
GET /api/dashboard/stats
GET /api/dashboard/charts/orders-by-status
GET /api/dashboard/charts/revenue-trend
```

## Catalog (Pages 2-4)
```
GET/POST    /api/categories
PUT/DELETE  /api/categories/:id
GET/POST    /api/brands
PUT         /api/brands/:id
GET/POST    /api/products
PUT         /api/products/:id
```

## Operations (Pages 5-14)
```
GET/POST/PATCH  /api/orders        (Orders)
GET/POST/PATCH  /api/repairs       (Repairs)
GET/POST/PATCH  /api/pc-builds     (PC Builds)
GET/POST/PATCH  /api/assemblies    (Assembly)
GET/POST/PATCH  /api/upgrades      (Upgrades)
GET/POST/PATCH  /api/software-services  (Software)
GET/POST/PATCH  /api/rentals       (Rentals)
GET/POST/PATCH  /api/deliveries    (Deliveries)
GET/POST/PATCH  /api/support-tickets  (Remote Support)
GET/POST/PATCH  /api/sell-used     (Sell Used)
```

## People (Pages 15-16)
```
GET/POST/PATCH  /api/staff
GET/PATCH       /api/customers
```

## Others
```
GET/POST/PUT    /api/suppliers
GET/POST/PUT    /api/coupons
GET/POST/PUT    /api/gaming-hub
GET/POST        /api/featured-builds
GET/POST        /api/notifications
GET             /api/audit-logs
```

---

# ============================================
# DEFAULT CREDENTIALS
# ============================================

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@deskto.com | admin123 |
| Staff (Sales) | sales@deskto.com | admin123 |
| Staff (Technical) | tech@deskto.com | admin123 |
| Staff (Support) | support@deskto.com | admin123 |
| Customer | test4@gmail.com | admin123 |
| Customer | demo@deskto.in | admin123 |

---

# ============================================
# YOUR 3-STEP CHECKLIST
# ============================================

```
[ ] STEP 1: Connect to RDS, run the SQL schema (copy the block above)
[ ] STEP 2: Create backend/index.js on EC2, set up .env, start systemd service
[ ] STEP 3: curl http://localhost:3001/health → {"status":"ok"} ✅
```

Login to admin dashboard with: **admin@deskto.com / admin123**
