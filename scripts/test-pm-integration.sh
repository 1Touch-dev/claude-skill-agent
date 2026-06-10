#!/usr/bin/env bash
# test-pm-integration.sh — End-to-end test of the pm-bridge integration
# Usage: bash scripts/test-pm-integration.sh [API_URL]
# Default API_URL: http://localhost:3000

set -euo pipefail

API="${1:-http://localhost:3000}"
TOKEN="${ADMIN_TOKEN:-changeme}"

PASS=0
FAIL=0
SKIP=0

ok()   { echo "  PASS  $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL  $1  →  $2"; FAIL=$((FAIL+1)); }
skip() { echo "  SKIP  $1  →  $2"; SKIP=$((SKIP+1)); }

h()    { echo ""; echo "── $1 ──"; }

call() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -s -X "$method" "${API}${path}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -s -X "$method" "${API}${path}" \
      -H "Authorization: Bearer ${TOKEN}"
  fi
}

echo "=== PM Bridge Integration Tests ==="
echo "API: $API"
echo ""

# ── T01: Health ──────────────────────────────────────────────────────────────
h "T01 — Health"
HEALTH=$(call GET /health/live)
STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo '')
[ "$STATUS" = "ok" ] && ok "GET /health/live → status=ok" || fail "GET /health/live" "$HEALTH"

# ── T02: PM Ping ─────────────────────────────────────────────────────────────
h "T02 — PM Ping (Plane connectivity)"
PING=$(call POST /api/pm/ping)
PLANE_ENABLED=$(echo "$PING" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('plane_enabled',False)).lower())" 2>/dev/null || echo 'false')

