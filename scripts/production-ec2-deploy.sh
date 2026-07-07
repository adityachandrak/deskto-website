#!/usr/bin/env bash
set -Eeuo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

require_env AWS_REGION
require_env BACKEND_IMAGE
require_env FRONTEND_IMAGE
require_env WEBSITE_URL

PROJECT_NAME="${PROJECT_NAME:-deskto-website}"
APP_DIR="/opt/${PROJECT_NAME}"
ENV_FILE="${APP_DIR}/backend.env"
BACKEND_PORT="${BACKEND_PORT:-3001}"
REGISTRY="${BACKEND_IMAGE%%/*}"
FRONTEND_URLS_VALUE="${FRONTEND_URLS:-${WEBSITE_URL},http://deskto-website-alb-315326167.ap-south-1.elb.amazonaws.com}"

ssm_value() {
  aws ssm get-parameter \
    --name "$1" \
    --with-decryption \
    --region "${AWS_REGION}" \
    --query "Parameter.Value" \
    --output text
}

echo "Starting DESKTO production deploy"
echo "Backend image: ${BACKEND_IMAGE}"
echo "Frontend image: ${FRONTEND_IMAGE}"

mkdir -p "${APP_DIR}"
chmod 0755 "${APP_DIR}"

echo "Logging in to ECR"
aws ecr get-login-password --region "${AWS_REGION}" |
  docker login --username AWS --password-stdin "${REGISTRY}" >/dev/null

echo "Writing backend runtime environment from SSM"
umask 077
cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
DB_SSL=true
HOST=0.0.0.0
PORT=${BACKEND_PORT}
DB_HOST=$(ssm_value "/${PROJECT_NAME}/production/database-host")
DB_PORT=$(ssm_value "/${PROJECT_NAME}/production/database-port")
DB_NAME=$(ssm_value "/${PROJECT_NAME}/production/database-name")
DB_USER=$(ssm_value "/${PROJECT_NAME}/production/database-user")
DB_PASSWORD=$(ssm_value "/${PROJECT_NAME}/production/database-password")
JWT_SECRET=$(ssm_value "/${PROJECT_NAME}/production/jwt-secret")
PRODUCT_IMAGE_BUCKET=$(ssm_value "/${PROJECT_NAME}/production/product-image-bucket")
PRODUCT_IMAGE_CDN_URL=$(ssm_value "/${PROJECT_NAME}/production/product-image-cdn-url")
FRONTEND_URLS=${FRONTEND_URLS_VALUE}
EOF

echo "Pulling images"
docker pull "${BACKEND_IMAGE}"
docker pull "${FRONTEND_IMAGE}"

echo "Running database migrations"
docker run --rm \
  --env-file "${ENV_FILE}" \
  "${BACKEND_IMAGE}" \
  npm run migrate

echo "Restarting containers"
docker rm -f deskto-backend >/dev/null 2>&1 || true
docker rm -f deskto-web >/dev/null 2>&1 || true

docker run -d \
  --name deskto-backend \
  --restart unless-stopped \
  --env-file "${ENV_FILE}" \
  -p "${BACKEND_PORT}:3001" \
  "${BACKEND_IMAGE}" >/dev/null

docker run -d \
  --name deskto-web \
  --restart unless-stopped \
  --network host \
  "${FRONTEND_IMAGE}" >/dev/null

echo "Waiting for backend health"
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1; then
    echo "Backend health check passed"
    break
  fi
  sleep 2
done

curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health"
curl -fsSI "http://127.0.0.1/" | head -5

echo "Running container summary"
docker ps --format "{{.Names}} {{.Image}} {{.Status}}"

echo "DESKTO production deploy completed"
