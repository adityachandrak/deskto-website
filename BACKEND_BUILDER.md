# Professional Backend & Database - Complete Build Guide

## Overview
This guide builds a real backend for your Deskto website with:
- PostgreSQL database on AWS RDS (Free Tier)
- Node.js/Express REST API
- JWT authentication
- Complete data models for users, products, orders, services
- Connected to your existing React frontend

---

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   React SPA     │ ───▶ │   Express API   │ ───▶ │   PostgreSQL    │
│   (Frontend)    │      │   (Backend)     │      │   (AWS RDS)    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        │                        │                        │
   Port 5173/80            Port 3001              Free Tier DB
   (Dev/Prod)             (EC2 Container)         (750hrs/month)
```

---

## Phase 1: Database Setup (AWS RDS PostgreSQL)

### Step 1.1: Create RDS PostgreSQL Instance

1. Go to AWS Console → RDS → Create database

2. **Choose a database creation method:** Standard create

3. **Engine options:**
   - Engine type: PostgreSQL
   - Version: PostgreSQL 16.x (latest stable)

4. **Templates:** Free tier

5. **Settings:**
   ```
   DB instance identifier: deskto-postgres
   Master username: deskto_admin
   Master password: [YourStrongPassword123!]
   ```

6. **Instance configuration:**
   - DB instance class: db.t3.micro

7. **Storage:**
   - Allocated storage: 20 GB
   - Storage autoscaling: Disabled (free tier)

8. **Connectivity:**
   - Compute resource: Don't connect to EC2
   - Network type: IPv4
   - VPC: deskto-vpc (your existing VPC)
   - Subnet group: deskto-subnet-group
   - Public access: No (EC2 only)
   - VPC security group: deskto-sg (existing)

9. **Database authentication:**
   - Password authentication

10. **Additional configuration:**
    - Initial database name: deskto_db
    - Backup: Enable automatic backups
    - Backup retention: 1 day

11. Click **Create database**

**Expected time:** 10-15 minutes

---

### Step 1.2: Configure Security Group for RDS

1. Go to EC2 → Security Groups → deskto-sg

2. **Edit inbound rules:**
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source: Custom - deskto-sg (self-reference for EC2 access)
   ```

3. **Save rules**

---

### Step 1.3: Create SSM Parameters for Database Credentials

```bash
# Store database connection string
aws ssm put-parameter \
  --name "/deskto-website/production/database-url" \
  --value "postgresql://deskto_admin:YourStrongPassword123!@deskto-postgres.xxx.region.rds.amazonaws.com:5432/deskto_db" \
  --type "SecureString" \
  --region ap-south-1

# Store JWT secret
aws ssm put-parameter \
  --name "/deskto-website/production/jwt-secret" \
  --value "your-super-secret-jwt-key-min-32-chars" \
  --type "SecureString" \
  --region ap-south-1
```

---

### Step 1.4: Test Database Connection from EC2

```bash
# SSH to EC2 via SSM
aws ssm start-session --target i-0b652e38103c7635a --region ap-south-1

# Install PostgreSQL client
sudo dnf install -y postgresql16

# Test connection
PGPASSWORD=YourStrongPassword123! psql \
  -h deskto-postgres.xxx.region.rds.amazonaws.com \
  -U deskto_admin \
  -d deskto_db

# Should see: deskto_db=>
```

---

## Phase 2: Backend API Server Setup

### Step 2.1: Create Backend Project Structure

On your local machine:

```bash
cd /Users/adityakumar/Downloads/New\ Aditya\ 3-d\ Website

# Create backend directory
mkdir -p backend/src/{routes,controllers,models,middleware,config,utils}

# Initialize Node.js project
cd backend
npm init -y

# Install dependencies
npm install express cors helmet morgan dotenv pg bcryptjs jsonwebtoken uuid express-validator

# Install dev dependencies
npm install -D typescript @types/express @types/cors @types/morgan @types/pg @types/bcryptjs @types/jsonwebtoken @types/uuid ts-node nodemon
```

---

### Step 2.2: Create TypeScript Configuration

