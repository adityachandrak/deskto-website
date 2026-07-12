# DESKTO — PC Builder & Repair Shop Admin

🏗️ **Complete Admin Dashboard with Frontend** for DESKTO PC Builder & Repair Shop

## 🎯 Overview

DESKTO is a comprehensive admin dashboard + frontend website for a custom PC builder & repair shop. The admin dashboard covers 32 pages including:

- **Overview**: Dashboard with KPIs and charts
- **Catalog**: Categories, Brands, Inventory
- **Operations**: 10 pages (Orders, Repairs, PC Builds, Assembly, Upgrades, Software, Rentals, Support, Sell Used, Deliveries)
- **People**: CRM, Customers, Staff
- **Procurement**: Suppliers, Purchase Orders
- **Marketing**: Coupons, Offers, Gaming Hub
- **Homepage Management**: Featured builds, offers, news, testimonials
- **Insights**: Reports & Analytics
- **System**: Notifications, Settings, Audit Logs, Backups

## 📋 Default Credentials

| Role    | Email                | Password |
|---------|----------------------|----------|
| Admin   | admin@deskto.com     | admin123 |
| Staff   | tech@deskto.com     | admin123 |
| Support | support@deskto.com   | admin123 |
| Customer| test4@gmail.com      | admin123 |

## 🚀 Quick Start

1. **AWS Setup** (Phase 0)
   ```bash
   chmod +x PHASE0_VALIDATION.sh
   ./PHASE0_VALIDATION.sh
   ```

2. **Database & Backend**
   ```bash
   chmod +x DEPLOY_ALL.sh
   ./DEPLOY_ALL.sh
   ```

3. **Frontend**
   ```bash
   npm install && npm run dev
   ```

## 📁 Project Structure

```
New Aditya 3-d Website/
├── src/app/                    # React frontend source
│   ├── App.tsx
│   ├── components/
│   ├── pages/                  # 32 dashboard pages
│   └── ...
├── backend.js                  # Node.js/Express backend
├── DATABASE_SCHEMA.sql         # 40+ tables schema
├── COMPLETE_WORKFLOW_FINAL.md  # Complete workflow documentation
├── PHASE0_SETUP_COMMANDS.md     # Phase 0 AWS commands
├── DEPLOY_ALL.sh              # End-to-end deployment script
└── README.md                   # This file
```

## 🏗️ Architecture

- **Frontend**: React (Vite) → S3 + CloudFront
- **Backend**: Node.js/Express → EC2 + systemd
- **Database**: PostgreSQL on RDS

## 🔧 Infrastructure

| Resource | Details |
|----------|---------|
| Region | ap-south-1 (Mumbai) |
| Frontend | www.deskto.in |
| EC2 | i-0b652e38103c7635a |
| RDS | deskto-website-postgres |
| DB Name | deskto_db |
| DB User | deskto_admin |

## 📊 Features

### Backend API (60+ Endpoints)
- ✅ Authentication with JWT
- ✅ Role-based access (admin, staff, customer)
- ✅ Generic handlers for all service types
- ✅ Pagination on all list endpoints
- ✅ Audit logging on updates
- ✅ Health check endpoint

### Database Schema (40+ Tables)
- ✅ All service tables with shared pattern
- ✅ CRM system with notes and stats
- ✅ Gaming Hub with content management
- ✅ Audit logging for all actions
- ✅ System settings configuration

### Frontend Features
- ✅ 32 pages complete with working forms
- ✅ Status badges and color coding
- ✅ Search & filter functionality
- ✅ Staff assignment and progress tracking
- ✅ Inline editing for quotes/prices
- ✅ Bulk actions (approve, reject, assign)

## 🚀 Deployment

### Phase 0: AWS Setup
1. Create IAM policy with scoped permissions
2. Create OIDC provider for GitHub Actions
3. Create IAM role for GitHub Actions
4. Add repository secrets

### Phase 1: Database
1. Connect to RDS PostgreSQL
2. Execute schema (40 tables)
3. Verify seed data

### Phase 2: Backend
1. Deploy to EC2 instance
2. Install Node.js dependencies
3. Create systemd service
4. Configure security group

### Phase 3: Validation
1. Health check
2. Login test
3. API endpoints validation

## 🔑 GitHub Actions CI/CD

After Phase 0, add these repository secrets:
- `AWS_ROLE_ARN`: <role ARN from Phase 0>
- `AWS_REGION`: ap-south-1
- `EC2_SSH_PRIVATE_KEY`: <SSH key> (or use SSM)

## 📈 Dashboard Pages

### Catalog (4 pages)
- Categories Management
- Brands Management  
- Inventory / Products
- Catalog Overview

### Operations (10 pages)
- Orders Management
- Repairs Tracking
- PC Builds / Custom Builder
- Assembly Tracking
- Upgrades Management
- Software Services
- Rentals Management
- Support Tickets
- Sell Used / Trade-in
- Deliveries Management

### People (3 pages)
- CRM System
- Customers Overview
- Staff Management

### Procurement (2 pages)
- Suppliers Management
- Purchase Orders

### Marketing (3 pages)
- Coupons Management
- Offers Management
- Gaming Hub Management

### Homepage (4 pages)
- Featured Builds
- Exclusive Offers
- Gaming News
- Testimonials

### Insights (1 page)
- Reports & Analytics

### System (4 pages)
- Notifications Center
- System Settings
- Audit Logs
- Backup & Restore

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, JWT, bcryptjs
- **Database**: PostgreSQL 14+ with JSONB support
- **Infrastructure**: AWS EC2, RDS, SSM, IAM OIDC
- **CI/CD**: GitHub Actions with AWS OIDC

## 📞 Contact

- Shop: DESKTO, Shop No. 22, Arvind Nagar, Gwalior, MP 474004
- Phone: +91 62604 69111
- Email: support@deskto.in

## 🎯 Next Steps

1. Execute Phase 0 AWS setup
2. Deploy database schema
3. Deploy backend to EC2
4. Test all endpoints
5. Integrate frontend with backend
6. Set up CI/CD pipeline

---
**All 32 pages now have full backend support!** 🎉