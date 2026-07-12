# DESKTO — End-to-End Execution Guide

## Complete Backend + Database Setup

This guide walks through executing the complete workflow for all 32 dashboard pages.

---

## Prerequisites

1. AWS CLI installed and configured
2. SSM Session Manager access to EC2 instance `i-0b652e38103c7635a`
3. PostgreSQL RDS connection details from SSM

---

## Phase 0: AWS Setup (GitHub Actions CI/CD)

### Step 1: Create IAM Policy

```bash
aws iam create-policy \
  --policy-name github-actions-deploy \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[
      {"Effect":"Allow","Action":["ecr:CreateRepository","ecr:DeleteRepository","ecr:PushImage","ecr:DescribeRepositories","ecr:ListImages","ecr:GetAuthorizationToken"],"Resource":"*"},
      {"Effect":"Allow","Action":["ec2:DescribeInstances","ec2:DescribeSecurityGroups","ec2:DescribeVpcs"],"Resource":"*"},
      {"Effect":"Allow","Action":["ssm:SendCommand","ssm:DescribeInstanceInformation","ssm:StartSession","ssm:TerminateSession"],"Resource":"*"},
      {"Effect":"Allow","Action":["cloudwatch:PutMetricData"],"Resource":"*"}
    ]
  }' \
  --description "Scoped permissions for GitHub Actions CI/CD deploy" \
  --region ap-south-1
```

**Expected:** Policy created with ARN.

### Step 2: Create IAM User

```bash
aws iam create-user \
  --user-name github-actions-deploy \
  --region ap-south-1
```

### Step 3: Create Access Key

```bash
aws iam create-access-key \
  --user-name github-actions-deploy \
  --region ap-south-1 > github-access-key.json
```

**Expected:** Access key JSON saved. Keep it secure.

### Step 4: Attach Policy to User

```bash
# Get your AWS account ID
aws sts get-caller-identity --query Account --output text

# Attach policy (replace <ACCOUNT_ID>)
aws iam attach-user-policy \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/github-actions-deploy \
  --user-name github-actions-deploy \
  --region ap-south-1
```

### Step 5: Create OIDC Provider

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadd08f2dbbd7629bc97ec8d \
  --region ap-south-1
```

**Expected:** OIDC provider created with ARN.

### Step 6: Create IAM Role for GitHub Actions

```bash
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --description "Role assumed by GitHub Actions via OIDC" \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Federated":"arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"},
      "Action":"sts:AssumeRoleWithWebIdentity",
      "Condition":{
        "StringEquals":{"token.actions.githubusercontent.com:aud":"sts.amazonaws.com"},
        "StringLike":{"token.actions.githubusercontent.com:sub":"repo:<YOUR_GITHUB_ORG>/<YOUR_REPO>:*"}
      }
    }]
  }' \
  --region ap-south-1
```

### Step 7: Attach Policy to Role

```bash
aws iam attach-role-policy \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/github-actions-deploy \
  --role-name GitHubActionsDeployRole \
  --region ap-south-1
```

### Step 8: Verify Setup

```bash
# Check policy
aws iam get-policy --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/github-actions-deploy

# Check role
aws iam get-role --role-name GitHubActionsDeployRole

# Check user has policy
aws iam list-attached-user-policies --user-name github-actions-deploy

# Check role has policy
aws iam list-attached-role-policies --role-name GitHubActionsDeployRole
```

### Step 9: Add GitHub Repository Secrets

1. Go to: **GitHub → Your Repo → Settings → Secrets and variables → Actions**
2. Add these secrets:
   - `AWS_ROLE_ARN`: `arn:aws:iam::<ACCOUNT_ID>:role/GitHubActionsDeployRole`
   - `AWS_REGION`: `ap-south-1`
   - `EC2_INSTANCE_ID`: `i-0b652e38103c7635a` (if using SSM)

### Step 10: Branching Strategy

| Branch  | Purpose              |
|---------|----------------------|
| `main`  | Testing / staging    |

> **Note:** No production branch yet. Site is still in testing phase.

---

## Phase 1: Database Setup (40 Tables)

### Step 1: Get Database Password

```bash
aws ssm get-parameter \
  --name "/deskto-website/production/database-url" \
  --with-decryption \
  --region ap-south-1 \
  --query "Parameter.Value" \
  --output text
```

### Step 2: Connect to PostgreSQL

```bash
# Start SSM session
aws ssm start-session --target i-0b652e38103c7635a --region ap-south-1

# Get password from local machine (not in EC2 session)
PGPASSWORD='<password-from-ssm>' psql \
  -h deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com \
  -U deskto_admin \
  -d deskto_db
```

### Step 3: Run Schema

Execute the SQL from `COMPLETE_WORKFLOW_FINAL.md` (Section 1.2) in the psql session.

**Validation:**
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' ORDER BY table_name;

-- Expected output (40+ tables):
-- audit_logs
-- assemblies
-- backup_records
-- brands
-- categories
-- coupons
-- crm_notes
-- customer_stats
-- customers (view)
-- deliveries
-- featured_builds
-- gaming_hub
-- offers
-- orders
-- pc_builds
-- products
-- purchase_orders
-- refresh_tokens
-- rentals
-- repairs
-- report_schedules
-- sell_used
-- software_services
-- staff_profiles
-- support_tickets
-- suppliers
-- system_settings
-- upgrades
-- users

-- Check seed data
SELECT COUNT(*) FROM users;  -- Should be 7
SELECT COUNT(*) FROM categories;  -- Should be 6
SELECT COUNT(*) FROM brands;  -- Should be 11
SELECT COUNT(*) FROM orders;  -- Should be 3

-- Verify admin user exists
SELECT email, role FROM users WHERE email='admin@deskto.com';

-- Test login with seeded password
-- (Backend will verify password hash)
```

