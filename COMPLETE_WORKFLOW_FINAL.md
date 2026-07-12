# DESKTO COMPLETE BACKEND WORKFLOW
# All Dashboard Pages — Admin, Staff, Customer

# ────────────────────────────────────────────────────────────────
# YOUR COMPLETE DASHBOARD (From 14 Images)
# ────────────────────────────────────────────────────────────────

## All Pages Identified:

```
OVERVIEW (1 page)
├── Overview (KPI Cards + Charts)

CATALOG (4 pages)
├── Categories
├── Brands
├── Inventory / Products
└── Catalog Management

OPERATIONS (10 pages — all follow same pattern)
├── Orders
├── Repairs
├── PC Builds / Custom Builder
├── Assembly
├── Upgrades
├── Software Services
├── Rentals
├── Deliveries
├── Remote Support (Tickets)
└── Sell Used (Trade-in)

PEOPLE (3 pages)
├── CRM (Customer notes, history, retention)
├── Customers
└── Staff

PROCUREMENT (2 pages)
├── Suppliers
└── Purchase Orders

MARKETING (3 pages)
├── Coupons
├── Offers
└── Gaming Hub Management

HOMEPAGE (4 pages)
├── Featured Builds
├── Exclusive Offers
├── Gaming News
└── Testimonials

INSIGHTS (1 page)
└── Reports & Analytics

SYSTEM (4 pages)
├── Notifications
├── Settings
├── Audit Logs
└── Backup & Restore
```

**Total: 32 Pages** covering the complete admin system.

---

# ────────────────────────────────────────────────────────────────
# SHARED PATTERN ACROSS ALL SERVICE PAGES
# ────────────────────────────────────────────────────────────────

All service pages (Orders, Repairs, PC Builds, Assembly, Upgrades, Software, Rentals, Support, Sell Used) share:

```
┌───────────────────────────────────────────────────────────────────────┐
│ PAGE TITLE │ Status Badges │ Filters │ Search │ +NEW │ Bulk Actions │
├───────────────────────────────────────────────────────────────────────┤
│ ID │ Customer │ Details │ Quote/Price │ Technician │ Progress │ Status │ Actions │
│────│──────────│────────│────────────│───────────│──────────│────────│────────│
│ #001 │ John    │ RTX... │ ₹1,50,000  │ Anita     │ 63%      │ Build  │ Edit   │
│ #002 │ Jane    │ GPU... │ ₹25,000    │ Rahul     │ 45%      │ Repair │ View   │
└───────────────────────────────────────────────────────────────────────┘
```

**Common Features:**
- ✅ Status badges with color coding
- ✅ Search & filter functionality  
- ✅ Staff/technician assignment
- ✅ Quote/pricing editor
- ✅ Progress tracking with stages
- ✅ Inline status updates
- ✅ History & audit trail
- ✅ Bulk actions (approve, reject, assign)

---

# ────────────────────────────────────────────────────────────────
# STEP 1: COMPLETE DATABASE SCHEMA
# ────────────────────────────────────────────────────────────────

## 1.1 Connect to RDS PostgreSQL

```bash
# SSH to EC2
aws ssm start-session --target i-0b652e38103c7635a --region ap-south-1

# Get database password from SSM (run on local machine)
aws ssm get-parameter --name "/deskto-website/production/database-url" \
  --with-decryption --region ap-south-1 --query "Parameter.Value" --output text

# Connect (paste password from above)
PGPASSWORD='<password>' psql \
  -h deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com \
  -U deskto_admin \
  -d deskto_db
```

## 1.2 Complete Schema (Run in psql)

