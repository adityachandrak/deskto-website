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

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker daemon is not reachable. Start Docker Desktop, then rerun this script." >&2
  exit 1
fi

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "ℹ️  No running container named $CONTAINER_NAME — building image only."
  docker build -t "$IMAGE_NAME" .
  echo "✅ Built $IMAGE_NAME"
  exit 0
fi

# Capture the old container configuration before removing it. Inspecting after
# `docker rm` returns nothing and used to restart the API without its DB/JWT
# environment, which made the CMS appear to save only in the admin browser.
CONTAINER_ENV=()
while IFS= read -r line; do
  [ -n "$line" ] && CONTAINER_ENV+=("$line")
done < <(docker inspect "$CONTAINER_NAME" --format='{{range .Config.Env}}{{println .}}{{end}}')
CONTAINER_NETWORKS=()
while IFS= read -r line; do
  [ -n "$line" ] && CONTAINER_NETWORKS+=("$line")
done < <(docker inspect "$CONTAINER_NAME" --format='{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}')
HOST_PORT="$(docker inspect "$CONTAINER_NAME" --format='{{with (index (index .HostConfig.PortBindings "3001/tcp") 0)}}{{.HostPort}}{{end}}')"
HOST_PORT="${HOST_PORT:-3001}"

if [ ${#CONTAINER_ENV[@]} -eq 0 ]; then
  echo "❌ Refusing to replace $CONTAINER_NAME: could not read its environment" >&2
  exit 1
fi

PRIMARY_NETWORK="${CONTAINER_NETWORKS[0]:-bridge}"

echo "🔨 Building $IMAGE_NAME from $REPO_ROOT/backend"
docker build -t "$IMAGE_NAME" .

echo "🛑 Replacing existing $CONTAINER_NAME container"
docker rm -f "$CONTAINER_NAME" >/dev/null

echo "🚀 Starting new container on network $PRIMARY_NETWORK"
ENV_ARGS=()
for line in "${CONTAINER_ENV[@]}"; do
  ENV_ARGS+=("-e" "$line")
done

docker run -d \
  --name "$CONTAINER_NAME" \
  --network "$PRIMARY_NETWORK" \
  -p "$HOST_PORT:3001" \
  --restart unless-stopped \
  "${ENV_ARGS[@]}" \
  "$IMAGE_NAME"

echo "⏳ Waiting for /health"
for i in {1..20}; do
  if curl -fsS "http://localhost:$HOST_PORT/health" >/dev/null 2>&1; then
    echo "✅ $CONTAINER_NAME is healthy"
    echo ""
    echo "Verify the CMS routes are now registered:"
    version_status="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$HOST_PORT/api/version")"
    cms_status="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$HOST_PORT/api/public/homepage-content")"
    echo "  GET /api/version -> $version_status"
    echo "  GET /api/public/homepage-content -> $cms_status"
    if [ "$version_status" = "200" ] && [ "$cms_status" = "200" ]; then
      exit 0
    fi
    echo "❌ Backend is healthy but the CMS routes are not ready" >&2
    docker logs --tail 100 "$CONTAINER_NAME" >&2 || true
    exit 1
  fi
  sleep 1
done

echo "❌ $CONTAINER_NAME did not become healthy in 20s — check 'docker logs $CONTAINER_NAME'" >&2
exit 1
