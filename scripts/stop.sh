#!/usr/bin/env bash
# =============================================================================
# stop.sh — Gracefully stop the full Claude Skills Platform stack
# Usage:  bash scripts/stop.sh [--plane-only] [--platform-only] [--volumes]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
info() { echo -e "${CYAN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
sep()  { echo -e "${BOLD}────────────────────────────────────────────────────${NC}"; }

STOP_PLANE=true
STOP_PLATFORM=true
REMOVE_VOLUMES=false
for arg in "$@"; do
  case "$arg" in
    --plane-only)    STOP_PLATFORM=false ;;
    --platform-only) STOP_PLANE=false ;;
    --volumes)       REMOVE_VOLUMES=true ;;
    --help|-h)
      echo "Usage: bash scripts/stop.sh [--plane-only] [--platform-only] [--volumes]"
      echo "  --plane-only     Stop Plane CE only"
      echo "  --platform-only  Stop core platform only (keep Plane running)"
      echo "  --volumes        Also remove named volumes (DESTROYS DATA — use with caution)"
      exit 0 ;;
  esac
done

sep
echo -e "${BOLD}  Claude Skills Platform — Shutdown${NC}"
sep

VOLUME_FLAG=""
[ "$REMOVE_VOLUMES" = true ] && VOLUME_FLAG="-v" && warn "Volume removal requested — data will be DELETED."

if [ "$STOP_PLANE" = true ] && [ "$STOP_PLATFORM" = true ]; then
  info "Stopping full stack (platform + Plane CE)..."
  docker compose -f docker-compose.yml -f docker-compose-plane.yml down $VOLUME_FLAG
  ok "Full stack stopped."
elif [ "$STOP_PLANE" = true ]; then
  info "Stopping Plane CE..."
  docker compose -f docker-compose-plane.yml down $VOLUME_FLAG
  ok "Plane CE stopped."
elif [ "$STOP_PLATFORM" = true ]; then
  info "Stopping core platform..."
  docker compose -f docker-compose.yml down $VOLUME_FLAG
  ok "Core platform stopped."
fi

sep
ok "Shutdown complete."
[ "$REMOVE_VOLUMES" = false ] && echo "  (Data volumes preserved — use --volumes to remove them)"
sep
