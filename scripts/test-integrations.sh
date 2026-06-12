#!/usr/bin/env bash
# scripts/test-integrations.sh
# Tests GitHub and Slack live connectors via the platform API.
# Usage: bash scripts/test-integrations.sh [API_BASE]
# Example: bash scripts/test-integrations.sh http://localhost:3000
set -euo pipefail

BASE="${1:-http://localhost:3000}"
TOKEN="${ADMIN_TOKEN:-changeme}"
PASS=0; FAIL=0

green() { printf '\033[32m[PASS]\033[0m %s\n' "$1"; PASS=$((PASS+1)); }
red()   { printf '\033[31m[FAIL]\033[0m %s — %s\n' "$1" "$2"; FAIL=$((FAIL+1)); }

h() {
  curl -sS -w '\n__HTTP__%{http_code}' \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$@"
}

check() {
  local label="$1"; shift
  local out
  out=$(h "$@" 2>&1)
  local code
  code=$(printf '%s' "$out" | grep -o '__HTTP__[0-9]*' | cut -c9-)
  local body
  body=$(printf '%s' "$out" | sed 's/__HTTP__[0-9]*$//')
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    green "$label (HTTP $code)"
    echo "    $body" | python3 -c "import sys,json; d=json.load(sys.stdin); print('   ',json.dumps({k:d[k] for k in list(d)[:6]}, indent=2)[:300])" 2>/dev/null || true
  else
    red "$label" "HTTP $code — $body"
  fi
}

echo ""
echo "=== Integration Connector Tests ==="
echo "API: $BASE"
echo ""

# ── Health check ──────────────────────────────────────────────────
check "Health check" "$BASE/health/live"

# ── GitHub live test ──────────────────────────────────────────────
echo ""
echo "--- GitHub ---"
GITHUB_ID=$(h -X GET "$BASE/api/integrations" | sed 's/__HTTP__[0-9]*$//' \
  | python3 -c "import sys,json; rows=json.load(sys.stdin); r=[x for x in rows if x.get('provider')=='github']; print(r[0]['id'] if r else '')" 2>/dev/null || echo "")

if [ -z "$GITHUB_ID" ]; then
  red "GitHub integration row" "Not found in DB — seed or create via POST /api/integrations"
else
  check "GitHub Test Connection (id=$GITHUB_ID)" -X POST "$BASE/api/integrations/$GITHUB_ID/test"
fi

# ── Slack live test ───────────────────────────────────────────────
echo ""
echo "--- Slack ---"
SLACK_ID=$(h -X GET "$BASE/api/integrations" | sed 's/__HTTP__[0-9]*$//' \
  | python3 -c "import sys,json; rows=json.load(sys.stdin); r=[x for x in rows if x.get('provider')=='slack']; print(r[0]['id'] if r else '')" 2>/dev/null || echo "")

if [ -z "$SLACK_ID" ]; then
  red "Slack integration row" "Not found in DB — seed or create via POST /api/integrations"
else
  check "Slack Test Connection (id=$SLACK_ID)" -X POST "$BASE/api/integrations/$SLACK_ID/test"
fi

# ── Plane still working ───────────────────────────────────────────
echo ""
echo "--- Plane PM Bridge ---"
check "Plane ping" -X POST "$BASE/api/pm/ping"

# ── Webhook endpoints reachable ───────────────────────────────────
echo ""
echo "--- Webhook endpoints ---"
# Slack URL verification challenge
SLK=$(curl -sS -w '\n__HTTP__%{http_code}' -X POST "$BASE/webhooks/slack" \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test-challenge-abc"}')
SLK_CODE=$(printf '%s' "$SLK" | grep -o '__HTTP__[0-9]*' | cut -c9-)
SLK_BODY=$(printf '%s' "$SLK" | sed 's/__HTTP__[0-9]*$//')
if printf '%s' "$SLK_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('challenge')=='test-challenge-abc'" 2>/dev/null; then
  green "POST /webhooks/slack url_verification (HTTP $SLK_CODE)"
else
  red "POST /webhooks/slack url_verification" "HTTP $SLK_CODE — $SLK_BODY"
fi

# GitHub webhook (no valid sig — expect 401 if secret set, or 200 if not)
GH=$(curl -sS -w '\n__HTTP__%{http_code}' -X POST "$BASE/webhooks/github" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -d '{"zen":"Keep it logically awesome.","hook_id":1}')
GH_CODE=$(printf '%s' "$GH" | grep -o '__HTTP__[0-9]*' | cut -c9-)
if [ "$GH_CODE" = "200" ] || [ "$GH_CODE" = "401" ]; then
  green "POST /webhooks/github reachable (HTTP $GH_CODE — sig check active=$( [ "$GH_CODE" = "401" ] && echo yes || echo no))"
else
  red "POST /webhooks/github" "HTTP $GH_CODE — unexpected"
fi

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo "==================================="
echo "PASS: $PASS   FAIL: $FAIL"
TOTAL=$((PASS+FAIL))
echo "Total: $TOTAL"
if [ "$FAIL" -eq 0 ]; then
  echo "All integration tests passed."
  exit 0
else
  echo "Some tests failed."
  exit 1
fi
