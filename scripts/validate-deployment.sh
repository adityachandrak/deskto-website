#!/bin/bash
# Comprehensive End-to-End Deployment Validation

set -e

PUBLIC_IP="13.234.99.45"
ECR_REPO="898322960338.dkr.ecr.ap-south-1.amazonaws.com/deskto-web"
INSTANCE_ID="i-0b652e38103c7635a"
REGION="ap-south-1"
WEBSITE_URL="http://${PUBLIC_IP}"

ERRORS=0

echo "=========================================="
echo "END-TO-END DEPLOYMENT VALIDATION"
echo "=========================================="
echo "Instance: ${INSTANCE_ID}"
echo "Public IP: ${PUBLIC_IP}"
echo "Website: ${WEBSITE_URL}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. INFRASTRUCTURE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking EC2 Instance..."
STATE=$(aws ec2 describe-instances \
  --region ${REGION} \
  --instance-ids ${INSTANCE_ID} \
  --query "Reservations[].Instances[].State.Name" \
  --output text 2>/dev/null || echo "unknown")

if [ "$STATE" = "running" ]; then
  echo "   ✅ EC2 Instance: Running"
else
  echo "   ❌ EC2 Instance: $STATE"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Checking SSM Status..."
SSM_STATUS=$(aws ssm describe-instance-information \
  --region ${REGION} \
  --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
  --query "InstanceInformationList[0].PingStatus" \
  --output text 2>/dev/null || echo "unknown")

if [ "$SSM_STATUS" = "Online" ]; then
  echo "   ✅ SSM Agent: Online"
else
  echo "   ❌ SSM Agent: $SSM_STATUS"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. DOCKER CONTAINER VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking Docker Container Status..."
CMD_ID=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids ${INSTANCE_ID} \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["docker ps --format \"{{.Names}}: {{.Status}}\""]' \
  --output text --query "Command.CommandId")

sleep 5

CONTAINER_STATUS=$(aws ssm get-command-invocation \
  --region ${REGION} \
  --command-id "${CMD_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query "StandardOutputContent" \
  --output text 2>/dev/null | grep deskto-web || echo "")

if echo "$CONTAINER_STATUS" | grep -q "Up"; then
  echo "   ✅ Container: Running"
  echo "   $CONTAINER_STATUS"
else
  echo "   ❌ Container: Not running"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Checking Docker Image Version..."
CMD_ID2=$(aws ssm send-command \
  --region ${REGION} \
  --instance-ids ${INSTANCE_ID} \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["docker inspect deskto-web --format \"{{.Config.Image}}\""]' \
  --output text --query "Command.CommandId")

sleep 5

IMAGE_SHA=$(aws ssm get-command-invocation \
  --region ${REGION} \
  --command-id "${CMD_ID2}" \
  --instance-id "${INSTANCE_ID}" \
  --query "StandardOutputContent" \
  --output text 2>/dev/null | grep -o "sha-[a-z0-9]*" || echo "")

if [ -n "$IMAGE_SHA" ]; then
  echo "   ✅ Image Tag: ${IMAGE_SHA}"
else
  echo "   ❌ Image Tag: Not found"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. WEBSITE HTTP VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking HTTP Response..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${WEBSITE_URL})
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ HTTP Status: 200 OK"
else
  echo "   ❌ HTTP Status: $HTTP_CODE"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Checking Response Time..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" ${WEBSITE_URL})
echo "   ⏱️  Response Time: ${RESPONSE_TIME}s"

echo ""
echo "Checking Server Header..."
SERVER=$(curl -s -I ${WEBSITE_URL} | grep -i "^Server:" | cut -d' ' -f2 | tr -d '\r')
if [ -n "$SERVER" ]; then
  echo "   ✅ Server: ${SERVER}"
else
  echo "   ⚠️  Server header not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. WEBSITE CONTENT VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking HTML Content..."
HTML=$(curl -s ${WEBSITE_URL})

if echo "$HTML" | grep -q "Premium 3D Gaming Website"; then
  echo "   ✅ Title: Premium 3D Gaming Website"
else
  echo "   ❌ Title not found"
  ERRORS=$((ERRORS + 1))
fi

if echo "$HTML" | grep -q "immersive"; then
  echo "   ✅ Description keywords present"
else
  echo "   ⚠️  Description keywords missing"
fi

if echo "$HTML" | grep -q "text/html"; then
  echo "   ✅ Content-Type: text/html"
else
  echo "   ⚠️  Content-Type not verified"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. STATIC ASSETS VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking JavaScript Bundle..."
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${WEBSITE_URL}/assets/index-DQ8bNX_L.js)
if [ "$JS_STATUS" = "200" ]; then
  echo "   ✅ JavaScript Bundle (200 OK)"
else
  echo "   ❌ JavaScript Bundle (${JS_STATUS})"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Checking CSS Bundle..."
CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${WEBSITE_URL}/assets/index-ChWXuzUZ.css)
if [ "$CSS_STATUS" = "200" ]; then
  echo "   ✅ CSS Bundle (200 OK)"
else
  echo "   ❌ CSS Bundle (${CSS_STATUS})"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. ECR IMAGE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking Latest Image..."
LATEST_SHA=$(aws ecr describe-images \
  --region ${REGION} \
  --repository-name deskto-web \
  --image-ids imageTag=latest \
  --query "imageDetails[0].imageTags[?starts_with(@, 'sha-')]|[0]" \
  --output text 2>/dev/null || echo "")

if [ -n "$LATEST_SHA" ]; then
  echo "   ✅ Latest Image Tag: ${LATEST_SHA}"
else
  echo "   ❌ Latest image tag not found"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. SECURITY VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking for exposed sensitive data..."
if curl -s ${WEBSITE_URL} | grep -i "password\|secret\|api_key\|token" > /dev/null 2>&1; then
  echo "   ⚠️  Potential sensitive data in HTML (review needed)"
else
  echo "   ✅ No obvious sensitive data exposure"
fi

echo ""
echo "Checking Security Headers..."
SECURITY_HEADERS=$(curl -s -I ${WEBSITE_URL} | grep -i "x-frame-options\|x-content-type\|strict-transport" || echo "")
if [ -n "$SECURITY_HEADERS" ]; then
  echo "   ✅ Security headers present"
else
  echo "   ⚠️  Consider adding security headers (CSP, X-Frame-Options)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. GIT REPOSITORY VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking git status..."
if git diff --quiet && git diff --cached --quiet 2>/dev/null; then
  echo "   ✅ Working directory clean"
else
  echo "   ⚠️  Uncommitted changes present"
fi

echo ""
echo "Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "   ✅ Branch: ${CURRENT_BRANCH}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. DOCKER IMAGE SIZE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

IMAGE_SIZE=$(aws ecr describe-images \
  --region ${REGION} \
  --repository-name deskto-web \
  --image-ids imageTag=latest \
  --query "imageDetails[0].imageSizeInBytes" \
  --output text 2>/dev/null || echo "0")

if [ "$IMAGE_SIZE" != "0" ]; then
  SIZE_MB=$(echo "scale=2; $IMAGE_SIZE / 1024 / 1024" | bc 2>/dev/null || echo "N/A")
  echo "   ✅ Image Size: ${SIZE_MB} MB"
else
  echo "   ⚠️  Image size not available"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "10. PERFORMANCE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking Content Length..."
CONTENT_LENGTH=$(curl -s -I ${WEBSITE_URL} | grep -i "^Content-Length:" | cut -d' ' -f2 | tr -d '\r')
if [ -n "$CONTENT_LENGTH" ]; then
  echo "   ✅ Content-Length: ${CONTENT_LENGTH} bytes"
else
  echo "   ⚠️  Content-Length not specified"
fi

echo ""
echo "Checking Cache Headers..."
CACHE_HEADERS=$(curl -s -I ${WEBSITE_URL} | grep -i "etag\|last-modified\|cache-control" || echo "")
if [ -n "$CACHE_HEADERS" ]; then
  echo "   ✅ Cache headers present"
  echo "$CACHE_HEADERS" | sed 's/^/   /'
else
  echo "   ⚠️  No cache headers found"
fi

echo ""
echo "=========================================="
echo "VALIDATION SUMMARY"
echo "=========================================="

if [ $ERRORS -eq 0 ]; then
  echo "✅ ALL VALIDATIONS PASSED"
  echo ""
  echo "DEPLOYMENT SUCCESSFUL"
  echo "Website: ${WEBSITE_URL}"
  echo "Instance: ${INSTANCE_ID}"
  echo "Image: ${ECR_REPO}:${IMAGE_SHA:-latest}"
else
  echo "⚠️  $ERRORS VALIDATION(S) FAILED"
  echo ""
  echo "Please review the errors above and take corrective action."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "QUICK REFERENCE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Website URL:    ${WEBSITE_URL}"
echo "Public IP:      ${PUBLIC_IP}"
echo "Instance ID:    ${INSTANCE_ID}"
echo "ECR Repo:       ${ECR_REPO}"
echo "Region:         ${REGION}"
echo ""
echo "Useful Commands:"
echo "  View container logs:  aws ssm send-command --instance-ids ${INSTANCE_ID} --document-name 'AWS-RunShellScript' --parameters 'commands=[\"docker logs deskto-web\"]'"
echo "  Restart container:    aws ssm send-command --instance-ids ${INSTANCE_ID} --document-name 'AWS-RunShellScript' --parameters 'commands=[\"docker restart deskto-web\"]'"
echo "  Redeploy:             ./scripts/deploy-to-ec2.sh ${INSTANCE_ID} sha-$(git rev-parse --short HEAD)"
echo "=========================================="

exit $ERRORS