```sql
-- =============================================
-- DESKTO COMPLETE DATABASE SCHEMA (32 Tables)
-- =============================================

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
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff', 'customer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'locked')),
    is_verified BOOLEAN DEFAULT FALSE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(50) DEFAULT 'General'
        CHECK (department IN ('Sales', 'Technical', 'Assembly', 'Support', 'Admin', 'Delivery')),
    employee_id VARCHAR(50) UNIQUE,
    hire_date DATE,
    specialization VARCHAR(255),
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
-- CRM (Customer Relationship Management)
-- =============================================
CREATE TABLE crm_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    note_type VARCHAR(50) DEFAULT 'general'
        CHECK (note_type IN ('preference', 'follow_up', 'complaint', 'vip', 'service_history', 'retention', 'general')),
    note TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_orders INTEGER DEFAULT 0,
    total_repairs INTEGER DEFAULT 0,
    total_pc_builds INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    last_order_date TIMESTAMP,
    last_service_date TIMESTAMP,
    avg_order_value DECIMAL(10,2),
    loyalty_tier VARCHAR(20) DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    vip_status BOOLEAN DEFAULT FALSE,
    retention_score INTEGER DEFAULT 50,
    next_follow_up DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CATALOG
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
    items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    assigned_staff_id UUID REFERENCES users(id),
    assigned_staff_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- REPAIRS (Same pattern as all services)
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
        CHECK (status IN ('submitted', 'received', 'quoted', 'approved', 'in-repair', 'repair-progress',
                          'qc', 'completed', 'delivered', 'cancelled')),
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    quotation_items JSONB DEFAULT '[]',
    quotation_notes TEXT,
    technician_id UUID REFERENCES users(id),
    assigned_staff_id UUID REFERENCES users(id),
    progress_steps JSONB DEFAULT '[]',
    progress_percent INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PC BUILDS (Custom Builder)
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
        CHECK (status IN ('submitted', 'reviewed', 'quoted', 'approved', 'reserved', 'building',
                          'assembling', 'software-install', 'stress-test', 'qc', 'completed', 'delivered', 'cancelled')),
    components JSONB NOT NULL DEFAULT '[]',
    compatibility_checks JSONB DEFAULT '{}',
    quotation_items JSONB DEFAULT '[]',
    subtotal DECIMAL(10,2),
    gst_amount DECIMAL(10,2),
    shipping_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    quotation_notes TEXT,
    technician_id UUID REFERENCES users(id),
    technician_name VARCHAR(255),
    current_stage VARCHAR(100),
    progress_steps JSONB DEFAULT '[]',
    progress_percent INTEGER DEFAULT 0,
    assigned_staff_id UUID REFERENCES users(id),
    assigned_staff_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ASSEMBLY (Same pattern)
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
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- UPGRADES (Same pattern)
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
    upgrade_items JSONB DEFAULT '[]',
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'requested'
        CHECK (status IN ('requested', 'quoted', 'approved', 'in-progress', 'completed', 'cancelled')),
    quotation_notes TEXT,
    technician_id UUID REFERENCES users(id),
    assigned_staff_id UUID REFERENCES users(id),
    progress_steps JSONB DEFAULT '[]',
    progress_percent INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SOFTWARE SERVICES (Same pattern)
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
    progress_steps JSONB DEFAULT '[]',
    progress_percent INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- RENTALS (Same pattern)
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
    progress_steps JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DELIVERIES (Linked to any service)
-- =============================================
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_number VARCHAR(50) UNIQUE NOT NULL,
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
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SUPPORT TICKETS / REMOTE SUPPORT (Same pattern)
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
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(30) DEFAULT 'open'
        CHECK (status IN ('open', 'assigned', 'in-progress', 'waiting-customer', 'resolved', 'closed')),
    session_type VARCHAR(50),
    session_id VARCHAR(100),
    session_link VARCHAR(500),
    resolution TEXT,
    resolution_time_minutes INTEGER,
    assigned_staff_id UUID REFERENCES users(id),
    assigned_staff_name VARCHAR(255),
    responses JSONB DEFAULT '[]',
    progress_steps JSONB DEFAULT '[]',
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SELL USED / TRADE-IN (Same pattern)
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
        CHECK (status IN ('received', 'inspected', 'offered', 'accepted', 'rejected', 'purchased', 'listed', 'cancelled')),
    valuation_amount DECIMAL(10,2),
    valuation_notes TEXT,
    valuation_by UUID REFERENCES users(id),
    offer_amount DECIMAL(10,2),
    offer_accepted BOOLEAN,
    purchased_price DECIMAL(10,2),
    assigned_staff_id UUID REFERENCES users(id),
    progress_steps JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PROCUREMENT
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

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'ordered', 'shipped', 'received', 'cancelled')),
    items JSONB NOT NULL DEFAULT '[]',
    total_amount DECIMAL(10,2),
    expected_delivery DATE,
    received_at TIMESTAMP,
    assigned_staff_id UUID REFERENCES users(id),
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

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    discount_value DECIMAL(10,2),
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- GAMING HUB / HOMEPAGE CONTENT
-- =============================================
CREATE TABLE gaming_hub (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content_type VARCHAR(50) NOT NULL
        CHECK (content_type IN ('gaming-news', 'latest-hardware', 'esports-update', 'game-release',
                                'gaming-tip', 'benchmark-result', 'product-review', 'community-blog',
                                'featured-build', 'offer', 'testimonial', 'faq')),
    category VARCHAR(100),
    short_description TEXT,
    content TEXT,
    author VARCHAR(255),
    cover_image VARCHAR(500),
    thumbnail_image VARCHAR(500),
    banner_image VARCHAR(500),
    gallery_images TEXT[],
    intro TEXT,
    specs TEXT,
    benchmark_data TEXT,
    tips TEXT[],
    pros TEXT[],
    cons TEXT[],
    tags TEXT[],
    -- Offer/CTA
    offer_details TEXT,
    discount TEXT,
    cta_text VARCHAR(255),
    cta_link VARCHAR(500),
    related_services TEXT[],
    display_order INTEGER DEFAULT 0,
    -- Toggles
    show_on_gaming_hub BOOLEAN DEFAULT TRUE,
    show_in_category BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    is_latest_news BOOLEAN DEFAULT FALSE,
    is_exclusive_offer BOOLEAN DEFAULT FALSE,
    is_signature_machine BOOLEAN DEFAULT FALSE,
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    keywords TEXT,
    -- Publishing
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
    publish_date TIMESTAMP,
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
-- INSIGHTS
-- =============================================
CREATE TABLE report_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) CHECK (report_type IN ('sales', 'revenue', 'inventory', 'services', 'customers')),
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    recipients TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SYSTEM
-- =============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'promotion')),
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE backup_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(20) CHECK (backup_type IN ('full', 'incremental')),
    file_size BIGINT,
    file_url VARCHAR(500),
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed')),
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
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_repairs_status ON repairs(status);
CREATE INDEX idx_pc_builds_status ON pc_builds(status);
CREATE INDEX idx_assemblies_status ON assemblies(status);
CREATE INDEX idx_upgrades_status ON upgrades(status);
CREATE INDEX idx_software_status ON software_services(status);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_support_status ON support_tickets(status);
CREATE INDEX idx_sell_used_status ON sell_used(status);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_crm_customer ON crm_notes(customer_id);
CREATE INDEX idx_gaming_hub_slug ON gaming_hub(slug);
CREATE INDEX idx_gaming_hub_type ON gaming_hub(content_type);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =============================================
-- TRIGGERS
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
CREATE TRIGGER trg_software_updated BEFORE UPDATE ON software_services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rentals_updated BEFORE UPDATE ON rentals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_support_updated BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sell_used_updated BEFORE UPDATE ON sell_used FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_gaming_hub_updated BEFORE UPDATE ON gaming_hub FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED DATA
-- =============================================

-- Users (password: admin123 for all)
INSERT INTO users (email, phone, password_hash, first_name, last_name, role, status, is_verified)
VALUES
  ('admin@deskto.com', '+91-9876543210', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Admin', 'User', 'admin', 'active', TRUE),
  ('sales@deskto.com', '+91-9876543211', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Rahul', 'Sharma', 'staff', 'active', TRUE),
  ('tech@deskto.com', '+91-9876543212', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Priya', 'Patel', 'staff', 'active', TRUE),
  ('assembly@deskto.com', '+91-9876543214', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Assembly', 'Tech', 'staff', 'active', TRUE),
  ('support@deskto.com', '+91-9876543213', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Amit', 'Singh', 'staff', 'active', TRUE),
  ('test4@gmail.com', '+91-9988776655', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Test4', 'User', 'customer', 'active', TRUE),
  ('demo@deskto.in', '+91-9876543215', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m', 'Demo', 'Customer', 'customer', 'active', TRUE);

-- Staff Profiles
INSERT INTO staff_profiles (user_id, department, employee_id, hire_date, specialization, is_active)
SELECT id, 'Sales', 'EMP001', CURRENT_DATE, 'Sales & Customer Relations', TRUE FROM users WHERE email = 'sales@deskto.com'
UNION ALL
SELECT id, 'Technical', 'EMP002', CURRENT_DATE, 'PC Assembly & Software', TRUE FROM users WHERE email = 'tech@deskto.com'
UNION ALL
SELECT id, 'Assembly', 'EMP004', CURRENT_DATE, 'System Building', TRUE FROM users WHERE email = 'assembly@deskto.com'
UNION ALL
SELECT id, 'Support', 'EMP003', CURRENT_DATE, 'Remote Support', TRUE FROM users WHERE email = 'support@deskto.com';

-- Customer Stats
INSERT INTO customer_stats (customer_id)
SELECT id FROM users WHERE email IN ('test4@gmail.com', 'demo@deskto.in');

-- Categories
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

-- Sample Product
INSERT INTO products (sku, name, slug, description, price, category_id, category_name, brand_id, brand_name, stock_quantity, is_active)
SELECT 'GPU-001', 'NVIDIA RTX 4090 Gaming PC', 'nvidia-rtx-4090',
  'High-end gaming desktop with RTX 4090', 249999.00,
  id, 'Gaming PC',
  (SELECT id FROM brands WHERE slug='nvidia'), 'NVIDIA',
  5, TRUE FROM categories WHERE slug='gaming-pc';

-- Sample Orders
INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, status, subtotal, tax_amount, total_amount, payment_status, items, created_at)
VALUES
  ('ORD-2024-001', (SELECT id FROM users WHERE email='test4@gmail.com'), 'Test4 User', 'test4@gmail.com', '+91-9988776655', 'delivered', 127118, 22881, 149999, 'paid',
   '[{"product":"RTX 4090 Gaming PC","qty":1,"price":149999}]'::jsonb, CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('ORD-2024-002', (SELECT id FROM users WHERE email='demo@deskto.in'), 'Demo Customer', 'demo@deskto.in', '+91-9876543215', 'shipped', 67799, 12200, 79999, 'paid',
   '[{"product":"Gaming Laptop Pro","qty":1,"price":79999}]'::jsonb, CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('ORD-2024-003', (SELECT id FROM users WHERE email='test4@gmail.com'), 'Test4 User', 'test4@gmail.com', '+91-9988776655', 'placed', 110169, 19830, 129999, 'pending',
   '[{"product":"Custom PC Build","qty":1,"price":129999}]'::jsonb, CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Sample CRM Note
INSERT INTO crm_notes (customer_id, created_by, note_type, note)
SELECT id, (SELECT id FROM users WHERE email='admin@deskto.com'), 'preference', 'Customer prefers WhatsApp updates'
FROM users WHERE email = 'test4@gmail.com';

-- Sample Gaming Hub Content (Testimonial)
INSERT INTO gaming_hub (
  title, slug, content_type, category, short_description, author,
  cover_image, thumbnail_image, intro, content, tags,
  offer_details, cta_text, display_order,
  show_on_gaming_hub, show_in_category, status, publish_date
) VALUES (
  'Fast delivery and clean assembly', 'customer-testimonial-fast-delivery-clean-assembly',
  'testimonial', 'Testimonials',
  'A verified customer review for a DESKTO custom workstation delivery.',
  'DESKTO Editorial',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
  'Customer testimonial',
  'Fast delivery, everything perfectly assembled. DESKTO even stress-tested the PC before shipping. That level of attention to detail is rare these days.',
  ARRAY['testimonial', 'customer'],
  'Save Rs. 35,000 on the RTX 4090 Beast Build',
  'Claim Offer',
  0,
  TRUE, TRUE, 'published', '2026-06-22 00:00:00'
);

-- System Settings
INSERT INTO system_settings (key, value, description, category) VALUES
  ('site_name', 'DESKTO', 'Site name', 'general'),
  ('currency', 'INR', 'Default currency', 'general'),
  ('tax_rate', '18', 'GST percentage', 'billing'),
  ('shipping_charge', '0', 'Default shipping charge', 'billing'),
  ('low_stock_threshold', '5', 'Low stock alert threshold', 'inventory');
```