---

## Phase 2: Backend Deployment

### Step 1: Connect to EC2

```bash
aws ssm start-session --target i-0b652e38103c7635a --region ap-south-1
```

### Step 2: Install Node.js (if not installed)

```bash
node --version
# If not installed:
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

### Step 3: Create Backend Directory

```bash
mkdir -p /home/ec2-user/backend/src
cd /home/ec2-user/backend
npm init -y
npm install express cors helmet morgan dotenv pg bcryptjs jsonwebtoken uuid
```

### Step 4: Create Environment File

```bash
cat > /home/ec2-user/backend/.env << 'EOF'
PORT=3001
NODE_ENV=production
DB_HOST=deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=deskto_db
DB_USER=deskto_admin
DB_PASSWORD=<get-from-ssm>
JWT_SECRET=<generate-secure-secret-here>
FRONTEND_URL=https://www.deskto.in
EOF
```

**Get DB Password:**
```bash
# On your LOCAL machine (not in EC2 session)
aws ssm get-parameter \
  --name "/deskto-website/production/database-url" \
  --with-decryption \
  --region ap-south-1 \
  --query "Parameter.Value" \
  --output text
```

### Step 5: Create Backend Service

Create `/home/ec2-user/backend/src/index.js` with the complete backend code from `COMPLETE_WORKFLOW_FINAL.md`.

### Step 6: Create Systemd Service

```bash
sudo tee /etc/systemd/system/deskto-backend.service << 'EOF'
[Unit]
Description=DESKTO Backend API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/backend
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/home/ec2-user/backend/.env

[Install]
WantedBy=multi-user.target
EOF
```

### Step 7: Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now deskto-backend
sudo systemctl status deskto-backend
```

**Expected Output:**
```
● deskto-backend.service - DESKTO Backend API
     Loaded: loaded (/etc/systemd/system/deskto-backend.service; enabled)
     Active: active (running) since ...
```

### Step 8: Configure Security Group

Ensure EC2 security group allows inbound traffic on port 3001:

```bash
aws ec2 describe-security-groups --group-ids <ec2-security-group-id> --region ap-south-1
```

If port 3001 is not open, add it:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id <ec2-security-group-id> \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0 \
  --region ap-south-1
```

---

## Phase 3: Validation

### Test 1: Health Check

```bash
curl http://<ec2-public-ip>:3001/health
```

**Expected:** `{"status":"ok"}`

### Test 2: Login (Admin)

```bash
curl -X POST http://<ec2-public-ip>:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@deskto.com",
    "password": "admin123"
  }'
```

**Expected:** User object with `accessToken`.

### Test 3: Get Dashboard Stats

```bash
# Replace <TOKEN> with token from Test 2
curl http://<ec2-public-ip>:3001/api/dashboard/stats \
  -H "Authorization: Bearer <TOKEN>"
```

**Expected:** Stats object with revenue, orders, repairs, etc.

### Test 4: Get Categories

```bash
curl http://<ec2-public-ip>:3001/api/categories
```

**Expected:** Array of 6 categories with product counts.

### Test 5: Get Orders

```bash
curl http://<ec2-public-ip>:3001/api/orders \
  -H "Authorization: Bearer <TOKEN>"
```

**Expected:** Paginated array of orders with staff names.

---

## Complete Validation Checklist

- [ ] Phase 0:
  - [ ] IAM policy created: `github-actions-deploy`
  - [ ] IAM user created: `github-actions-deploy`
  - [ ] Access key generated and saved
  - [ ] Policy attached to user
  - [ ] OIDC provider created
  - [ ] IAM role created: `GitHubActionsDeployRole`
  - [ ] Policy attached to role
  - [ ] GitHub secrets added: `AWS_ROLE_ARN`, `AWS_REGION`

- [ ] Phase 1:
  - [ ] Connected to PostgreSQL
  - [ ] Schema executed successfully
  - [ ] 40+ tables created
  - [ ] Seed data inserted (7 users, 6 categories, 11 brands, 3 orders)
  - [ ] Admin user exists: `admin@deskto.com`

- [ ] Phase 2:
  - [ ] Node.js installed on EC2
  - [ ] Dependencies installed
  - [ ] `.env` file created
  - [ ] Backend code deployed
  - [ ] Systemd service created and running
  - [ ] Port 3001 accessible

- [ ] Phase 3:
  - [ ] Health check returns `{"status":"ok"}`
  - [ ] Login works for admin/staff/customer
  - [ ] Dashboard stats endpoint returns data
  - [ ] Categories endpoint returns 6 categories
  - [ ] Orders endpoint returns 3 sample orders
  - [ ] All 32 dashboard pages have backend support

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
sudo journalctl -u deskto-backend -f

# Check if port is already in use
sudo netstat -tlnp | grep 3001
```

### Database connection fails

```bash
# Test connection from EC2
PGPASSWORD='<password>' psql \
  -h deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com \
  -U deskto_admin \
  -d deskto_db \
  -c "SELECT 1"

# Check security groups
aws ec2 describe-security-groups --group-ids <rds-sg-id> --region ap-south-1
```

### AWS CLI errors

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check region
aws configure get region

# Test connectivity
aws iam list-users --max-items 1
```

---

## Next Steps

Once all validation passes:
1. Update frontend to call backend API endpoints
2. Test all 32 dashboard pages with real data
3. Set up GitHub Actions workflow for automated deployment
4. Configure monitoring and alerts
5. Move to production (create prod branch)

---

## Support

For issues:
- Check logs: `sudo journalctl -u deskto-backend -f`
- Test database: `psql -h <rds-endpoint> -U deskto_admin -d deskto_db`
- Test API: `curl http://<ec2-ip>:3001/health`