```bash
cd backend
npx tsc --init
```

Edit `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Step 2.3: Create Database Configuration

Create `backend/src/config/database.ts`:

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = (text: string, params?: any) => pool.query(text, params);

export const getClient = () => pool.connect();

export default pool;
```

---

### Step 2.4: Create Database Schema Migration

Create `backend/src/models/schema.sql`:

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Staff Profiles
CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(50),
    employee_id VARCHAR(50) UNIQUE,
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    images TEXT[], -- Array of image URLs
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

-- Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Brands Table
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    specifications JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services Table (Repairs, Upgrades, etc.)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    service_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'submitted',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    device_info JSONB,
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    technician_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PC Builds Table
CREATE TABLE pc_builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'submitted',
    title VARCHAR(255),
    use_case VARCHAR(100),
    budget_range VARCHAR(50),
    components JSONB NOT NULL,
    total_price DECIMAL(10,2),
    quotation_details TEXT,
    technician_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews Table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    order_id UUID REFERENCES orders(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlists Table
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Refresh Tokens Table (for JWT refresh)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE
);

-- Audit Log Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_services_user ON services(user_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_pc_builds_user ON pc_builds(user_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);

-- Updated_at Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pc_builds_updated_at BEFORE UPDATE ON pc_builds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### Step 2.5: Create Authentication Middleware

Create `backend/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
```

---

### Step 2.6: Create User Routes

Create `backend/src/routes/auth.ts`:

```typescript
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validationResult, body } from 'express-validator';

const router = Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('phone').optional().isMobilePhone('any')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, 'customer')
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, phone, passwordHash, firstName, lastName]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('identifier').notEmpty(),
  body('password').notEmpty()
], async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or phone
    const result = await query(
      'SELECT * FROM users WHERE email = $1 OR phone = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if locked
    if (user.status === 'locked') {
      return res.status(423).json({ error: 'Account locked. Try again later.' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get Current User
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, phone, first_name, last_name, role, status, created_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Refresh Token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { id: string };

    // Check if token exists and not revoked
    const tokenResult = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND revoked = FALSE AND expires_at > NOW()',
      [refreshToken, decoded.id]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Get user
    const userResult = await query(
      'SELECT id, email, role FROM users WHERE id = $1 AND status = $2',
      [decoded.id, 'active']
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = userResult.rows[0];

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1 AND user_id = $2',
        [refreshToken, req.user!.id]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
```

---

### Step 2.7: Create Product Routes

Create `backend/src/routes/products.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { body, query as validatorQuery, validationResult } from 'express-validator';

const router = Router();

// Get All Products (Public)
router.get('/', async (req: Request, res: Response) => {
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
    let whereClause = 'WHERE is_active = TRUE';
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

    // Validate sort
    const allowedSortFields = ['price', 'name', 'created_at', 'stock_quantity'];
    const sortField = allowedSortFields.includes(String(sortBy)) ? sortBy : 'created_at';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Get products
    const productsResult = await query(
      `SELECT id, sku, name, slug, description, price, compare_price, category, brand,
              stock_quantity, image_url, market_tag, is_featured, created_at
       FROM products
       ${whereClause}
       ORDER BY ${sortField} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      params
    );

    res.json({
      products: productsResult.rows.map(p => ({
        ...p,
        hasDiscount: p.compare_price && p.compare_price > p.price,
        discountPercent: p.compare_price ? Math.round((1 - p.price / p.compare_price) * 100) : null
      })),
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
});

