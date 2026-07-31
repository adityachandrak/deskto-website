#!/usr/bin/env bash
# Run backend + frontend together for local development.
#
# - If Docker is available, rebuilds the backend image with the latest code
#   (so /api/admin/homepage-content/* routes are always registered), starts
#   the container, and then starts Vite. Vite proxies /api/* to the backend
#   so the SPA works end-to-end.
# - If Docker is not available, falls back to running the Node backend via
#   nodemon + ts-node and Vite in parallel so the SPA still has a working
#   cross-device publish path.
#
# Press Ctrl-C once to stop both processes cleanly.
#
# Override the backend mode:
#   DEV_BACKEND=docker  # force Docker
#   DEV_BACKEND=node    # force Node
# Otherwise, Docker is preferred when installed and the daemon is reachable.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BACKEND_PORT_WAS_SET="${BACKEND_PORT+x}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT_WAS_SET="${FRONTEND_PORT+x}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

port_is_available() {
  node -e "
const net = require('net');
const port = Number(process.argv[1]);
const server = net.createServer();
server.once('error', () => process.exit(1));
server.once('listening', () => server.close(() => process.exit(0)));
server.listen(port, '127.0.0.1');
" "$1" >/dev/null 2>&1
}

docker_is_ready() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

if [[ "${DEV_BACKEND:-}" == "docker" ]]; then
  use_docker=1
elif [[ "${DEV_BACKEND:-}" == "node" ]]; then
  use_docker=0
elif docker_is_ready; then
  use_docker=1
else
  use_docker=0
fi

if [[ "$use_docker" == "1" ]]; then
  echo "▶ [dev-all] Using Docker for the backend"
  if ! docker_is_ready; then
    echo "❌ [dev-all] Docker was requested, but the Docker daemon is not reachable." >&2
    echo "   Start Docker Desktop, or run DEV_BACKEND=node npm run dev to use the local Node backend." >&2
    exit 1
  fi
  bash "$REPO_ROOT/scripts/rebuild-backend.sh"
  echo "▶ [dev-all] Backend is up. Starting Vite at http://localhost:5173 (proxy /api → :$BACKEND_PORT)"
  exec npx vite
fi

if command -v docker >/dev/null 2>&1; then
  echo "▶ [dev-all] Docker CLI found, but daemon is not reachable — running backend via ts-node + nodemon"
else
  echo "▶ [dev-all] Docker unavailable — running backend via ts-node + nodemon"
fi

if [[ -n "$BACKEND_PORT_WAS_SET" ]]; then
  if ! port_is_available "$BACKEND_PORT"; then
    echo "❌ [dev-all] BACKEND_PORT=$BACKEND_PORT is already in use." >&2
    echo "   Stop the process using it, or choose another port with BACKEND_PORT=3002 npm run dev." >&2
    exit 1
  fi
else
  while ! port_is_available "$BACKEND_PORT"; do
    echo "ℹ️  [dev-all] Backend port $BACKEND_PORT is in use; trying $((BACKEND_PORT + 1))"
    BACKEND_PORT=$((BACKEND_PORT + 1))
  done
fi

if [[ -n "$FRONTEND_PORT_WAS_SET" ]]; then
  if ! port_is_available "$FRONTEND_PORT"; then
    echo "❌ [dev-all] FRONTEND_PORT=$FRONTEND_PORT is already in use." >&2
    echo "   Stop the process using it, or choose another port with FRONTEND_PORT=5174 npm run dev." >&2
    exit 1
  fi
else
  while ! port_is_available "$FRONTEND_PORT"; do
    echo "ℹ️  [dev-all] Frontend port $FRONTEND_PORT is in use; trying $((FRONTEND_PORT + 1))"
    FRONTEND_PORT=$((FRONTEND_PORT + 1))
  done
fi

echo "▶ [dev-all] Backend will listen on :$BACKEND_PORT; Vite will proxy /api → it"
echo "▶ [dev-all] Frontend will run at http://127.0.0.1:$FRONTEND_PORT/"

PIDS=()
CLEANUP_STATUS=0
cleanup() {
  set +e
  echo ""
  echo "▶ [dev-all] Stopping…"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  pkill -f "ts-node src/index.ts" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  wait 2>/dev/null || true
  exit "$CLEANUP_STATUS"
}
trap cleanup INT TERM

(cd "$REPO_ROOT/backend" && PORT="$BACKEND_PORT" exec npx nodemon --exec ts-node src/index.ts) &
backend_pid=$!
PIDS+=("$backend_pid")
echo "▶ [dev-all] Backend pid=$backend_pid"

sleep 3

VITE_API_PROXY_TARGET="http://127.0.0.1:$BACKEND_PORT" npx vite --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort &
vite_pid=$!
PIDS+=("$vite_pid")
echo "▶ [dev-all] Vite pid=$vite_pid (proxy → :$BACKEND_PORT)"

status=0
while true; do
  for pid in "${PIDS[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid" 2>/dev/null || status=$?
      CLEANUP_STATUS="$status"
      cleanup
    fi
  done
  sleep 1
done
cleanup
exit $status
