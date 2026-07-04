#!/bin/bash
# Bootstrap EC2 via AWS SSM (no SSH needed)
# Run: ./scripts/ec2-bootstrap-ssm.sh

set -e

INSTANCE_ID="${1:-i-0b652e38103c7635a}"
REGION="ap-south-1"

echo "=========================================="
echo "EC2 Bootstrap via SSM"
echo "=========================================="
echo "Instance ID: ${INSTANCE_ID}"
echo "Region: ${REGION}"
echo ""

# Wait for SSM to be ready
echo "Waiting for SSM agent to be online..."
for i in {1..30}; do
  STATUS=$(aws ssm describe-instance-information \
    --region ${REGION} \
    --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
    --query "InstanceInformationList[0].PingStatus" \
    --output text 2>/dev/null || echo "unknown")

  if [ "$STATUS" = "Online" ]; then
    echo "✅ SSM agent is Online"
    break
  fi
  echo "  Attempt $i/30: SSM status = $STATUS — waiting 10s..."
  sleep 10
done

if [ "$STATUS" != "Online" ]; then
  echo "❌ SSM agent not online after 5 minutes"
  exit 1
fi

echo ""
echo "Step 1: Install Docker CE..."

COMMAND_ID=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "set -e",
    "# Install Docker prerequisites",
    "yum update -y",
    "yum install -y yum-utils device-mapper-persistent-data lvm2",
    "# Add Docker yum repo (for AL2023)",
    "yum-config-manager --add-repo https://download.docker.com/linux/amazonlinux/docker-ce.repo",
    "# Install Docker CE",
    "yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
    "# Start and enable Docker",
    "systemctl enable --now docker",
    "usermod -aG docker ec2-user",
    "# Verify",
    "docker --version"
  ]' \
  --comment "Install Docker CE" \
  --output text --query "Command.CommandId")

echo "  Command ID: ${COMMAND_ID}"

# Wait for command to complete
echo "  Waiting for command to complete..."
for i in {1..30}; do
  STATUS=$(aws ssm get-command-invocation \
    --region ${REGION} \
    --command-id "${COMMAND_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --output text --query "Status" 2>/dev/null || echo "Pending")

  if [ "$STATUS" = "Success" ]; then
    echo "✅ Docker installed successfully"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardOutputContent" | tail -5
    break
  elif [ "$STATUS" = "Failed" ]; then
    echo "❌ Docker installation failed"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardErrorContent"
    exit 1
  fi
  echo "  Attempt $i/30: $STATUS — waiting 10s..."
  sleep 10
done

echo ""
echo "Step 2: Create deploy user..."

COMMAND_ID2=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "set -e",
    "# Create deploy user",
    "id deploy || useradd -m -s /bin/bash deploy",
    "usermod -aG docker deploy",
    "echo deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/systemctl restart deskto-website.service > /etc/sudoers.d/deploy-docker",
    "chmod 440 /etc/sudoers.d/deploy-docker",
    "# Install sudo",
    "yum install -y sudo",
    "# Verify",
    "id deploy"
  ]' \
  --comment "Create deploy user" \
  --output text --query "Command.CommandId")

echo "  Command ID: ${COMMAND_ID2}"

for i in {1..20}; do
  STATUS=$(aws ssm get-command-invocation \
    --region ${REGION} \
    --command-id "${COMMAND_ID2}" \
    --instance-id "${INSTANCE_ID}" \
    --output text --query "Status" 2>/dev/null || echo "Pending")

  if [ "$STATUS" = "Success" ]; then
    echo "✅ Deploy user created"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID2}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardOutputContent" | tail -5
    break
  elif [ "$STATUS" = "Failed" ]; then
    echo "❌ Deploy user creation failed"
    exit 1
  fi
  echo "  Attempt $i/20: $STATUS — waiting 10s..."
  sleep 10
done

echo ""
echo "Step 3: Install CloudWatch agent..."

COMMAND_ID3=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "set -e",
    "# Install CloudWatch agent",
    "yum install -y amazon-cloudwatch-agent || echo CloudWatch install skipped",
    "systemctl enable --now amazon-cloudwatch-agent || echo CloudWatch service skipped",
    "# Configure unattended security updates",
    "yum install -y yum-cron",
    "systemctl enable --now yum-cron",
    "sed -i \"s/^update_cmd = default/update_cmd = security/\" /etc/yum/yum-cron.conf",
    "# Set up log rotation for Docker",
    "mkdir -p /etc/logrotate.d",
    "cat > /etc/logrotate.d/docker-containers << LOGROTATE",
    "/var/lib/docker/containers/*/*.log {",
    "    rotate 7",
    "    daily",
    "    compress",
    "    missingok",
    "    notifempty",
    "    copytruncate",
    "}",
    "LOGROTATE",
    "# Create project directory",
    "mkdir -p /opt/deskto-website",
    "# Store facts",
    "cat > /etc/deskto-website/ansible-facts.yml << FACTS",
    "---",
    "ec2_public_ip: 13.234.99.45",
    "ecr_repo_url: 898322960338.dkr.ecr.ap-south-1.amazonaws.com/deskto-web",
    "deploy_user: deploy",
    "project_name: deskto-website",
    "FACTS",
    "echo Bootstrap complete"
  ]' \
  --comment "Install CloudWatch + log rotation + unattended updates" \
  --output text --query "Command.CommandId")

echo "  Command ID: ${COMMAND_ID3}"

for i in {1..30}; do
  STATUS=$(aws ssm get-command-invocation \
    --region ${REGION} \
    --command-id "${COMMAND_ID3}" \
    --instance-id "${INSTANCE_ID}" \
    --output text --query "Status" 2>/dev/null || echo "Pending")

  if [ "$STATUS" = "Success" ]; then
    echo "✅ CloudWatch and setup complete"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID3}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardOutputContent" | tail -10
    break
  elif [ "$STATUS" = "Failed" ]; then
    echo "❌ CloudWatch setup failed"
    aws ssm get-command-invocation \
      --region ${REGION} \
      --command-id "${COMMAND_ID3}" \
      --instance-id "${INSTANCE_ID}" \
      --output text --query "StandardErrorContent"
    exit 1
  fi
  echo "  Attempt $i/30: $STATUS — waiting 10s..."
  sleep 10
done

echo ""
echo "=========================================="
echo "✅ Bootstrap Complete"
echo "=========================================="
echo "Instance: ${INSTANCE_ID}"
echo "IP: 13.234.99.45"
echo "Docker: Installed and running"
echo "Deploy user: deploy"
echo "CloudWatch: Installed"
echo "Next: ./scripts/build-and-push.sh"