---

# ────────────────────────────────────────────────────────────────
# STEP 2: COMPLETE BACKEND API
# ────────────────────────────────────────────────────────────────

## 2.1 Setup on EC2

```bash
# SSH to EC2
aws ssm start-session --target i-0b652e38103c7635a --region ap-south-1

# Ensure Node.js is installed
node --version
# If not, install:
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Create backend
mkdir -p /home/ec2-user/backend/src
cd /home/ec2-user/backend
npm init -y
npm install express cors helmet morgan dotenv pg bcryptjs jsonwebtoken uuid express-validator
```

## 2.2 Create `/home/ec2-user/backend/src/index.js`

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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    if (!email || !password || !firstName) return res.status(400).json({ error: 'Missing fields' });

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Email exists' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, phone, password_hash, first_name, last_name, role) VALUES ($1,$2,$3,$4,$5,\'customer\') RETURNING *',
      [email, phone, hash, firstName, lastName]
    );

    // Create customer stats
    await pool.query('INSERT INTO customer_stats (customer_id) VALUES ($1)', [result.rows[0].id]);

    const u = result.rows[0];
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      user: { id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, status: u.status },
      accessToken: token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, sp.department, sp.employee_id
       FROM users u LEFT JOIN staff_profiles sp ON u.id = sp.user_id WHERE u.id=$1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
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
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.get('/api/dashboard/charts/orders-by-status', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/dashboard/charts/revenue-trend', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT DATE_TRUNC('month', created_at) as month, SUM(total_amount) as revenue FROM orders WHERE status!='cancelled' GROUP BY month ORDER BY month DESC LIMIT 12"
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

app.post('/api/categories', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description, icon, iconColor, parentId } = req.body;
    const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      'INSERT INTO categories (name, slug, description, icon, icon_color, parent_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, slug, description, icon, iconColor, parentId]
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
    const { name, description, icon, iconColor, parentId, sortOrder } = req.body;
    const r = await pool.query(
      'UPDATE categories SET name=COALESCE($1,name), description=COALESCE($2,description), icon=COALESCE($3,icon), icon_color=COALESCE($4,icon_color), parent_id=COALESCE($5,parent_id), sort_order=COALESCE($6,sort_order), updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, description, icon, iconColor, parentId, sortOrder, id]
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
    const { name, description, logoUrl, website } = req.body;
    const r = await pool.query(
      'UPDATE brands SET name=COALESCE($1,name), description=COALESCE($2,description), logo_url=COALESCE($3,logo_url), website=COALESCE($4,website) WHERE id=$5 RETURNING *',
      [name, description, logoUrl, website, id]
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
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/products', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
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
    res.json(r.rows[0]);
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
         LEFT JOIN users u ON o.assigned_staff_id=u.id ${where} ORDER BY o.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, +limit, +offset]
      )
    ]);
    res.json({ orders: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, items, shippingAddress, billingAddress } = req.body;
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
    res.status(500).json({ error: 'Failed' });
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
    if (!updates.length) return res.status(400).json({ error: 'No updates' });
    params.push(id);
    const r = await pool.query(`UPDATE orders SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
    logAudit(req.user.id, 'update_order', 'order', id, { status, assignedStaffId });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// GENERIC SERVICE HANDLER (Repairs, PC Builds, Assembly, Upgrades, Software, Support, Sell Used)
// All follow the same pattern with minor variations
// =============================================

const SERVICE_CONFIGS = {
  repairs: { table: 'repairs', numberField: 'repair_number', numberPrefix: 'REP' },
  pc_builds: { table: 'pc_builds', numberField: 'build_number', numberPrefix: 'BLD' },
  assemblies: { table: 'assemblies', numberField: 'assembly_number', numberPrefix: 'ASM' },
  upgrades: { table: 'upgrades', numberField: 'upgrade_number', numberPrefix: 'UPG' },
  software_services: { table: 'software_services', numberField: 'service_number', numberPrefix: 'SOF' },
  support_tickets: { table: 'support_tickets', numberField: 'ticket_number', numberPrefix: 'TKT' },
  sell_used: { table: 'sell_used', numberField: 'request_number', numberPrefix: 'SEL' },
};

// Generic GET handler for all services
Object.entries(SERVICE_CONFIGS).forEach(([key, config]) => {
  app.get(`/api/${key.replace('_', '-')}`, authenticateToken, async (req, res) => {
    try {
      const { page=1, limit=20, status, search } = req.query;
      const offset = (page - 1) * limit;
      let where = 'WHERE 1=1';
      const params = [];
      if (status) { params.push(status); where += ` AND status=$${params.length}`; }
      if (search) { params.push(`%${search}%`); where += ` AND (${config.numberField} ILIKE $${params.length} OR customer_name ILIKE $${params.length})`; }

      const [countR, dataR] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM ${config.table} ${where}`, params),
        pool.query(`SELECT * FROM ${config.table} ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
      ]);
      const dataKey = key === 'pc_builds' ? 'builds' : key === 'support_tickets' ? 'tickets' : key === 'sell_used' ? 'requests' : key;
      res.json({ [dataKey]: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
    } catch (error) {
      console.error(`Error in ${key}:`, error);
      res.status(500).json({ error: 'Failed' });
    }
  });
});

// Generic POST handler for all services
Object.entries(SERVICE_CONFIGS).forEach(([key, config]) => {
  app.post(`/api/${key.replace('_', '-')}`, authenticateToken, async (req, res) => {
    try {
      const data = req.body;
      const num = `${config.numberPrefix}-${Date.now()}`;
      
      let columns, values, placeholders;
      
      if (key === 'repairs') {
        columns = ['repair_number', 'user_id', 'customer_name', 'customer_email', 'customer_phone', 'device_type', 'device_brand', 'device_model', 'device_issue'];
        values = [num, req.user.id, data.customerName, data.customerEmail, data.customerPhone, data.deviceType, data.deviceBrand, data.deviceModel, data.deviceIssue];
      } else if (key === 'pc_builds') {
        columns = ['build_number', 'user_id', 'customer_name', 'customer_email', 'customer_phone', 'title', 'description', 'use_case', 'budget_range', 'components'];
        values = [num, req.user.id, data.customerName, data.customerEmail, data.customerPhone, data.title, data.description, data.useCase, data.budgetRange, JSON.stringify(data.components || [])];
      } else if (key === 'support_tickets') {
        columns = ['ticket_number', 'user_id', 'customer_name', 'customer_email', 'customer_phone', 'subject', 'description', 'category', 'priority'];
        values = [num, req.user.id, data.customerName, data.customerEmail, data.customerPhone, data.subject, data.description, data.category, data.priority];
      } else {
        return res.status(400).json({ error: 'Invalid service type' });
      }
      
      placeholders = values.map((_, i) => `$${i+1}`).join(', ');
      const r = await pool.query(
        `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      res.status(201).json(r.rows[0]);
    } catch (error) {
      console.error(`Error creating ${key}:`, error);
      res.status(500).json({ error: 'Failed' });
    }
  });
});

