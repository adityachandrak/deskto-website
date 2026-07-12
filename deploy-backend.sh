#!/bin/bash
# =============================================
# DESKTO Backend Deployment Script
# Run this on EC2: sudo bash deploy-backend.sh
# =============================================

set -e

echo "========================================="
echo "  DESKTO Backend Deployment"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKEND_DIR="/home/ec2-user/backend"
SERVICE_NAME="deskto-backend"
DB_HOST="deskto-website-postgres.cto4qa26irya.ap-south-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="deskto_db"
DB_USER="deskto_admin"

echo -e "${GREEN}[1/6]${NC} Creating backend directory..."
mkdir -p "$BACKEND_DIR/src"

echo -e "${GREEN}[2/6]${NC} Installing Node.js dependencies..."
cd "$BACKEND_DIR"

# Check if package.json exists, if not create one
if [ ! -f package.json ]; then
  npm init -y
fi

# Install dependencies
npm install express cors helmet morgan dotenv pg bcryptjs jsonwebtoken uuid express-validator 2>&1 | tail -5

echo -e "${GREEN}[3/6]${NC} Creating backend index.js..."
# The main backend code will be created separately
echo "Backend code will be placed in: $BACKEND_DIR/src/index.js"

echo -e "${GREEN}[4/6]${NC} Creating environment file..."
# Environment variables will be set up separately
echo "Environment file will be: $BACKEND_DIR/.env"

echo -e "${GREEN}[5/6]${NC} Creating systemd service..."
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=DESKTO Backend API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=$BACKEND_DIR
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=deskto-backend
EnvironmentFile=$BACKEND_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo -e "${GREEN}  Systemd service created${NC}"

echo -e "${GREEN}[6/6]${NC} Setup complete!"
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Add database password to .env"
echo "  2. Place backend code in src/index.js"
echo "  3. Run: sudo systemctl enable --now $SERVICE_NAME"
echo "  4. Run: sudo systemctl status $SERVICE_NAME"
echo ""
echo "========================================="
