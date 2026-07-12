#!/usr/bin/env bash
# One-command recovery for the "admin publish returns Route not found" symptom.
# Rebuilds the local backend Docker image with the latest source, restarts the
# container, then runs the CMS-routes health check to confirm the admin CMS
# endpoints are reachable. Use this after pulling code that adds new admin
# routes.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "── DESKTO rebuild + verify ─────────────────────────────────"
echo "Repo: $REPO_ROOT"
echo ""

if ! bash "$REPO_ROOT/scripts/rebuild-backend.sh"; then
  echo ""
  echo "❌ rebuild-backend.sh failed — see errors above" >&2
  exit 1
fi

echo ""
echo "Verifying CMS routes are registered..."
echo ""
if ! bash "$REPO_ROOT/scripts/validate-backend-has-cms-routes.sh"; then
  echo ""
  echo "❌ CMS route health check failed even after rebuild." >&2
  echo "   Check 'docker logs deskto-backend' for startup errors." >&2
  exit 1
fi

echo ""
echo "✅ Admin publish should now reach the backend. Try again in the admin dashboard."