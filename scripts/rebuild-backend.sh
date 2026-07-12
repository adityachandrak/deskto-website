#!/usr/bin/env bash
# Rebuild the local Docker backend image with the latest source and restart
# the running container. Use this after pulling new code to pick up new
# routes — without it, the deskto-backend container can be days behind the
# working tree, and admin calls will hit "404 Route not found" because the
# container is missing the route module entirely.
#
# Reads DB / JWT config from the running container's env so the rebuilt
# container connects to the same Postgres instance.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/backend"

CONTAINER_NAME="${CONTAINER_NAME:-deskto-backend}"
IMAGE_NAME="${IMAGE_NAME:-deskto-backend:latest}"
NETWORK_NAME="${NETWORK_NAME:-deskto-net}"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ docker not found in PATH" >&2
  exit 1
fi

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "ℹ️  No running container named $CONTAINER_NAME — building image only."
  docker build -t "$IMAGE_NAME" .
  echo "✅ Built $IMAGE_NAME"
  exit 0
fi

echo "🛑 Stopping existing $CONTAINER_NAME container"
docker rm -f "$CONTAINER_NAME" >/dev/null

echo "🔨 Building $IMAGE_NAME from $REPO_ROOT/backend"
docker build -t "$IMAGE_NAME" .

echo "🚀 Starting new container on network $NETWORK_NAME"
# Pass through every env var the previous container had so DB / JWT config is
# preserved. Use docker inspect to grab the exact env from the stopped
# container's most-recent definition.
ENV_ARGS=()
while IFS= read -r line; do
  ENV_ARGS+=("-e" "$line")
done < <(docker inspect "$CONTAINER_NAME" --format='{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null || true)

# docker inspect on a removed container returns nothing — fall back to the
# compose project's defaults if needed.
if [ ${#ENV_ARGS[@]} -eq 0 ]; then
  echo "⚠️  Could not read env from old container — falling back to compose defaults"
  docker compose up -d "$CONTAINER_NAME"
  exit 0
fi

docker run -d \
  --name "$CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  -p 3001:3001 \
  --restart unless-stopped \
  "${ENV_ARGS[@]}" \
  "$IMAGE_NAME"

echo "⏳ Waiting for /health"
for i in {1..20}; do
  if curl -fsS "http://localhost:3001/health" >/dev/null 2>&1; then
    echo "✅ $CONTAINER_NAME is healthy"
    echo ""
    echo "Verify the CMS routes are now registered:"
    curl -s -o /dev/null -w "  GET /api/version → %{http_code}\n" 'http://localhost:3001/api/version' || true
    curl -s -o /dev/null -w "  GET /api/public/homepage-content → %{http_code}\n" 'http://localhost:3001/api/public/homepage-content' || true
    exit 0
  fi
  sleep 1
done

echo "❌ $CONTAINER_NAME did not become healthy in 20s — check 'docker logs $CONTAINER_NAME'" >&2
exit 1