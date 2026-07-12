#!/usr/bin/env bash
# End-to-end regression test that proves the local Docker backend has the
# homepage CMS routes registered. Run after `./scripts/rebuild-backend.sh`
# to confirm the container picked up the latest code. Without these routes
# every admin publish returns "404 Route not found" (or "401 Route not found"
# if a proxy rewrites the status) and the public homepage never updates.
#
# Usage:
#   ./scripts/validate-backend-has-cms-routes.sh                    # uses defaults
#   BACKEND_URL=http://localhost:3001 ./scripts/validate-backend-has-cms-routes.sh
#   ADMIN_EMAIL=admin@deskto.com ADMIN_PASSWORD=admin123 ./scripts/validate-backend-has-cms-routes.sh
#
# Returns 0 on full pass, non-zero on any failure.

set -uo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@deskto.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

PASS=0
FAIL=0
pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

curl_get() {
  curl -sS -o /dev/null -w '%{http_code}' "$1" 2>/dev/null || echo "000"
}

curl_post_json() {
  curl -sS -X POST -H "Content-Type: application/json" -d "$2" "$1" 2>/dev/null
}

echo ""
echo "── Backend CMS Routes Health ──────────────────────────────"
echo "Target: $BACKEND_URL"

# 1. Health
status=$(curl_get "$BACKEND_URL/health")
if [ "$status" = "200" ]; then
  pass "Backend health endpoint returns 200"
else
  fail "Backend health endpoint returns $status (expected 200). Is the container running? Try ./scripts/rebuild-backend.sh"
  echo ""
  echo "Result: $PASS passed, $FAIL failed"
  exit 1
fi

# 2. /api/version should exist (added in the same commit as the CMS routes)
status=$(curl_get "$BACKEND_URL/api/version")
if [ "$status" = "200" ]; then
  pass "GET /api/version returns 200 (diagnostic route registered)"
else
  fail "GET /api/version returns $status (expected 200) — backend image is too old"
fi

# 3. Public homepage content list (anonymous, no auth)
status=$(curl_get "$BACKEND_URL/api/public/homepage-content")
if [ "$status" = "200" ]; then
  pass "GET /api/public/homepage-content returns 200 (public CMS read endpoint registered)"
else
  fail "GET /api/public/homepage-content returns $status (expected 200) — backend missing CMS routes"
fi

# 4. Admin login + list
echo ""
login_response=$(curl_post_json "$BACKEND_URL/api/auth/login" "{\"identifier\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
TOKEN=$(echo "$login_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('accessToken', ''))" 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  fail "Could not authenticate as $ADMIN_EMAIL — check credentials"
else
  pass "Authenticated as $ADMIN_EMAIL"
fi

if [ -n "$TOKEN" ]; then
  # 5. Admin list (the original failure mode from the user)
  status=$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/admin/homepage-content" 2>/dev/null)
  if [ "$status" = "200" ]; then
    pass "GET /api/admin/homepage-content (auth) returns 200 — admin CMS list works"
  else
    fail "GET /api/admin/homepage-content returns $status (expected 200) — admin cannot reach CMS"
  fi
fi

echo ""
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1