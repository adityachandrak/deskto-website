#!/bin/bash
# Deploy Docker container to EC2 via SSM commands
# Run: ./scripts/deploy-to-ec2.sh

set -e

INSTANCE_ID="${1:-i-0b652e38103c7635a}"
REGION="ap-south-1"
ECR_REPO="898322960338.dkr.ecr.ap-south-1.amazonaws.com/deskto-web"
IMAGE_TAG="${2:-sha-81f8a4c}"
PUBLIC_IP="13.234.99.45"

echo "=========================================="
echo "Deploy Deskto Website to EC2"
echo "=========================================="
echo "Instance ID: ${INSTANCE_ID}"
echo "Public IP: ${PUBLIC_IP}"
echo "ECR Image: ${ECR_REPO}:${IMAGE_TAG}"
echo ""

# Wait for SSM to be ready
echo "Checking SSM status..."
for i in {1..10}; do
  STATUS=$(aws ssm describe-instance-information \
    --region ${REGION} \
    --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
    --query "InstanceInformationList[0].PingStatus" \
    --output text 2>/dev/null || echo "unknown")

  if [ "$STATUS" = "Online" ]; then
    echo "✅ SSM agent is Online"
    break
  fi
  echo "  Attempt $i/10: SSM status = $STATUS — waiting 5s..."
  sleep 5
done

if [ "$STATUS" != "Online" ]; then
  echo "❌ SSM agent not online"
  exit 1
fi

echo ""
echo "Step 1: Update packages and install Docker..."

COMMAND_ID1=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "set -e",
    "echo \"=== OS Info ===\"",
    "cat /etc/os-release | head -5",
    "echo \"=== Updating packages ===\"",
    "dnf clean all || true",
    "dnf update -y || yum update -y",
    "echo \"=== Installing Docker ===\"",
    "dnf install -y docker || yum install -y docker",
    "echo \"=== Installing AWS CLI ===\"",
    "dnf install -y awscli || yum install -y awscli",
    "echo \"=== Starting Docker ===\"",
    "systemctl enable docker",
    "systemctl start docker",
    "echo \"=== Docker Status ===\"",
    "systemctl status docker --no-pager | head -10",
    "echo \"=== Docker Version ===\"",
    "docker --version"
  ]' \
  --comment "Install Docker and AWS CLI" \
  --timeout-seconds 300 \
  --output text --query "Command.CommandId")

echo "  Command ID: ${COMMAND_ID1}"

for i in {1..60}; do
  STATUS=$(aws ssm get-command-invocation \
    --region ${REGION} \
    --command-id "${COMMAND_ID1}" \
    --instance-id "${INSTANCE_ID}" \
    --output text --query "Status" 2>/dev/null || echo "Pending")

  if [ "$STATUS" = "Success" ]; then
    echo "✅ Docker installation complete"
    break
  elif [ "$STATUS" = "Failed" ]; then
    echo "❌ Docker installation failed"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID1}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardErrorContent"
    exit 1
  fi
  echo "  Attempt $i/60: $STATUS — waiting 10s..."
  sleep 10
done

echo ""
echo "Step 2: Login to ECR..."

COMMAND_ID2=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    \"set -e\",
    \"echo '=== ECR Login ==='\",
    \"aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO}\",
    \"echo 'ECR login successful'\"
  ]" \
  --comment "Login to ECR" \
  --timeout-seconds 60 \
  --output text --query "Command.CommandId")

echo "  Command ID: ${COMMAND_ID2}"

for i in {1..30}; do
  STATUS=$(aws ssm get-command-invocation \
    --region ${REGION} \
    --command-id "${COMMAND_ID2}" \
    --instance-id "${INSTANCE_ID}" \
    --output text --query "Status" 2>/dev/null || echo "Pending")

  if [ "$STATUS" = "Success" ]; then
    echo "✅ ECR login successful"
    break
  elif [ "$STATUS" = "Failed" ]; then
    echo "❌ ECR login failed - check IAM role permissions"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID2}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardErrorContent"
    exit 1
  fi
  echo "  Attempt $i/30: $STATUS — waiting 5s..."
  sleep 5
done

echo ""
echo "Step 3: Pull Docker image..."