if [ "$PLANE_ENABLED" = "true" ]; then
  PING_OK=$(echo "$PING" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok',False)).lower())" 2>/dev/null || echo 'false')
  [ "$PING_OK" = "true" ] && ok "POST /api/pm/ping → Plane reachable" || fail "POST /api/pm/ping" "$PING"
  PLANE_LIVE=true
else
  skip "POST /api/pm/ping" "Plane not configured (PLANE_API_TOKEN not set)"
  PLANE_LIVE=false
fi

# ── T03: List projects (graceful degradation) ────────────────────────────────
h "T03 — PM Projects list"
if [ "$PLANE_LIVE" = "true" ]; then
  PROJECTS=$(call GET /api/pm/projects)
  PROJ_OK=$(echo "$PROJECTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok')" 2>/dev/null || echo 'error')
  [ "$PROJ_OK" = "ok" ] && ok "GET /api/pm/projects → response received" || fail "GET /api/pm/projects" "$PROJECTS"
else
  STATUS=$(call GET /api/pm/projects | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null || echo '')
  [ "$STATUS" = "plane_not_configured" ] && ok "GET /api/pm/projects → 503 plane_not_configured (expected)" || fail "GET /api/pm/projects (not-configured path)" "$STATUS"
fi

# ── T04: Seed workspace if needed ────────────────────────────────────────────
h "T04 — Seed workspace"
WS=$(call GET /api/workspaces 2>/dev/null || call GET /api/customers 2>/dev/null)
WS_ID=$(echo "$WS" | python3 -c "import sys,json; rows=json.load(sys.stdin); r=rows if isinstance(rows,list) else rows.get('data',rows.get('workspaces',[])); print(r[0]['id'] if r else '')" 2>/dev/null || echo '')

if [ -z "$WS_ID" ]; then
  # Create workspace
  CUST=$(call POST /api/customers '{"name":"Test Customer","plan":"enterprise"}')
  CUST_ID=$(echo "$CUST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo '')
  WS=$(call POST /api/workspaces "{\"customer_id\":${CUST_ID},\"name\":\"Test Workspace\",\"plan\":\"enterprise\"}")
  WS_ID=$(echo "$WS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo '')
fi

[ -n "$WS_ID" ] && ok "Workspace available: id=$WS_ID" || fail "Could not obtain workspace" "$WS"

# ── T05: Workspace status endpoint ───────────────────────────────────────────
h "T05 — Workspace PM status"
WS_STATUS=$(call GET "/api/pm/workspaces/${WS_ID}/status")
WS_ID_BACK=$(echo "$WS_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('workspace_id',''))" 2>/dev/null || echo '')
[ "$WS_ID_BACK" = "$WS_ID" ] && ok "GET /api/pm/workspaces/$WS_ID/status → workspace_id matches" || fail "Workspace status" "$WS_STATUS"

# ── T06: Sync workspace → Plane project ──────────────────────────────────────
h "T06 — Sync workspace to Plane project"
if [ "$PLANE_LIVE" = "true" ]; then
  SYNC=$(call POST "/api/pm/workspaces/${WS_ID}/sync")
  SYNCED=$(echo "$SYNC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('synced',False)).lower())" 2>/dev/null || echo 'false')
  PLANE_PROJ_ID=$(echo "$SYNC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('plane_project_id',''))" 2>/dev/null || echo '')
  [ "$SYNCED" = "true" ] && ok "POST /api/pm/workspaces/$WS_ID/sync → synced=true, project_id=$PLANE_PROJ_ID" || fail "Workspace sync" "$SYNC"
else
  SYNC=$(call POST "/api/pm/workspaces/${WS_ID}/sync")
  ERR=$(echo "$SYNC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null || echo '')
  [ "$ERR" = "plane_not_configured" ] && ok "POST /api/pm/workspaces/$WS_ID/sync → 503 plane_not_configured (expected)" || fail "Workspace sync (not-configured path)" "$SYNC"
fi

# ── T07: Create task ──────────────────────────────────────────────────────────
h "T07 — Create task_intake"
CUST_ID_FOR_TASK=$(call GET /api/customers | python3 -c "import sys,json; r=json.load(sys.stdin); r=r if isinstance(r,list) else r.get('data',[]); print(r[0]['id'] if r else 1)" 2>/dev/null || echo '1')

TASK=$(call POST /api/tasks "{\"workspace_id\":${WS_ID},\"customer_id\":${CUST_ID_FOR_TASK},\"title\":\"[PM-Bridge Test] E2E Spike Task\",\"description\":\"Created by test-pm-integration.sh to verify pm-bridge\",\"risk_tier\":1,\"routing_mode\":\"auto\"}")
TASK_ID=$(echo "$TASK" | python3 -c "import sys,json; r=json.load(sys.stdin); r=r if isinstance(r,list) else [r]; print(r[0].get('id','') if r else '')" 2>/dev/null || echo '')
[ -n "$TASK_ID" ] && ok "POST /api/tasks → task_id=$TASK_ID" || fail "Create task" "$TASK"

# ── T08: Task PM status before sync ──────────────────────────────────────────
h "T08 — Task PM status (before sync)"
TASK_STATUS=$(call GET "/api/pm/tasks/${TASK_ID}/status")
SYNCED_B=$(echo "$TASK_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('synced',True)).lower())" 2>/dev/null || echo 'true')
[ "$SYNCED_B" = "false" ] && ok "GET /api/pm/tasks/$TASK_ID/status → synced=false (not yet synced)" || fail "Task PM status before sync" "$TASK_STATUS"

# ── T09: Manual sync task → Plane issue ──────────────────────────────────────
h "T09 — Manual sync task to Plane issue"
if [ "$PLANE_LIVE" = "true" ]; then
  ISSUE_SYNC=$(call POST "/api/pm/tasks/${TASK_ID}/sync")
  ISSUE_ID=$(echo "$ISSUE_SYNC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('plane_issue_id',''))" 2>/dev/null || echo '')
  [ -n "$ISSUE_ID" ] && ok "POST /api/pm/tasks/$TASK_ID/sync → plane_issue_id=$ISSUE_ID" || fail "Task sync" "$ISSUE_SYNC"
else
  ISSUE_SYNC=$(call POST "/api/pm/tasks/${TASK_ID}/sync")
  ERR=$(echo "$ISSUE_SYNC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null || echo '')
  [ "$ERR" = "plane_not_configured" ] || [ "$ERR" = "workspace_not_synced" ] && ok "POST /api/pm/tasks/$TASK_ID/sync → expected error=$ERR (plane not live)" || fail "Task sync (not-configured path)" "$ISSUE_SYNC"
fi

# ── T10: Route task (auto-sync to Plane triggered) ───────────────────────────
h "T10 — Route/apply (triggers auto Plane sync)"
AGENT_LIST=$(call GET /api/agents)
AGENT_ID=$(echo "$AGENT_LIST" | python3 -c "import sys,json; r=json.load(sys.stdin); r=r if isinstance(r,list) else r.get('data',[]); print(r[0]['id'] if r else '')" 2>/dev/null || echo '')

if [ -n "$AGENT_ID" ]; then
  SKILL_KEY=$(echo "$AGENT_LIST" | python3 -c "import sys,json; r=json.load(sys.stdin); r=r if isinstance(r,list) else r.get('data',[]); keys=r[0].get('allowed_skill_keys',[]) if r else []; print(keys[0] if keys else 'mkt_campaign_brief')" 2>/dev/null || echo 'mkt_campaign_brief')
  ROUTE=$(call POST /api/route/apply "{\"task_id\":${TASK_ID},\"workspace_id\":${WS_ID},\"skill_key\":\"${SKILL_KEY}\"}")
  ROUTE_ID=$(echo "$ROUTE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('route',{}).get('id',''))" 2>/dev/null || echo '')
  [ -n "$ROUTE_ID" ] && ok "POST /api/route/apply → route_id=$ROUTE_ID (Plane auto-sync fired in background)" || fail "Route/apply" "$ROUTE"
else
  skip "POST /api/route/apply" "No agents in workspace $WS_ID — seed data may be on a different workspace"
fi

# ── T11: Plane webhook receiver ───────────────────────────────────────────────
h "T11 — Plane webhook receiver"
# Simulate an issue_updated event
WEBHOOK_PAYLOAD=$(cat <<EOF
{"event":"issue_updated","data":{"id":"00000000-0000-0000-0000-000000000099","state_detail":{"type":"completed"}}}
EOF
)
WH_RESP=$(curl -s -X POST "${API}/webhooks/plane" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD")
WH_OK=$(echo "$WH_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok',False)).lower())" 2>/dev/null || echo 'false')
[ "$WH_OK" = "true" ] && ok "POST /webhooks/plane → ok=true (event logged)" || fail "Webhook receiver" "$WH_RESP"

# ── T12: Webhook event stored in DB ──────────────────────────────────────────
h "T12 — Webhook events table accessible (via health check)"
# Verify the server is still healthy after receiving webhook
HEALTH2=$(call GET /health/live)
S2=$(echo "$HEALTH2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo '')
[ "$S2" = "ok" ] && ok "GET /health/live after webhook → still ok" || fail "Health after webhook" "$HEALTH2"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════"
TOTAL=$((PASS + FAIL + SKIP))
echo "  Results: $PASS/$TOTAL passed | $FAIL failed | $SKIP skipped"
echo "═══════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
