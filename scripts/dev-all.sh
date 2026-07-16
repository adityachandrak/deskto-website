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
# Otherwise, Docker is preferred when installed.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BACKEND_PORT="${BACKEND_PORT:-3001}"

if [[ "${DEV_BACKEND:-}" == "docker" ]]; then
  use_docker=1
elif [[ "${DEV_BACKEND:-}" == "node" ]]; then
  use_docker=0
elif command -v docker >/dev/null 2>&1; then
  use_docker=1
else
  use_docker=0
fi

if [[ "$use_docker" == "1" ]]; then
  echo "▶ [dev-all] Using Docker for the backend"
  bash "$REPO_ROOT/scripts/rebuild-backend.sh"
  echo "▶ [dev-all] Backend is up. Starting Vite at http://localhost:5173 (proxy /api → :$BACKEND_PORT)"
  exec npx vite
fi

echo "▶ [dev-all] Docker unavailable — running backend via ts-node + nodemon"
echo "▶ [dev-all] Backend will listen on :$BACKEND_PORT; Vite will proxy /api → it"

PIDS=()
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
  exit 0
}
trap cleanup INT TERM

(cd "$REPO_ROOT/backend" && PORT="$BACKEND_PORT" exec npx nodemon --exec ts-node src/index.ts) &
PIDS+=($!)
echo "▶ [dev-all] Backend pid=${PIDS[-1]}"

sleep 3

npx vite &
PIDS+=($!)
echo "▶ [dev-all] Vite pid=${PIDS[-1]} (proxy → :$BACKEND_PORT)"

wait -n "${PIDS[@]}"
status=$?
cleanup
exit $status