COMMAND_ID3=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    \"set -e\",
    \"echo '=== Pulling image ==='\",
    \"docker pull ${ECR_REPO}:${IMAGE_TAG}\",
    \"echo '=== Listing images ==='\",
    \"docker images | grep deskto-web\"
  ]" \
  --comment "Pull Docker image from ECR" \
  --timeout-seconds 300 \
  --output text --query "Command.CommandId")

echo "  Command ID: ${COMMAND_ID3}"

for i in {1..60}; do
  STATUS=$(aws ssm get-command-invocation \
    --region ${REGION} \
    --command-id "${COMMAND_ID3}" \
    --instance-id "${INSTANCE_ID}" \
    --output text --query "Status" 2>/dev/null || echo "Pending")

  if [ "$STATUS" = "Success" ]; then
    echo "✅ Image pulled successfully"
    break
  elif [ "$STATUS" = "Failed" ]; then
    echo "❌ Image pull failed"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID3}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardErrorContent"
    exit 1
  fi
  echo "  Attempt $i/60: $STATUS — waiting 10s..."
  sleep 10
done

echo ""
echo "Step 4: Stop existing container if exists..."

COMMAND_ID4=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    \"set -e\",
    \"echo '=== Checking existing containers ==='\",
    \"docker ps -a | grep deskto-web || echo 'No existing container'\",
    \"docker rm -f deskto-web 2>/dev/null || echo 'No container to remove'\",
    \"echo '=== Old container removed (if existed) ==='\"
  ]" \
  --comment "Remove existing container" \
  --timeout-seconds 30 \
  --output text --query "Command.CommandId")

echo "  Command ID: ${COMMAND_ID4}"

sleep 10

echo ""
echo "Step 5: Run Docker container..."

COMMAND_ID5=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    \"set -e\",
    \"echo '=== Starting container ==='\",
    \"docker run -d --name deskto-web --restart unless-stopped -p 80:80 ${ECR_REPO}:${IMAGE_TAG}\",
    \"echo '=== Container started ==='\",
    \"sleep 5\",
    \"echo '=== Container status ==='\",
    \"docker ps\",
    \"echo '=== Container logs ==='\",
    \"docker logs --tail 20 deskto-web\"
  ]" \
  --comment "Start Docker container" \
  --timeout-seconds 60 \
  --output text --query "Command.CommandId")

echo "  Command ID: ${COMMAND_ID5}"

for i in {1..30}; do
  STATUS=$(aws ssm get-command-invocation \
    --region ${REGION} \
    --command-id "${COMMAND_ID5}" \
    --instance-id "${INSTANCE_ID}" \
    --output text --query "Status" 2>/dev/null || echo "Pending")

  if [ "$STATUS" = "Success" ]; then
    echo "✅ Container started successfully"
    break
  elif [ "$STATUS" = "Failed" ]; then
    echo "❌ Container start failed"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID5}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardErrorContent"
    exit 1
  fi
  echo "  Attempt $i/30: $STATUS — waiting 10s..."
  sleep 10
done

echo ""
echo "Step 6: Test website inside EC2..."

COMMAND_ID6=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    \"echo '=== Testing localhost ==='\",
    \"curl -I http://localhost\",
    \"echo ''\",
    \"echo '=== Testing from public IP ==='\",
    \"curl -I http://${PUBLIC_IP}/\"
  ]" \
  --comment "Test website from EC2" \
  --timeout-seconds 30 \
  --output text --query "Command.CommandId")

echo "  Command ID: ${COMMAND_ID6}"

sleep 10

for i in {1..20}; do
  STATUS=$(aws ssm get-command-invocation \
    --region ${REGION} \
    --command-id "${COMMAND_ID6}" \
    --instance-id "${INSTANCE_ID}" \
    --output text --query "Status" 2>/dev/null || echo "Pending")

  if [ "$STATUS" = "Success" ]; then
    echo "✅ Website tests complete"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID6}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardOutputContent"
    break
  fi
  echo "  Attempt $i/20: $STATUS — waiting 5s..."
  sleep 5
done

echo ""
echo "=========================================="
echo "✅ Deployment Complete"
echo "=========================================="
echo "Instance: ${INSTANCE_ID}"
echo "Public IP: ${PUBLIC_IP}"
echo "Website: http://${PUBLIC_IP}/"
echo ""
echo "Test in browser:"
echo "  http://${PUBLIC_IP}/"