// Get Product by Slug (Public)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const result = await query(
      `SELECT p.*, 
              COALESCE(json_agg(DISTINCT r.*) FILTER (WHERE r.id IS NOT NULL AND r.is_approved = TRUE), '[]') as reviews
       FROM products p
       LEFT JOIN reviews r ON p.id = r.product_id
       WHERE p.slug = $1 AND p.is_active = TRUE
       GROUP BY p.id`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / product.reviews.length
      : 0;

    res.json({
      ...product,
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount: product.reviews.length
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create Product (Admin only)
router.post('/', authenticate, authorize('admin'), [
  body('sku').notEmpty(),
  body('name').notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('category').notEmpty()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      sku, name, description, price, comparePrice, category, brand,
      stockQuantity, imageUrl, specifications, tags, marketTag
    } = req.body;

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await query(
      `INSERT INTO products 
       (sku, name, slug, description, price, compare_price, category, brand,
        stock_quantity, image_url, specifications, tags, market_tag)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [sku, name, slug, description, price, comparePrice, category, brand,
       stockQuantity || 0, imageUrl, specifications, tags, marketTag]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'SKU or slug already exists' });
    }
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update Product (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
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

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete Product (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete - just mark as inactive
    await query(
      'UPDATE products SET is_active = FALSE WHERE id = $1',
      [id]
    );

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
```

---

### Step 2.8: Create Main Express Server

Create `backend/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import serviceRoutes from './routes/services';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

---

### Step 2.9: Create Dockerfile for Backend

Create `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

---

### Step 2.10: Update docker-compose.yml

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - FRONTEND_URL=${FRONTEND_URL}
    depends_on:
      - db
    restart: unless-stopped
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/models/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

---

## Phase 3: Connect Frontend to Backend

### Step 3.1: Create API Client

Create `src/lib/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(identifier: string, password: string) {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
    });
  }

  async register(data: RegisterData) {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: data,
    });
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  }

  // Product endpoints
  async getProducts(params?: ProductQuery) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    return this.request<ProductListResponse>(`/products?${searchParams}`);
  }

  async getProduct(slug: string) {
    return this.request<Product>(`/products/${slug}`);
  }

  async createProduct(data: ProductInput) {
    return this.request<Product>('/products', {
      method: 'POST',
      body: data,
    });
  }

  // Order endpoints
  async createOrder(data: OrderInput) {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: data,
    });
  }

  async getMyOrders() {
    return this.request<Order[]>('/orders/my');
  }

  async getOrder(id: string) {
    return this.request<Order>(`/orders/${id}`);
  }

  // Service endpoints
  async createService(data: ServiceInput) {
    return this.request<Service>('/services', {
      method: 'POST',
      body: data,
    });
  }

  async getMyServices() {
    return this.request<Service[]>('/services/my');
  }
}

export const api = new ApiClient(API_BASE_URL);

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'staff' | 'admin';
  phone?: string;
  status: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  category: string;
  brand: string;
  stockQuantity: number;
  imageUrl?: string;
  images?: string[];
  specifications?: Record<string, any>;
  tags?: string[];
  marketTag?: string;
  isActive: boolean;
  isFeatured: boolean;
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductInput {
  sku: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  category: string;
  brand?: string;
  stockQuantity?: number;
  imageUrl?: string;
  specifications?: Record<string, any>;
  tags?: string[];
  marketTag?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderInput {
  items: { productId: string; quantity: number }[];
  shippingAddress: Address;
  billingAddress?: Address;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Service {
  id: string;
  serviceNumber: string;
  serviceType: string;
  status: string;
  title: string;
  description?: string;
  estimatedCost?: number;
  finalCost?: number;
  createdAt: string;
}

export interface ServiceInput {
  serviceType: string;
  title: string;
  description?: string;
  deviceInfo?: Record<string, any>;
}
```

---

### Step 3.2: Create Environment Variables

Create `.env.example`:

```bash
# Backend
DATABASE_URL=postgresql://deskto_admin:YourStrongPassword123!@deskto-postgres.xxx.region.rds.amazonaws.com:5432/deskto_db
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
FRONTEND_URL=http://localhost:5173
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001/api
```

Create `.env` (for local development):

```bash
VITE_API_URL=http://localhost:3001/api
```

---

## Phase 4: Deploy Backend to EC2

### Step 4.1: Update Terraform for Backend

Update `terraform/live/main.tf`:

```hcl
# Add RDS instance
resource "aws_db_instance" "deskto_postgres" {
  identifier           = "deskto-postgres"
  engine               = "postgres"
  engine_version       = "16.4"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  max_allocated_storage = 0
  db_name              = "deskto_db"
  username            = var.db_username
  password            = var.db_password
  parameter_group_name = "default.postgres16"
  vpc_security_group_ids = [aws_security_group.deskto_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.deskto_subnets.name
  skip_final_snapshot    = true
  backup_retention_period = 1
  publicly_accessible    = false
}

# Add IAM role for EC2 to access RDS and SSM
resource "aws_iam_role" "ec2_role" {
  name = "deskto-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_ecr" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "deskto-ec2-profile"
  role = aws_iam_role.ec2_role.name
}
```

---

### Step 4.2: Create Deployment Script for Backend

Create `scripts/deploy-backend.sh`:

```bash
#!/bin/bash
set -e

INSTANCE_ID="${1:-i-0b652e38103c7635a}"
REGION="ap-south-1"
ECR_BACKEND="898322960338.dkr.ecr.ap-south-1.amazonaws.com/deskto-backend"

echo "=== Deploying Backend to EC2 ==="

# Build backend
cd backend
npm install
npm run build
cd ..

# Tag and push backend image
docker build -t deskto-backend:latest ./backend
docker tag deskto-backend:latest ${ECR_BACKEND}:latest
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_BACKEND}
docker push ${ECR_BACKEND}:latest

# Deploy to EC2 via SSM
aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    \"docker pull ${ECR_BACKEND}:latest\",
    \"docker stop deskto-backend || true\",
    \"docker rm deskto-backend || true\",
    \"docker run -d --name deskto-backend -p 3001:3001 --restart unless-stopped -e DATABASE_URL='${DATABASE_URL}' -e JWT_SECRET='${JWT_SECRET}' ${ECR_BACKEND}:latest\",
    \"docker ps | grep deskto-backend\"
  ]"
```

---

## Phase 5: Testing & Validation

### Step 5.1: Test Backend Locally

```bash
# Start database
docker-compose up -d db

# Run migrations
psql $DATABASE_URL -f backend/src/models/schema.sql

# Start backend
cd backend && npm run dev
```

### Step 5.2: Test API Endpoints

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","firstName":"Test"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"Password123!"}'

# Get products (no auth needed)
curl http://localhost:3001/api/products
```

### Step 5.3: Integration Test

```bash
# Create product as admin
TOKEN="your-admin-token"
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sku":"GPU-001","name":"RTX 4090","price":1599.99,"category":"GPU"}'
```

---

## Summary Checklist

### Database Setup
- [ ] Create RDS PostgreSQL instance
- [ ] Configure security group
- [ ] Store credentials in SSM Parameter Store
- [ ] Test connection from EC2
- [ ] Run schema migration

### Backend Development
- [ ] Initialize Node.js project
- [ ] Configure TypeScript
- [ ] Set up database connection pool
- [ ] Create database schema
- [ ] Implement authentication (register, login, JWT)
- [ ] Create product CRUD endpoints
- [ ] Create order endpoints
- [ ] Create service request endpoints
- [ ] Add middleware (auth, validation, error handling)
- [ ] Write unit tests

### Frontend Integration
- [ ] Create API client
- [ ] Replace localStorage with API calls
- [ ] Add JWT token management
- [ ] Create login/register forms
- [ ] Connect product catalog to API
- [ ] Connect orders to API
- [ ] Update environment variables

### Deployment
- [ ] Update Terraform for RDS
- [ ] Add IAM roles for EC2
- [ ] Create backend Dockerfile
- [ ] Deploy backend to EC2
- [ ] Configure Nginx for backend proxy
- [ ] Test end-to-end flow
- [ ] Set up monitoring/logging

---

## Estimated Timeline

| Phase | Time | Cost |
|-------|------|------|
| Database Setup | 30 min | ~$0 (free tier) |
| Backend Development | 4-6 hours | $0 |
| Frontend Integration | 3-4 hours | $0 |
| Deployment | 1-2 hours | ~$5-10/month (RDS) |
| Testing | 1-2 hours | $0 |

**Total:** ~8-14 hours, ~$5-10/month for production
