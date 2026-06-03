#!/usr/bin/env bash
# MVP API validation — run on EC2 or local with stack up
set -euo pipefail
BASE="${API_BASE:-http://127.0.0.1:3000}"
TOKEN="${ADMIN_TOKEN:-changeme}"
ROLE="${TEST_ROLE:-admin}"

curl_api() {
  local method="$1" url="$2"
  local data="${3:-}"
  local args=(-sS -w "%{http_code}" -o /tmp/api-out.json)
  args+=(-H "Authorization: Bearer ${TOKEN}" -H "x-user-role: ${ROLE}")
  if [[ -n "$data" ]]; then
    args+=(-H "Content-Type: application/json" -X "$method" -d "$data")
  else
    args+=(-X "$method")
  fi
  local code
  code=$(curl "${args[@]}" "$url")
  echo "${code}"
}

pass() { echo "PASS|$1|$2"; }
fail() { echo "FAIL|$1|$2|$(head -c 200 /tmp/api-out.json)"; }

check() {
  local name="$1" method="$2" url="$3" data="${4:-}"
  local code
  code=$(curl_api "$method" "$url" "$data")
  if [[ "$code" =~ ^2 ]]; then pass "$name" "$code"; else fail "$name" "$code"; fi
}

echo "# API Validation $(date -Iseconds)"
check "GET /health/live" GET "$BASE/health/live"
check "GET /api/dashboard/summary" GET "$BASE/api/dashboard/summary"
check "GET /api/skills" GET "$BASE/api/skills"
check "GET /api/packages" GET "$BASE/api/packages"
check "GET /api/suites" GET "$BASE/api/suites"
check "GET /api/overlays" GET "$BASE/api/overlays"
check "GET /api/customers" GET "$BASE/api/customers"
check "GET /api/workspaces" GET "$BASE/api/workspaces"
check "GET /api/entitlements" GET "$BASE/api/entitlements"
check "GET /api/credit-pools" GET "$BASE/api/credit-pools"
check "GET /api/agents" GET "$BASE/api/agents"
check "GET /api/runs" GET "$BASE/api/runs"
check "GET /api/approvals" GET "$BASE/api/approvals"
check "GET /api/integrations" GET "$BASE/api/integrations"
check "GET /api/tasks" GET "$BASE/api/tasks"
check "GET /api/reports/governance" GET "$BASE/api/reports/governance"
check "GET /api/reports/adoption" GET "$BASE/api/reports/adoption"
check "GET /api/reports/credits/summary" GET "$BASE/api/reports/credits/summary?workspace_id=1"

INT_ID=$(python3 -c "import json; print(json.load(open('/tmp/api-out.json'))[0]['id'])" 2>/dev/null || echo "1")
check "GET /api/integrations/:id" GET "$BASE/api/integrations/${INT_ID}"
check "POST /api/integrations/:id/test" POST "$BASE/api/integrations/${INT_ID}/test" "{}"

code=$(curl_api POST "$BASE/api/integrations" '{"workspace_id":2,"provider":"github","name":"QA Acceptance","endpoint_url":"https://api.github.com","credential_vault":{"token":"qa"},"status":"disconnected","active":true}')
NEW_ID=$(python3 -c "import json; d=json.load(open('/tmp/api-out.json')); print(d.get('id',''))" 2>/dev/null || true)
if [[ "$code" =~ ^2 ]]; then pass "POST /api/integrations" "$code"; else fail "POST /api/integrations" "$code"; fi
if [[ -n "$NEW_ID" ]]; then
  check "PUT /api/integrations/:id" PUT "$BASE/api/integrations/${NEW_ID}" '{"name":"QA Updated"}'
  code=$(curl_api DELETE "$BASE/api/integrations/${NEW_ID}")
  if [[ "$code" == "204" ]]; then pass "DELETE /api/integrations/:id" "204"; else fail "DELETE /api/integrations/:id" "$code"; fi
fi

code=$(curl_api POST "$BASE/api/tasks" '{"workspace_id":2,"title":"QA routing","description":"acceptance","risk_tier":1,"routing_mode":"auto","status":"queued"}')
TASK_ID=$(python3 -c "import json; print(json.load(open('/tmp/api-out.json')).get('id',''))" 2>/dev/null || true)
if [[ "$code" =~ ^2 ]]; then pass "POST /api/tasks" "$code"; else fail "POST /api/tasks" "$code"; fi
if [[ -n "$TASK_ID" ]]; then
  check "POST /api/route" POST "$BASE/api/route" "{\"workspace_id\":2,\"task_id\":${TASK_ID},\"skill_key\":\"mkt_campaign_brief\",\"min_autonomy\":0,\"risk_tier\":1}"
  check "POST /api/route/apply" POST "$BASE/api/route/apply" "{\"task_id\":${TASK_ID},\"workspace_id\":2,\"skill_key\":\"mkt_campaign_brief\",\"min_autonomy\":0,\"risk_tier\":1}"
fi

curl_api GET "$BASE/api/runs" >/dev/null
RUN_ID=$(python3 -c "import json; d=json.load(open('/tmp/api-out.json')); print(d[0]['id'] if d else 1)" 2>/dev/null || echo 1)
check "GET /api/runs/:id/audit" GET "$BASE/api/runs/${RUN_ID}/audit"

# Re-fetch approvals for decide test (may already be decided)
APPROVAL_ID=1
check "POST /api/approvals/:id/decide" POST "$BASE/api/approvals/${APPROVAL_ID}/decide" '{"decision":"approved","decided_by":"qa-admin","reason":"MVP acceptance retest"}'
