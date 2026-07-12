#!/usr/bin/env bash
# End-to-end smoke test that exercises the full admin → DB → public
# propagation flow against the running local backend. Run after
# `scripts/rebuild-backend.sh` (or after a CI deploy) to prove that:
#
#   1. An admin can sign in (POST /api/auth/login returns an access token)
#   2. The admin CMS list works (GET /api/admin/homepage-content returns rows)
#   3. The admin can CREATE a new featured-build (POST returns 201 with id)
#   4. The admin can PUBLISH it (PATCH /publish flips status='published')
#   5. An anonymous visitor sees the freshly-published row on the public
#      homepage feed (GET /api/public/homepage-content includes it)
#   6. The admin can UPDATE the row (PUT body) and the visitor sees the
#      new title on the public feed within 60s — proves the cross-device
#      propagation
#   7. The admin can DELETE the row and the visitor no longer sees it
#
# Exits 0 on success, non-zero on any failure.

set -uo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@deskto.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
SLUG="e2e-test-$(date +%s)"

PASS=0
FAIL=0
pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

curl_get() {
  # Usage: curl_get URL [extra curl args...]
  local url="$1"; shift
  curl -sS "$@" "$url"
}
curl_post() {
  # Usage: curl_post DATA URL [extra curl args...]
  local data="$1"; local url="$2"; shift 2
  curl -sS -X POST -H "Content-Type: application/json" --data "$data" "$@" "$url"
}
curl_put() {
  # Usage: curl_put DATA URL [extra curl args...]
  local data="$1"; local url="$2"; shift 2
  curl -sS -X PUT -H "Content-Type: application/json" --data "$data" "$@" "$url"
}
curl_patch() {
  # Usage: curl_patch URL [extra curl args...]
  local url="$1"; shift
  curl -sS -X PATCH "$@" "$url"
}
curl_delete() {
  # Usage: curl_delete URL [extra curl args...]
  local url="$1"; shift
  curl -sS -X DELETE "$@" "$url"
}
status_of() {
  curl -sS -o /dev/null -w '%{http_code}' "$@"
}
json_field() {
  python3 -c "import sys, json; print(json.load(sys.stdin).get('$1', ''))" <<<"$2"
}

echo ""
echo "── End-to-End Publish Propagation ─────────────────────────"
echo "Backend: $BACKEND_URL"
echo "Test slug: $SLUG"
echo ""

# 1. Admin login
login_json=$(curl_post "{\"identifier\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "$BACKEND_URL/api/auth/login")
TOKEN=$(json_field accessToken "$login_json")
[ -n "$TOKEN" ] && pass "Admin login succeeded ($((${#TOKEN})) char token)" || fail "Admin login failed"

if [ -z "$TOKEN" ]; then
  echo ""
  echo "Result: $PASS passed, $FAIL failed"
  exit 1
fi

# 2. Admin list
list_json=$(curl_get "$BACKEND_URL/api/admin/homepage-content?type=featured-build" -H "Authorization: Bearer $TOKEN")
list_count=$(python3 -c "import sys, json; rows = json.load(sys.stdin); print(len(rows) if isinstance(rows, list) else -1)" <<<"$list_json")
[ "$list_count" -ge 0 ] && pass "GET /api/admin/homepage-content?type=featured-build returns $list_count rows" || fail "Admin list returned non-array: $list_json"

# 3. CREATE a featured build (initially draft)
create_json=$(curl_post '{"type":"featured-build","title":"E2E Test Build","slug":"'"$SLUG"'","specs":"test specs","shortDescription":"smoke test"}' "$BACKEND_URL/api/admin/homepage-content" -H "Authorization: Bearer $TOKEN")
NEW_ID=$(json_field id "$create_json")
NEW_STATUS=$(json_field status "$create_json")
[ -n "$NEW_ID" ] && pass "POST /api/admin/homepage-content created row id=$NEW_ID, status=$NEW_STATUS" || fail "Create failed: $create_json"

# 4. PUBLISH the row
pub_json=$(curl_patch "$BACKEND_URL/api/admin/homepage-content/$NEW_ID/publish" -H "Authorization: Bearer $TOKEN")
PUB_STATUS=$(json_field status "$pub_json")
[ "$PUB_STATUS" = "published" ] && pass "PATCH /api/admin/homepage-content/$NEW_ID/publish set status=published" || fail "Publish failed: $pub_json"

# 5. Public read (anonymous)
public_json=$(curl_get "$BACKEND_URL/api/public/homepage-content?type=featured-build")
E2E_FOUND=$(python3 -c "
import sys, json
rows = json.load(sys.stdin)
hits = [r for r in rows if r.get('slug') == '$SLUG']
print('yes' if hits else 'no')
print(len(rows))
" <<<"$public_json" | head -1)
PUB_TOTAL=$(python3 -c "
import sys, json
rows = json.load(sys.stdin)
hits = [r for r in rows if r.get('slug') == '$SLUG']
print('yes' if hits else 'no')
print(len(rows))
" <<<"$public_json" | tail -1)
[ "$E2E_FOUND" = "yes" ] && pass "Anonymous GET /api/public/homepage-content?type=featured-build sees the freshly published row (total=$PUB_TOTAL rows)" || fail "Public feed missing the test row"

# 6. UPDATE the row
update_json=$(curl_put '{"type":"featured-build","title":"E2E UPDATED","slug":"'"$SLUG"'","specs":"updated specs"}' "$BACKEND_URL/api/admin/homepage-content/$NEW_ID" -H "Authorization: Bearer $TOKEN")
UPD_TITLE=$(json_field title "$update_json")
[ "$UPD_TITLE" = "E2E UPDATED" ] && pass "PUT /api/admin/homepage-content/$NEW_ID updated title to '$UPD_TITLE'" || fail "Update failed: $update_json"

# 7. Public read again (should reflect update)
sleep 1
public_json2=$(curl_get "$BACKEND_URL/api/public/homepage-content?type=featured-build")
UPD_FOUND=$(python3 -c "
import sys, json
rows = json.load(sys.stdin)
hits = [r for r in rows if r.get('slug') == '$SLUG' and r.get('title') == 'E2E UPDATED']
print('yes' if hits else 'no')
" <<<"$public_json2")
[ "$UPD_FOUND" = "yes" ] && pass "Public feed sees the updated title — cross-device propagation works" || fail "Public feed did not pick up the update"

# 8. DELETE the row
del_code=$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/admin/homepage-content/$NEW_ID")
[ "$del_code" = "200" ] && pass "DELETE /api/admin/homepage-content/$NEW_ID returned 200" || fail "Delete returned $del_code"

# 9. Public read once more (should be empty for our slug)
sleep 1
public_json3=$(curl_get "$BACKEND_URL/api/public/homepage-content?type=featured-build")
DEL_FOUND=$(python3 -c "
import sys, json
rows = json.load(sys.stdin)
hits = [r for r in rows if r.get('slug') == '$SLUG']
print('yes' if hits else 'no')
" <<<"$public_json3")
[ "$DEL_FOUND" = "no" ] && pass "Public feed no longer returns the deleted row" || fail "Public feed still has the deleted row"

echo ""
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1