#!/usr/bin/env bash
# =============================================================================
# start.sh — Start the full Claude Skills Platform stack (platform + Plane CE)
# Usage:  bash scripts/start.sh [--no-plane] [--rebuild]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
sep()   { echo -e "${BOLD}────────────────────────────────────────────────────${NC}"; }

# ── Flags ─────────────────────────────────────────────────────────────────────
SKIP_PLANE=false
REBUILD=false
for arg in "$@"; do
  case "$arg" in
    --no-plane) SKIP_PLANE=true ;;
    --rebuild)  REBUILD=true ;;
    --help|-h)
      echo "Usage: bash scripts/start.sh [--no-plane] [--rebuild]"
      echo "  --no-plane   Start the core platform only (skip Plane CE)"
      echo "  --rebuild    Rebuild Docker images before starting"
      exit 0 ;;
  esac
done

# ── Load env ──────────────────────────────────────────────────────────────────
if [ -f "$ROOT/.env" ]; then
  # export only clearly safe variables (no function definitions)
  set -o allexport
  # shellcheck source=/dev/null
  source <(grep -v '^#' "$ROOT/.env" | grep -v '^$' | grep '=')
  set +o allexport
fi

EC2_IP="${EC2_IP:-54.167.31.169}"
PLATFORM_API="http://localhost:3000"
PLATFORM_UI="http://localhost:3001"
PLANE_UI="http://localhost:8083"

# ── Banner ────────────────────────────────────────────────────────────────────
sep
echo -e "${BOLD}  Claude Skills Platform — Full Stack Startup${NC}"
sep
info "Root:        $ROOT"
info "Platform:    $PLATFORM_API  (API)  |  $PLATFORM_UI  (UI)"
$SKIP_PLANE && info "Plane CE:    SKIPPED (--no-plane)" || info "Plane CE:    $PLANE_UI"
sep

# ── Step 1: Ensure plane-net network exists ───────────────────────────────────
echo ""
echo -e "${BOLD}[1/5] Shared Docker network${NC}"
if ! docker network inspect claude-skill-agent_plane-net >/dev/null 2>&1; then
  info "Creating 'claude-skill-agent_plane-net'..."
  docker network create claude-skill-agent_plane-net
  ok "Network created."
else
  ok "Network 'claude-skill-agent_plane-net' already exists."
fi

# ── Step 2: Start Plane CE ────────────────────────────────────────────────────
if [ "$SKIP_PLANE" = false ]; then
  echo ""
  echo -e "${BOLD}[2/5] Starting Plane CE (PM layer)${NC}"
  COMPOSE_PLANE_ARGS="-f docker-compose-plane.yml"
  if [ "$REBUILD" = true ]; then
    info "Pulling latest Plane images..."
    docker compose $COMPOSE_PLANE_ARGS pull --quiet
  fi
  docker compose $COMPOSE_PLANE_ARGS up -d --remove-orphans
  ok "Plane CE containers started."
else
  echo ""
  echo -e "${BOLD}[2/5] Plane CE — SKIPPED${NC}"
fi

# ── Step 3: Start core platform ───────────────────────────────────────────────
# Use both compose files together so Docker correctly connects backend to plane-net
echo ""
echo -e "${BOLD}[3/5] Starting core platform (backend + frontend + postgres + redis)${NC}"
if [ "$SKIP_PLANE" = false ]; then
  # Combined start ensures backend joins plane-net automatically
  COMPOSE_ARGS="-f docker-compose.yml -f docker-compose-plane.yml"
else
  COMPOSE_ARGS="-f docker-compose.yml"
fi
if [ "$REBUILD" = true ]; then
  info "Rebuilding platform images..."
  docker compose -f docker-compose.yml build --quiet
fi
docker compose $COMPOSE_ARGS up -d --remove-orphans
ok "Core platform containers started."

# Run DB migrations (idempotent — safe to run every time)
info "Running database migrations..."
docker compose -f docker-compose.yml exec -T backend node /app/scripts/migrate.js 2>&1 | \
  grep -E "\[migrate\]" | sed 's/^/        /' || true
ok "Migrations complete."

# ── Step 4: Wait for health ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[4/5] Waiting for services to become healthy${NC}"

wait_http() {
  local label="$1" url="$2" max_wait="${3:-90}" interval=3
  local elapsed=0
  printf "      %-20s " "$label"
  while true; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^2 ]]; then
      echo -e "${GREEN}OK${NC} (HTTP $code, ${elapsed}s)"
      return 0
    fi
    elapsed=$((elapsed + interval))
    if [ $elapsed -ge $max_wait ]; then
      echo -e "${RED}TIMEOUT${NC} after ${max_wait}s (last HTTP $code)"
      return 1
    fi
    printf "."
    sleep $interval
  done
}

HEALTH_FAILED=false

wait_http "Platform API" "${PLATFORM_API}/health/live" 90 || HEALTH_FAILED=true
wait_http "Platform UI"  "${PLATFORM_UI}"               90 || HEALTH_FAILED=true

if [ "$SKIP_PLANE" = false ]; then
  wait_http "Plane UI" "${PLANE_UI}" 120 || HEALTH_FAILED=true

  # Additional: check pm-bridge ping
  printf "      %-20s " "PM bridge ping"
  PM_PING=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${PLATFORM_API}/api/pm/ping" \
    -H "Authorization: Bearer ${ADMIN_TOKEN:-changeme}" 2>/dev/null || echo "000")
  if [[ "$PM_PING" =~ ^2 ]]; then
    echo -e "${GREEN}OK${NC} (HTTP $PM_PING)"
  else
    echo -e "${YELLOW}WARN${NC} (HTTP $PM_PING — Plane may still be booting)"
  fi
fi

# ── Step 5: Summary ───────────────────────────────────────────────────────────
echo ""
sep
echo -e "${BOLD}[5/5] Startup summary${NC}"
sep

if [ "$HEALTH_FAILED" = true ]; then
  warn "Some services didn't respond in time. Check logs:"
  echo "  docker compose logs --tail=40 backend"
  [ "$SKIP_PLANE" = false ] && echo "  docker compose -f docker-compose-plane.yml logs --tail=40 api"
else
  ok "All services healthy!"
fi

echo ""
echo -e "  ${BOLD}Platform API:${NC}   ${PLATFORM_API}"
echo -e "  ${BOLD}Platform UI:${NC}    http://${EC2_IP}:3001"
echo -e "  ${BOLD}API health:${NC}     ${PLATFORM_API}/health/live"
if [ "$SKIP_PLANE" = false ]; then
  echo -e "  ${BOLD}Plane UI:${NC}       http://${EC2_IP}:8083"
  echo -e "  ${BOLD}Plane login:${NC}    ${PLANE_ADMIN_EMAIL:-admin@planepmsystem.local}"
fi
echo ""
echo -e "  ${CYAN}Quick health check:${NC}"
echo -e "    bash scripts/status.sh"
echo ""
echo -e "  ${CYAN}Run integration tests:${NC}"
echo -e "    bash scripts/test-pm-integration.sh ${PLATFORM_API}"
sep
