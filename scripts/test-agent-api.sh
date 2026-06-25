#!/usr/bin/env bash
# =============================================================================
# test-agent-api.sh — Tests for the public /v1 Agent API
# Run: bash scripts/test-agent-api.sh
# =============================================================================
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-test-key-123}"
AUTH="Authorization: Bearer ${API_KEY}"

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
PASS=0; FAIL=0

pass() { echo -e "${GREEN}[PASS]${NC} $*"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}[FAIL]${NC} $*"; FAIL=$((FAIL+1)); }
section() { echo -e "\n${CYAN}${BOLD}── $* ──${NC}"; }

echo -e "${BOLD}╔══════════════════════════════════════╗"
echo -e "║  Agent API v1 — Test Suite           ║"
echo -e "╚══════════════════════════════════════╝${NC}"

# ── T01 — Health ─────────────────────────────────────────────────────────────
section "T01 — GET /v1/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/v1/health")
BODY=$(curl -s "${BASE}/v1/health")
if [ "$STATUS" = "200" ] && echo "$BODY" | grep -q '"ok"'; then
  pass "GET /v1/health → 200"
else
  fail "GET /v1/health → ${STATUS} body=${BODY}"
fi

# ── T02 — List skills (no auth needed when REQUIRE_AUTH=false) ───────────────
section "T02 — GET /v1/skills"
SKILLS_BODY=$(curl -s "${BASE}/v1/skills")
TOTAL=$(echo "$SKILLS_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total',0))" 2>/dev/null || echo 0)
if [ "$TOTAL" -ge 12 ]; then
  pass "GET /v1/skills → ${TOTAL} skills returned"
else
  fail "GET /v1/skills → expected >=12 skills, got ${TOTAL}. body=${SKILLS_BODY}"
fi

# ── T03 — Get single skill ───────────────────────────────────────────────────
section "T03 — GET /v1/skills/mkt_seo_content"
BODY=$(curl -s "${BASE}/v1/skills/mkt_seo_content")
KEY=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('key',''))" 2>/dev/null || echo "")
if [ "$KEY" = "mkt_seo_content" ]; then
  pass "GET /v1/skills/mkt_seo_content → key=${KEY}"
else
  fail "GET /v1/skills/mkt_seo_content → expected key=mkt_seo_content, got: ${BODY}"
fi

# ── T04 — Create task ────────────────────────────────────────────────────────
section "T04 — POST /v1/tasks"
TASK_BODY=$(curl -s -X POST "${BASE}/v1/tasks" \
  -H "Content-Type: application/json" \
  -H "${AUTH}" \
  -d '{"workspace_id":2,"title":"Test SEO article — Agent API v1","description":"Write a test SEO article","skill_key":"mkt_seo_content"}')
TASK_ID=$(echo "$TASK_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('task_id',''))" 2>/dev/null || echo "")
if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "None" ] && [ "$TASK_ID" != "" ]; then
  pass "POST /v1/tasks → task_id=${TASK_ID}"
else
  fail "POST /v1/tasks → no task_id. body=${TASK_BODY}"
fi

# ── T05 — Get task ───────────────────────────────────────────────────────────
section "T05 — GET /v1/tasks/:id"
if [ -n "$TASK_ID" ]; then
  BODY=$(curl -s "${BASE}/v1/tasks/${TASK_ID}" -H "${AUTH}")
  STATUS_FIELD=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
  if [ -n "$STATUS_FIELD" ]; then
    pass "GET /v1/tasks/${TASK_ID} → status=${STATUS_FIELD}"
  else
    fail "GET /v1/tasks/${TASK_ID} → no status. body=${BODY}"
  fi
else
  fail "GET /v1/tasks/:id — skipped (no task_id from T04)"
fi

# ── T06 — Route task ─────────────────────────────────────────────────────────
section "T06 — POST /v1/tasks/:id/route"
if [ -n "$TASK_ID" ]; then
  BODY=$(curl -s -X POST "${BASE}/v1/tasks/${TASK_ID}/route" \
    -H "Content-Type: application/json" \
    -H "${AUTH}" \
    -d '{"workspace_id":2,"skill_key":"mkt_seo_content"}')
  AGENT=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('agent_name',''))" 2>/dev/null || echo "")
  if [ -n "$AGENT" ] && [ "$AGENT" != "None" ]; then
    pass "POST /v1/tasks/${TASK_ID}/route → agent=${AGENT}"
  else
    fail "POST /v1/tasks/${TASK_ID}/route → no agent. body=${BODY}"
  fi
else
  fail "POST /v1/tasks/:id/route — skipped"
fi

# ── T07 — Run task ───────────────────────────────────────────────────────────
section "T07 — POST /v1/tasks/:id/run"
if [ -n "$TASK_ID" ]; then
  BODY=$(curl -s -X POST "${BASE}/v1/tasks/${TASK_ID}/run" \
    -H "Content-Type: application/json" \
    -H "${AUTH}" \
    -d '{"workspace_id":2,"skill_key":"mkt_seo_content"}')
  RUN_ID=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('run_id',''))" 2>/dev/null || echo "")
  if [ -n "$RUN_ID" ] && [ "$RUN_ID" != "None" ]; then
    pass "POST /v1/tasks/${TASK_ID}/run → run_id=${RUN_ID}"
  else
    fail "POST /v1/tasks/${TASK_ID}/run → no run_id. body=${BODY}"
  fi
else
  fail "POST /v1/tasks/:id/run — skipped"
fi

# ── T08 — Poll status ────────────────────────────────────────────────────────
section "T08 — GET /v1/tasks/:id/status"
if [ -n "$TASK_ID" ]; then
  BODY=$(curl -s "${BASE}/v1/tasks/${TASK_ID}/status" -H "${AUTH}")
  ST=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
  if [ -n "$ST" ]; then
    pass "GET /v1/tasks/${TASK_ID}/status → status=${ST}"
  else
    fail "GET /v1/tasks/${TASK_ID}/status → body=${BODY}"
  fi
else
  fail "GET /v1/tasks/:id/status — skipped"
fi

# ── T09 — Unknown skill returns 404 ──────────────────────────────────────────
section "T09 — POST /v1/tasks with unknown skill_key → 404"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/v1/tasks" \
  -H "Content-Type: application/json" \
  -H "${AUTH}" \
  -d '{"workspace_id":2,"title":"Bad skill","skill_key":"nonexistent_skill_xyz"}')
if [ "$HTTP" = "404" ]; then
  pass "POST /v1/tasks unknown skill → HTTP 404"
else
  fail "POST /v1/tasks unknown skill → expected 404, got ${HTTP}"
fi

# ── T10 — Missing required field → 400 ───────────────────────────────────────
section "T10 — POST /v1/tasks missing skill_key → 400"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/v1/tasks" \
  -H "Content-Type: application/json" \
  -H "${AUTH}" \
  -d '{"workspace_id":2,"title":"Missing skill"}')
if [ "$HTTP" = "400" ]; then
  pass "POST /v1/tasks missing skill_key → HTTP 400"
else
  fail "POST /v1/tasks missing skill_key → expected 400, got ${HTTP}"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo -e "  Results: ${PASS}/$(( PASS + FAIL )) passed | ${FAIL} failed"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}All agent API tests passed.${NC}"
  exit 0
else
  echo -e "${RED}${FAIL} test(s) failed.${NC}"
  exit 1
fi
