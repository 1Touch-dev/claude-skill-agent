#!/usr/bin/env bash
# plane-setup.sh — Bootstrap Plane CE and print API token for .env
# Usage: bash scripts/plane-setup.sh
# Prereqs: docker, docker compose, jq

set -euo pipefail

EC2_IP="${EC2_IP:-54.167.31.169}"
PLANE_URL="http://${EC2_IP}:8083"
ADMIN_EMAIL="${PLANE_ADMIN_EMAIL:-admin@planepmsystem.local}"
ADMIN_PASSWORD="${PLANE_ADMIN_PASSWORD:-Plane@Admin2026}"
WS_NAME="${PLANE_WS_NAME:-claude-skills-platform}"
WS_SLUG="${PLANE_WS_SLUG:-claude-skills}"

echo "=== Plane CE Setup Script ==="
echo "Plane URL: $PLANE_URL"
echo ""

# 1 — Start Plane services
echo "[1/5] Starting Plane CE (docker compose -f docker-compose-plane.yml up -d)..."
cd "$(dirname "$0")/.."
docker compose -f docker-compose-plane.yml up -d

echo "      Waiting 60s for services to initialise..."
sleep 60

# 2 — Sign up super admin
echo "[2/5] Creating admin account ($ADMIN_EMAIL)..."
SIGNUP=$(curl -s -X POST "${PLANE_URL}/auth/sign-up/" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" || echo '{}')

TOKEN=$(echo "$SIGNUP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || echo '')

if [ -z "$TOKEN" ]; then
  echo "      Signup may have failed (user may already exist). Trying sign-in..."
  SIGNIN=$(curl -s -X POST "${PLANE_URL}/auth/sign-in/" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")
  TOKEN=$(echo "$SIGNIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || echo '')
fi

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not obtain auth token. Check Plane logs:"
  echo "  docker compose -f docker-compose-plane.yml logs plane-api | tail -40"
  exit 1
fi
echo "      Auth token obtained."

# 3 — Create workspace
echo "[3/5] Creating workspace '${WS_NAME}' (slug: ${WS_SLUG})..."
WS_RESPONSE=$(curl -s -X POST "${PLANE_URL}/api/v1/workspaces/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${WS_NAME}\",\"slug\":\"${WS_SLUG}\",\"organization_size\":\"1-10\"}" || echo '{}')

WS_ID=$(echo "$WS_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo '')
if [ -z "$WS_ID" ]; then
  echo "      Workspace may already exist or creation failed. Response: $WS_RESPONSE"
  # Try to get existing workspace
  WS_LIST=$(curl -s "${PLANE_URL}/api/v1/workspaces/" -H "Authorization: Bearer ${TOKEN}")
  WS_SLUG=$(echo "$WS_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('results',[]); print(r[0]['slug'] if r else '')" 2>/dev/null || echo "$WS_SLUG")
  echo "      Using workspace slug: $WS_SLUG"
else
  echo "      Workspace created: $WS_ID"
fi

# 4 — Generate API key
echo "[4/5] Generating API key..."
KEY_RESPONSE=$(curl -s -X POST "${PLANE_URL}/api/v1/api-tokens/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"label\":\"pm-bridge-key\",\"description\":\"Claude Skills Platform pm-bridge\"}" || echo '{}')

API_KEY=$(echo "$KEY_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || echo '')

if [ -z "$API_KEY" ]; then
  echo "ERROR: Could not generate API key. Response: $KEY_RESPONSE"
  echo "Please generate an API key manually in Plane Settings → API Tokens"
  exit 1
fi
echo "      API key generated."

# 5 — Print instructions
echo ""
echo "[5/5] === SETUP COMPLETE ==="
echo ""
echo "Add these to your .env file:"
echo ""
echo "PLANE_API_URL=${PLANE_URL}"
echo "PLANE_API_TOKEN=${API_KEY}"
echo "PLANE_WORKSPACE_SLUG=${WS_SLUG}"
echo ""
echo "Then restart the backend:"
echo "  docker compose up -d --build backend"
echo ""
echo "Test the connection:"
echo "  curl -X POST http://${EC2_IP}:3000/api/pm/ping -H 'Authorization: Bearer changeme'"
echo ""
echo "Plane UI is at: ${PLANE_URL}"
echo "Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