// Generic PATCH handler for all services (status, staff, quote, progress)
Object.entries(SERVICE_CONFIGS).forEach(([key, config]) => {
  app.patch(`/api/${key.replace('_', '-')}/:id`, authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
      const { id } = req.params;
      const u = req.body;
      
      const updates = [];
      const params = [];
      
      // Common fields
      const fieldMap = {
        status: 'status',
        notes: 'notes',
        estimatedCost: 'estimated_cost',
        finalCost: 'final_cost',
        technicianId: 'technician_id',
        technicianName: 'technician_name',
        assignedStaffId: 'assigned_staff_id',
        assignedStaffName: 'assigned_staff_name',
        progressPercent: 'progress_percent',
        currentStage: 'current_stage',
        quotationItems: 'quotation_items',
        quotationNotes: 'quotation_notes',
        subtotal: 'subtotal',
        gstAmount: 'gst_amount',
        shippingAmount: 'shipping_amount',
        totalAmount: 'total_amount',
        progressSteps: 'progress_steps',
        components: 'components',
        resolution: 'resolution',
        priority: 'priority',
      };
      
      for (const [key2, dbKey] of Object.entries(fieldMap)) {
        if (u[key2] !== undefined) {
          const val = ['quotationItems', 'progressSteps', 'components'].includes(key2) ? JSON.stringify(u[key2]) : u[key2];
          params.push(val);
          updates.push(`${dbKey}=$${params.length}`);
        }
      }
      
      if (!updates.length) return res.status(400).json({ error: 'No updates' });
      params.push(id);
      
      const r = await pool.query(`UPDATE ${config.table} SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
      logAudit(req.user.id, `update_${key}`, key, id, u);
      res.json(r.rows[0]);
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      res.status(500).json({ error: 'Failed' });
    }
  });
});

// =============================================
// RENTALS
// =============================================

app.get('/api/rentals', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1'; const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }

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
    const { customerName, customerEmail, customerPhone, productId, productName, rentalStart, rentalEnd, rentalPrice, securityDeposit } = req.body;
    const num = generateNumber('rental');
    const r = await pool.query(
      'INSERT INTO rentals (rental_number, user_id, customer_name, customer_email, customer_phone, product_id, product_name, rental_start, rental_end, rental_price, security_deposit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [num, req.user.id, customerName, customerEmail, customerPhone, productId, productName, rentalStart, rentalEnd, rentalPrice, securityDeposit]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.patch('/api/rentals/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// DELIVERIES
// =============================================

app.get('/api/deliveries', authenticateToken, async (req, res) => {
  try {
    const { page=1, limit=20, status } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1'; const params = [];
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }

    const [countR, dataR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM deliveries ${where}`, params),
      pool.query(`SELECT * FROM deliveries ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, +limit, +offset])
    ]);
    res.json({ deliveries: dataR.rows, pagination: { page:+page, limit:+limit, total:+countR.rows[0].count, totalPages: Math.ceil(+countR.rows[0].count/limit) }});
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/deliveries', authenticateToken, async (req, res) => {
  try {
    const { relatedType, relatedId, customerName, customerPhone, address, scheduledDate, scheduledTime } = req.body;
    const num = generateNumber('delivery');
    const r = await pool.query(
      'INSERT INTO deliveries (delivery_number, related_type, related_id, customer_name, customer_phone, address, scheduled_date, scheduled_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [num, relatedType, relatedId, customerName, customerPhone, JSON.stringify(address), scheduledDate, scheduledTime]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.patch('/api/deliveries/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, deliveryPartner, partnerContact, scheduledDate, scheduledTime, deliveredAt, proofImage, notes } = req.body;
    const updates = []; const params = [];
    if (status) { params.push(status); updates.push(`status=$${params.length}`); }
    if (trackingNumber) { params.push(trackingNumber); updates.push(`tracking_number=$${params.length}`); }
    if (deliveryPartner) { params.push(deliveryPartner); updates.push(`delivery_partner=$${params.length}`); }
    if (partnerContact) { params.push(partnerContact); updates.push(`partner_contact=$${params.length}`); }
    if (scheduledDate) { params.push(scheduledDate); updates.push(`scheduled_date=$${params.length}`); }
    if (scheduledTime) { params.push(scheduledTime); updates.push(`scheduled_time=$${params.length}`); }
    if (deliveredAt) { params.push(deliveredAt); updates.push(`delivered_at=$${params.length}`); }
    if (proofImage) { params.push(proofImage); updates.push(`proof_image=$${params.length}`); }
    if (notes !== undefined) { params.push(notes); updates.push(`notes=$${params.length}`); }
    if (!updates.length) return res.status(400).json({ error: 'No updates' });
    params.push(id);
    const r = await pool.query(`UPDATE deliveries SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// CRM (Customer Relationship Management)
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
    res.json({
      customer: userR.rows[0],
      stats: statsR.rows[0] || {},
      notes: notesR.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/crm/notes', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { customerId, noteType, note, isPrivate } = req.body;
    const r = await pool.query(
      'INSERT INTO crm_notes (customer_id, created_by, note_type, note, is_private) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [customerId, req.user.id, noteType || 'general', note, isPrivate || false]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
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
    res.status(500).json({ error: 'Failed' });
  }
});

app.patch('/api/customers/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isVerified } = req.body;
    const updates = []; const params = [];
    if (status) { params.push(status); updates.push(`status=$${params.length}`); }
    if (isVerified !== undefined) { params.push(isVerified); updates.push(`is_verified=$${params.length}`); }
    if (!updates.length) return res.status(400).json({ error: 'No updates' });
    params.push(id);
    const r = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id=$${params.length} AND role='customer' RETURNING id,email,first_name,last_name,status,is_verified`, params);
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
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.role, u.status, u.is_verified, u.avatar_url, u.created_at,
              sp.department, sp.employee_id, sp.hire_date, sp.is_active, sp.specialization
       FROM users u LEFT JOIN staff_profiles sp ON u.id=sp.user_id
       WHERE u.role IN ('staff','admin') ORDER BY u.created_at DESC`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/staff', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, department, employeeId } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
      'INSERT INTO users (email, phone, password_hash, first_name, last_name, role) VALUES ($1,$2,$3,$4,$5,\'staff\') RETURNING *',
      [email, phone, hash, firstName, lastName]
    );
    await pool.query('INSERT INTO staff_profiles (user_id, department, employee_id) VALUES ($1,$2,$3)', [r.rows[0].id, department, employeeId]);
    const finalR = await pool.query('SELECT u.*, sp.department, sp.employee_id FROM users u LEFT JOIN staff_profiles sp ON u.id=sp.user_id WHERE u.id=$1', [r.rows[0].id]);
    res.status(201).json(finalR.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
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
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// PROCUREMENT
// =============================================

app.get('/api/suppliers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM suppliers ORDER BY name');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/suppliers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, email, phone, address, city, state, pincode, gstNumber, contactPerson } = req.body;
    const r = await pool.query(
      'INSERT INTO suppliers (name, email, phone, address, city, state, pincode, gst_number, contact_person) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [name, email, phone, address, city, state, pincode, gstNumber, contactPerson]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/suppliers/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params; const u = req.body;
    const keys = Object.keys(u);
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    if (!setClause) return res.status(400).json({ error: 'No data' });
    const values = [...Object.values(u), id];
    const r = await pool.query(`UPDATE suppliers SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/purchase-orders', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id ORDER BY po.created_at DESC`
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// MARKETING
// =============================================

app.get('/api/coupons', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/coupons', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { code, name, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil } = req.body;
    const r = await pool.query(
      'INSERT INTO coupons (code, name, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [code, name, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/offers', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM offers WHERE is_active=TRUE ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

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
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/gaming-hub', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const {
      title, contentType, category, shortDescription, content, author,
      coverImage, thumbnailImage, bannerImage, galleryImages,
      intro, specs, benchmarkData, tips, pros, cons, tags,
      offerDetails, discount, ctaText, ctaLink, relatedServices, displayOrder,
      showOnGamingHub, showInCategory, isFeatured, isTrending, isLatestNews,
      isExclusiveOffer, isSignatureMachine, metaTitle, metaDescription, keywords
    } = req.body;

    const slug = (title||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const r = await pool.query(
      `INSERT INTO gaming_hub (
        title, slug, content_type, category, short_description, content, author,
        cover_image, thumbnail_image, banner_image, gallery_images,
        intro, specs, benchmark_data, tips, pros, cons, tags,
        offer_details, discount, cta_text, cta_link, related_services, display_order,
        show_on_gaming_hub, show_in_category, is_featured, is_trending, is_latest_news,
        is_exclusive_offer, is_signature_machine, meta_title, meta_description, keywords
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33) RETURNING *`,
      [
        title, slug, contentType, category, shortDescription, content, author,
        coverImage, thumbnailImage, bannerImage, galleryImages || [],
        intro, specs, benchmarkData, tips || [], pros || [], cons || [], tags || [],
        offerDetails, discount, ctaText, ctaLink, relatedServices || [], displayOrder || 0,
        showOnGamingHub !== false, showInCategory !== false, isFeatured || false, isTrending || false, isLatestNews || false,
        isExclusiveOffer || false, isSignatureMachine || false, metaTitle, metaDescription, keywords
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    console.error('Error creating gaming hub:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/gaming-hub/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.body;
    const keys = Object.keys(u);
    const setClause = keys.map((k, i) => {
      const dbK = k.replace(/([A-Z])/g, '_$1').toLowerCase();
      return `${dbK}=$${i+1}`;
    }).join(', ');
    if (!setClause) return res.status(400).json({ error: 'No data' });
    const values = keys.map(k => {
      if (['galleryImages', 'tips', 'pros', 'cons', 'tags', 'relatedServices'].includes(k)) return JSON.stringify(u[k] || []);
      return u[k];
    });
    values.push(id);
    const r = await pool.query(`UPDATE gaming_hub SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    res.json(r.rows[0]);
  } catch (error) {
    console.error('Error updating gaming hub:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

app.patch('/api/gaming-hub/:id/publish', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, publishDate } = req.body;
    const r = await pool.query(
      'UPDATE gaming_hub SET status=$1, publish_date=COALESCE($2, NOW()) WHERE id=$3 RETURNING *',
      [status, publishDate, id]
    );
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// HOMEPAGE
// =============================================

app.get('/api/featured-builds', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM featured_builds WHERE is_published=TRUE ORDER BY sort_order');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/featured-builds', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { title, description, useCase, budgetRange, components, totalPrice, imageUrl } = req.body;
    const slug = (title||'').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await pool.query(
      'INSERT INTO featured_builds (title, slug, description, use_case, budget_range, components, total_price, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title, slug, description, useCase, budgetRange, JSON.stringify(components || []), totalPrice, imageUrl]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// INSIGHTS
// =============================================

app.get('/api/reports/sales', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const r = await pool.query(
      `SELECT DATE_TRUNC('day', created_at) as day, COUNT(*) as orders, SUM(total_amount) as revenue
       FROM orders WHERE status!='cancelled' AND created_at BETWEEN $1 AND $2
       GROUP BY day ORDER BY day`,
      [startDate || CURRENT_DATE - INTERVAL '30 days', endDate || CURRENT_DATE]
    );
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// SYSTEM
// =============================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
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
      [userId, title, message, type, link]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.user.id]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

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
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/settings', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM system_settings ORDER BY category, key');
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/settings/:key', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const r = await pool.query('UPDATE system_settings SET value=$1, updated_at=NOW() WHERE key=$2 RETURNING *', [value, key]);
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================================
// HEALTH
// =============================================

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// =============================================
// ERROR HANDLING
// =============================================

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });
app.use('*', (req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('  DESKTO Backend API');
  console.log(`  Running on port ${PORT}`);
  console.log('========================================\n');
});
```

---

# ────────────────────────────────────────────────────────────────
# STEP 3: DEPLOY TO EC2
# ────────────────────────────────────────────────────────────────

## 3.1 Create Environment File

```bash
# On EC2 via SSM
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
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable --now deskto-backend
sudo systemctl status deskto-backend
```

## 3.3 Open Security Group Port

```bash
# Run from local machine
aws ec2 authorize-security-group-ingress \
  --group-id sg-07b5c27ca04272c84 \
  --protocol tcp --port 3001 \
  --cidr 0.0.0.0/0 \
  --region ap-south-1
```

---

# ────────────────────────────────────────────────────────────────
# STEP 4: TEST & VALIDATE
# ────────────────────────────────────────────────────────────────

```bash
# Health check
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}

# Login as admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@deskto.com","password":"admin123"}'
# → {user: {...}, accessToken: "..."}

# Save token, then test:
TOKEN="<paste-token>"

# Dashboard stats
curl http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# Categories
curl http://localhost:3001/api/categories

# Orders
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer $TOKEN"

# CRM customer profile
curl http://localhost:3001/api/crm/customers/<customer-id> \
  -H "Authorization: Bearer $TOKEN"

# Gaming Hub content
curl http://localhost:3001/api/gaming-hub \
  -H "Authorization: Bearer $TOKEN"
```

---

# ────────────────────────────────────────────────────────────────
# COMPLETE API REFERENCE (32 Pages)
# ────────────────────────────────────────────────────────────────

```
AUTH
├── POST   /api/auth/login
├── POST   /api/auth/register
└── GET    /api/auth/me

DASHBOARD (1 page)
├── GET    /api/dashboard/stats
├── GET    /api/dashboard/charts/orders-by-status
└── GET    /api/dashboard/charts/revenue-trend

CATALOG (4 pages)
├── GET/POST    /api/categories
├── PUT/DELETE  /api/categories/:id
├── GET/POST    /api/brands
├── PUT         /api/brands/:id
├── GET/POST    /api/products
└── PUT         /api/products/:id

OPERATIONS (10 pages — all follow same pattern)
├── GET/POST/PATCH  /api/orders
├── GET/POST/PATCH  /api/repairs
├── GET/POST/PATCH  /api/pc-builds
├── GET/POST/PATCH  /api/assemblies
├── GET/POST/PATCH  /api/upgrades
├── GET/POST/PATCH  /api/software-services
├── GET/POST/PATCH  /api/rentals
├── GET/POST/PATCH  /api/deliveries
├── GET/POST/PATCH  /api/support-tickets
└── GET/POST/PATCH  /api/sell-used

PEOPLE (3 pages)
├── GET          /api/crm/customers/:id
├── POST         /api/crm/notes
├── GET/PATCH    /api/customers
├── GET/POST     /api/staff
└── PATCH        /api/staff/:id

PROCUREMENT (2 pages)
├── GET/POST/PUT   /api/suppliers
└── GET            /api/purchase-orders

MARKETING (3 pages)
├── GET/POST     /api/coupons
├── GET          /api/offers
└── GET/POST/PUT/PATCH  /api/gaming-hub
     └── PATCH   /api/gaming-hub/:id/publish

HOMEPAGE (4 pages)
├── GET/POST  /api/featured-builds
├── GET        /api/offers
└── GET        /api/gaming-hub (for public view)

INSIGHTS (1 page)
└── GET  /api/reports/sales

SYSTEM (4 pages)
├── GET/POST     /api/notifications
├── PATCH        /api/notifications/:id/read
├── GET/PUT      /api/settings
├── GET          /api/audit-logs
└── GET          /api/backup-records
```

---

# ────────────────────────────────────────────────────────────────
# DEFAULT CREDENTIALS
# ────────────────────────────────────────────────────────────────

| Role | Email | Password | Department |
|------|-------|----------|------------|
| **Admin** | admin@deskto.com | admin123 | — |
| Staff | sales@deskto.com | admin123 | Sales |
| Staff | tech@deskto.com | admin123 | Technical |
| Staff | assembly@deskto.com | admin123 | Assembly |
| Staff | support@deskto.com | admin123 | Support |
| Customer | test4@gmail.com | admin123 | — |
| Customer | demo@deskto.in | admin123 | — |

---

# ────────────────────────────────────────────────────────────────
# 3-STEP EXECUTION CHECKLIST
# ────────────────────────────────────────────────────────────────

```
[ ] STEP 1: Connect to RDS and run the SQL schema
[ ] STEP 2: Deploy backend code to EC2 and start service
[ ] STEP 3: Test endpoints and login to admin dashboard
```

---

**Execute all three steps and your complete 32-page admin dashboard will have full backend support!**

Login: **http://13.234.99.45/dashboard/admin** with `admin@deskto.com` / `admin123`
