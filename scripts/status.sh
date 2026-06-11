#!/usr/bin/env bash
# =============================================================================
# status.sh — Quick health overview of the full stack
# Usage:  bash scripts/status.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Load env ──────────────────────────────────────────────────────────────────
if [ -f "$ROOT/.env" ]; then
  set -o allexport
  # shellcheck source=/dev/null
  source <(grep -v '^#' "$ROOT/.env" | grep -v '^$' | grep '=')
  set +o allexport
fi

ADMIN_TOKEN="${ADMIN_TOKEN:-changeme}"
EC2_IP="${EC2_IP:-54.167.31.169}"

sep() { echo -e "${BOLD}────────────────────────────────────────────────────${NC}"; }

check_http() {
  local label="$1" url="$2" method="${3:-GET}" extra_args="${4:-}"
  local code
  if [ "$method" = "POST" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" 2>/dev/null || echo "000")
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  fi

  local symbol color
  if [[ "$code" =~ ^2 ]]; then
    symbol="✅"; color="$GREEN"
  elif [ "$code" = "000" ]; then
    symbol="❌"; color="$RED"
  else
    symbol="⚠️ "; color="$YELLOW"
  fi
  printf "  %b%-3s%b  %-36s %b%s%b\n" "$color" "$symbol" "$NC" "$label" "$color" "HTTP $code" "$NC"
}

# ── Banner ────────────────────────────────────────────────────────────────────
sep
echo -e "${BOLD}  Claude Skills Platform — Status Check${NC}"
echo -e "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
sep

# ── Docker containers ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Docker containers:${NC}"
docker compose -f docker-compose.yml -f docker-compose-plane.yml ps \
  --format "table {{.Name}}\t{{.Status}}" 2>/dev/null \
  | awk 'NR==1 { print "  " $0; next } { gsub(/^/, "  "); print }' \
  || docker ps --format "  {{.Names}}  {{.Status}}" 2>/dev/null

# ── HTTP health checks ────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}HTTP health checks:${NC}"
check_http "Platform API /health/live"   "http://localhost:3000/health/live"
check_http "Platform UI  :3001"          "http://localhost:3001"
check_http "Plane UI     :8083"          "http://localhost:8083"
check_http "PM bridge ping"              "http://localhost:3000/api/pm/ping" "POST"

# ── Task sync stats ───────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Task / PM sync stats:${NC}"
TASKS_JSON=$(curl -s "http://localhost:3000/api/tasks" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" 2>/dev/null || echo "[]")

TOTAL=$(echo "$TASKS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "?")
SYNCED=$(echo "$TASKS_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(sum(1 for t in d if t.get('plane_issue_id')))
" 2>/dev/null || echo "?")
echo "  Tasks in platform:    $TOTAL"
echo "  Synced to Plane CE:   $SYNCED"

# ── URLs ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Live URLs:${NC}"
echo -e "  Platform UI   →  ${CYAN}http://${EC2_IP}:3001${NC}"
echo -e "  Platform API  →  ${CYAN}http://${EC2_IP}:3000${NC}"
echo -e "  Plane CE UI   →  ${CYAN}http://${EC2_IP}:8083${NC}"
echo ""
sep
