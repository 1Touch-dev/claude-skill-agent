#!/usr/bin/env bash
# =============================================================================
# test-zapier-mcp.sh — Tests for the Zapier MCP service
# Run: bash scripts/test-zapier-mcp.sh
# Set ZAPIER_MCP_TOKEN and ZAPIER_MCP_ENABLED=true in .env for live tests.
# Without a token, connectivity tests gracefully skip.
# =============================================================================
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
PASS=0; FAIL=0; SKIP=0

pass() { echo -e "${GREEN}[PASS]${NC} $*"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}[FAIL]${NC} $*"; FAIL=$((FAIL+1)); }
skip() { echo -e "${YELLOW}[SKIP]${NC} $*"; SKIP=$((SKIP+1)); }
section() { echo -e "\n${CYAN}${BOLD}── $* ──${NC}"; }

echo -e "${BOLD}╔══════════════════════════════════════╗"
echo -e "║  Zapier MCP — Test Suite             ║"
echo -e "╚══════════════════════════════════════╝${NC}"

# ── T01 — Status endpoint reachable ──────────────────────────────────────────
section "T01 — GET /api/mcp/status (endpoint reachable)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/mcp/status")
if [ "$HTTP" = "200" ]; then
  pass "GET /api/mcp/status → HTTP 200"
else
  fail "GET /api/mcp/status → HTTP ${HTTP}"
fi

# ── T02 — Status body has 'enabled' field ────────────────────────────────────
section "T02 — GET /api/mcp/status body structure"
BODY=$(curl -s "${BASE}/api/mcp/status")
ENABLED=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(str(d.get('enabled','')).lower())" 2>/dev/null || echo "error")
if [ "$ENABLED" = "true" ] || [ "$ENABLED" = "false" ]; then
  pass "GET /api/mcp/status → enabled=${ENABLED}"
else
  fail "GET /api/mcp/status → missing 'enabled' field. body=${BODY}"
fi

# ── T03 — Tools endpoint reachable ───────────────────────────────────────────
section "T03 — GET /api/mcp/tools (endpoint reachable)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/mcp/tools")
if [ "$HTTP" = "200" ]; then
  pass "GET /api/mcp/tools → HTTP 200"
else
  fail "GET /api/mcp/tools → HTTP ${HTTP}"
fi

# ── T04 — Tools body has expected structure ───────────────────────────────────
section "T04 — GET /api/mcp/tools body structure"
BODY=$(curl -s "${BASE}/api/mcp/tools")
HAS_TOOLS=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print('tools' in d)" 2>/dev/null || echo "False")
if [ "$HAS_TOOLS" = "True" ]; then
  TOOL_COUNT=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_count',0))" 2>/dev/null || echo 0)
  pass "GET /api/mcp/tools → has 'tools' array, tool_count=${TOOL_COUNT}"
else
  fail "GET /api/mcp/tools → missing 'tools' key. body=${BODY}"
fi

# ── T05 — Execute endpoint: requires tool_name ───────────────────────────────
section "T05 — POST /api/mcp/execute missing tool_name → 400"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/mcp/execute" \
  -H "Content-Type: application/json" \
  -d '{}')
if [ "$HTTP" = "400" ]; then
  pass "POST /api/mcp/execute missing tool_name → HTTP 400"
else
  fail "POST /api/mcp/execute missing tool_name → expected 400, got ${HTTP}"
fi

# ── T06 — Execute: disabled returns 503 when ZAPIER_MCP_ENABLED=false ────────
section "T06 — POST /api/mcp/execute when disabled → 503"
ENABLED_STATUS=$(curl -s "${BASE}/api/mcp/status" | python3 -c "import json,sys; print(json.load(sys.stdin).get('enabled',False))" 2>/dev/null || echo "False")
if [ "$ENABLED_STATUS" = "False" ]; then
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/mcp/execute" \
    -H "Content-Type: application/json" \
    -d '{"tool_name":"slack_send_message","params":{"message":"test"}}')
  if [ "$HTTP" = "503" ]; then
    pass "POST /api/mcp/execute when disabled → HTTP 503"
  else
    fail "POST /api/mcp/execute when disabled → expected 503, got ${HTTP}"
  fi
else
  skip "T06 — Zapier MCP is enabled; 503 test not applicable"
fi

# ── T07-T10 — Live tests (only run when token is configured) ─────────────────
if [ "$ENABLED_STATUS" = "True" ]; then
  section "T07 — Live: GET /api/mcp/status connected"
  OK=$(curl -s "${BASE}/api/mcp/status" | python3 -c "import json,sys; print(json.load(sys.stdin).get('ok',False))" 2>/dev/null || echo "False")
  if [ "$OK" = "True" ]; then
    pass "GET /api/mcp/status → connected to Zapier MCP"
  else
    fail "GET /api/mcp/status → expected ok=true for live connection"
  fi

  section "T08 — Live: GET /api/mcp/tools returns at least 1 tool"
  TOOL_COUNT=$(curl -s "${BASE}/api/mcp/tools" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_count',0))" 2>/dev/null || echo 0)
  if [ "$TOOL_COUNT" -ge 1 ]; then
    pass "GET /api/mcp/tools → ${TOOL_COUNT} tool(s) available"
  else
    fail "GET /api/mcp/tools → expected >=1 tool, got ${TOOL_COUNT}"
  fi
else
  skip "T07 — live status test (ZAPIER_MCP_ENABLED=false or no token)"
  skip "T08 — live tools test (ZAPIER_MCP_ENABLED=false or no token)"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═════════════════════════════════════════════${NC}"
echo -e "  PASS: ${PASS} | FAIL: ${FAIL} | SKIP: ${SKIP}"
echo -e "${BOLD}═════════════════════════════════════════════${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}All Zapier MCP tests passed/skipped.${NC}"
  exit 0
else
  echo -e "${RED}${FAIL} test(s) failed.${NC}"
  exit 1
fi
