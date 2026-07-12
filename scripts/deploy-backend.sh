#!/bin/bash
# Backend Deployment Script - Deploy and run backend on EC2

set -e

REGION="ap-south-1"
INSTANCE_ID="${1:-i-0b652e38103c7635a}"
BACKEND_DIR="/home/ec2-user/backend"
TEMP_DIR="/tmp/backend-$$"

echo "=========================================="
echo "Backend Deployment to EC2"
echo "=========================================="
echo "Instance: $INSTANCE_ID"
echo "Region: $REGION"
echo ""

# Step 1: Get SSM Parameters
echo "Step 1: Fetching secrets from SSM..."
DATABASE_URL=$(aws ssm get-parameter --name "/deskto-website/production/database-url" --with-decryption --region $REGION --query "Parameter.Value" --output text)
JWT_SECRET=$(aws ssm get-parameter --name "/deskto-website/production/jwt-secret" --with-decryption --region $REGION --query "Parameter.Value" --output text)

echo "  ✅ Database URL: ${DATABASE_URL:0:50}..."
echo "  ✅ JWT Secret: ${JWT_SECRET:0:20}..."
echo ""

# Step 2: Create backend files on EC2
echo "Step 2: Creating backend files on EC2..."
aws ssm send-command \
  --region $REGION \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    'mkdir -p $BACKEND_DIR/src/{routes,controllers,models,middleware,config,utils}',
    'echo Backend directory created'
  ]" \
  --output text --query "Command.CommandId" > /dev/null

echo "  ✅ Backend directory created"
echo ""

# Step 3: Install Node.js on EC2
echo "Step 3: Installing Node.js..."
NODE_INSTALL_CMD=$(aws ssm send-command \
  --region $REGION \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    'curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -',
    'sudo dnf install -y nodejs',
    'node --version',
    'npm --version'
  ]" \
  --output text --query "Command.CommandId")

sleep 15

aws ssm get-command-invocation \
  --region $REGION \
  --command-id $NODE_INSTALL_CMD \
  --instance-id $INSTANCE_ID \
  --query "StandardOutputContent" --output text 2>&1

echo "  ✅ Node.js installed"
echo ""

# Step 4: Copy backend files
echo "Step 4: Copying backend files..."
cd /Users/adityakumar/Downloads/New\ Aditya\ 3-d\ Website/backend

# Compile TypeScript locally
echo "  Building backend..."
npm run build 2>&1 | tail -5

# Upload the FULL compiled dist tree to EC2. Older revisions of this script
# only uploaded a hand-picked subset of routes/auth/products/orders/services,
# which silently dropped routes/homepageContent.js — the CMS endpoints the
# admin editor uses for Featured Builds, Offers, Gaming News, etc. With that
# file missing, every admin publish returned "404 Route not found" because
# the backend had no idea what /api/admin/homepage-content/* was. Always
# upload the entire dist/ tree so every route ships with every deploy.
if [ ! -d dist ]; then
  echo "  ❌ dist/ does not exist after build — aborting" >&2
  exit 1
fi
# Mirror dist/* into S3, preserving subdirectory structure (config/, middleware/,
# models/, routes/, controllers/, utils/).
(cd dist && find . -type f -name '*.js' -print0 | while IFS= read -r -d '' f; do
  aws s3 cp "$f" "s3://deskto-website-ec2-assets/backend/$f" >/dev/null
done)
aws s3 cp package.json "s3://deskto-website-ec2-assets/backend/package.json" >/dev/null || true

echo "  ✅ Backend files compiled and uploaded"
echo ""

# Step 5: Deploy via SSM
echo "Step 5: Deploying backend to EC2..."
DEPLOY_CMD=$(aws ssm send-command \
  --region $REGION \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    'cd $BACKEND_DIR',
    'yum install -y postgresql16 2>/dev/null || dnf install -y postgresql16 || true',
    'npm init -y',
    'npm install express cors helmet morgan dotenv pg bcryptjs jsonwebtoken uuid express-validator',
    'npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner',
    'npm install @types/express @types/cors @types/morgan @types/pg @types/bcryptjs @types/jsonwebtoken @types/uuid ts-node typescript',
    'echo Configuration complete',
    'DATABASE_URL=\"$DATABASE_URL\" npm start'
  ]" \
  --output text --query "Command.CommandId")

echo "  Command ID: $DEPLOY_CMD"
echo "  ✅ Backend deployment initiated"
echo ""

# Step 6: Test the backend
echo "Step 6: Waiting for backend to start..."
sleep 20

echo ""
echo "=========================================="
echo "Testing Backend..."
echo "=========================================="

# Test via SSM
TEST_CMD=$(aws ssm send-command \
  --region $REGION \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    'sleep 2',
    'curl -s http://localhost:3001/health || echo health check failed'
  ]" \
  --output text --query "Command.CommandId")

sleep 5
aws ssm get-command-invocation \
  --region $REGION \
  --command-id $TEST_CMD \
  --instance-id $INSTANCE_ID \
  --query "StandardOutputContent" --output text 2>&1

echo ""
echo "=========================================="
echo "Backend Deployment Complete"
echo "=========================================="
echo "Instance: $INSTANCE_ID"
echo "Backend Directory: $BACKEND_DIR"
echo ""
