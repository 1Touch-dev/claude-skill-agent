#!/usr/bin/env bash
# audit-ec2-security.sh — EC2 security posture check for the Claude Skills Platform
#
# Checks:
#   1. Instance metadata (ID, region, attached security groups)
#   2. Listening ports — flags 5432 (PostgreSQL) and 6379 (Redis) bound to 0.0.0.0
#   3. Docker port bindings — identifies which containers publish to the host
#   4. AWS Security Group inbound rules (requires aws CLI + credentials)
#   5. Host-level firewall (ufw/iptables) summary
#
# Exit codes:
#   0 — no critical issues found
#   1 — one or more critical issues found (dangerous port open to world, etc.)
#
# Usage:
#   bash scripts/audit-ec2-security.sh
#   bash scripts/audit-ec2-security.sh --fix    (revokes 5432/6379 from default SG if aws CLI available)

set -euo pipefail

FIX=false
if [[ "${1:-}" == "--fix" ]]; then FIX=true; fi

ISSUES=0
WARN=0

RED='\033[0;31m'
YLW='\033[0;33m'
GRN='\033[0;32m'
BLD='\033[1m'
NC='\033[0m'

ok()    { echo -e "  ${GRN}OK${NC}    $1"; }
warn()  { echo -e "  ${YLW}WARN${NC}  $1"; WARN=$((WARN+1)); }
crit()  { echo -e "  ${RED}CRIT${NC}  $1"; ISSUES=$((ISSUES+1)); }
info()  { echo -e "        $1"; }
hdr()   { echo ""; echo -e "${BLD}── $1 ──${NC}"; }

echo "=================================================="
echo " EC2 Security Audit — Claude Skills Platform"
echo " $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "=================================================="

# ── 1. Instance metadata ──────────────────────────────
hdr "1. Instance metadata"

TOKEN=$(curl -s --max-time 2 -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || echo "")

if [[ -n "$TOKEN" ]]; then
  INSTANCE_ID=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "unavailable")
  PUBLIC_IP=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unavailable")
  REGION=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo "unavailable")
  ITYPE=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/instance-type 2>/dev/null || echo "unavailable")

  # Get SG IDs from network interfaces
  MACS=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/network/interfaces/macs/ 2>/dev/null | tr -d '/')
  SG_IDS=""
  SG_NAMES=""
  for mac in $MACS; do
    IDS=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
      "http://169.254.169.254/latest/meta-data/network/interfaces/macs/${mac}/security-group-ids" 2>/dev/null || echo "")
    NAMES=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
      "http://169.254.169.254/latest/meta-data/network/interfaces/macs/${mac}/security-groups" 2>/dev/null || echo "")
    SG_IDS="$SG_IDS $IDS"
    SG_NAMES="$SG_NAMES $NAMES"
  done

  info "Instance ID : $INSTANCE_ID"
  info "Public IP   : $PUBLIC_IP"
  info "Region      : $REGION"
  info "Type        : $ITYPE"
  info "SG IDs      :${SG_IDS}"
  info "SG Names    :${SG_NAMES}"
else
  warn "Cannot reach EC2 instance metadata service (not on EC2 or IMDSv2 blocked)"
  INSTANCE_ID="unknown"
  SG_IDS=""
fi

# ── 2. Listening ports ────────────────────────────────
hdr "2. Host listening ports"

LISTEN_OUTPUT=$(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo "")

if [[ -z "$LISTEN_OUTPUT" ]]; then
  warn "Could not retrieve listening ports (ss/netstat not available)"
else
  echo "$LISTEN_OUTPUT" | grep -E "LISTEN|0\.0\.0\.0|::" | while read -r line; do
    info "$line"
  done
fi

# Check specific dangerous ports
for port in 5432 6379; do
  svcname="PostgreSQL"
  [[ $port -eq 6379 ]] && svcname="Redis"
  if echo "$LISTEN_OUTPUT" | grep -qE "0\.0\.0\.0:${port}"; then
    crit "Port $port ($svcname) is bound to 0.0.0.0 — reachable on all interfaces"
    info "  This port should only be accessible within Docker networks."
    info "  Recommendation: remove host port binding in docker-compose.yml or block at SG level."
  elif echo "$LISTEN_OUTPUT" | grep -qE "\[::\]:${port}"; then
    crit "Port $port ($svcname) is bound to [::]  — reachable on all IPv6 interfaces"
  else
    ok "Port $port ($svcname) not bound to 0.0.0.0"
  fi
done

# Expected open ports
for port in 22 3000 3001 8083; do
  if echo "$LISTEN_OUTPUT" | grep -qE "0\.0\.0\.0:${port}|\[::\]:${port}"; then
    ok "Port $port is listening (expected)"
  else
    info "Port $port not detected listening (may not be started)"
  fi
done

# ── 3. Docker port bindings ───────────────────────────
hdr "3. Docker host port bindings"

if command -v docker &>/dev/null; then
  DOCKER_PORTS=$(docker ps --format "{{.Names}}\t{{.Ports}}" 2>/dev/null | grep "0.0.0.0\|::" | grep -v "^$" || echo "")
  if [[ -n "$DOCKER_PORTS" ]]; then
    echo "$DOCKER_PORTS" | while IFS=$'\t' read -r name ports; do
      info "$name  →  $ports"
      # Flag DB/cache ports
      if echo "$ports" | grep -qE "0\.0\.0\.0:(5432|6379)"; then
        crit "  Container '$name' publishes database/cache port to host 0.0.0.0"
      fi
    done
  else
    info "No containers publishing ports to 0.0.0.0 (or Docker not running)"
  fi
else
  warn "docker not found — skipping container port check"
fi

# ── 4. AWS Security Group rules ───────────────────────
hdr "4. AWS Security Group inbound rules"

if command -v aws &>/dev/null && aws sts get-caller-identity &>/dev/null 2>&1; then
  for sg_id in $SG_IDS; do
    sg_id=$(echo "$sg_id" | xargs)
    [[ -z "$sg_id" ]] && continue
    info "Checking SG: $sg_id"
    RULES=$(aws ec2 describe-security-groups --group-ids "$sg_id" \
      --query 'SecurityGroups[0].IpPermissions' --output json 2>&1)

    if echo "$RULES" | python3 -c "import sys,json; rules=json.load(sys.stdin); [print(r) for r in rules]" &>/dev/null 2>&1; then
      echo "$RULES" | python3 -c "
import sys, json
rules = json.load(sys.stdin)
dangerous = [5432, 6379]
for r in rules:
    from_port = r.get('FromPort', 0)
    to_port = r.get('ToPort', 65535)
    proto = r.get('IpProtocol', 'tcp')
    for ip_range in r.get('IpRanges', []):
        cidr = ip_range.get('CidrIp', '')
        desc = ip_range.get('Description', '')
        is_open = cidr in ('0.0.0.0/0',)
        flag = 'CRIT' if (is_open and any(from_port <= p <= to_port for p in dangerous)) else ('WARN' if is_open and from_port == 22 else 'ok  ')
        print(f'  {flag}  tcp {from_port}-{to_port}  {cidr}  {desc}')
" 2>/dev/null || info "  (could not parse SG rules)"

      # Flag dangerous rules and optionally fix
      if $FIX; then
        for danger_port in 5432 6379; do
          if echo "$RULES" | python3 -c "
import sys, json
rules = json.load(sys.stdin)
for r in rules:
    fp = r.get('FromPort',0); tp = r.get('ToPort',65535)
    if fp <= $danger_port <= tp:
        for rng in r.get('IpRanges',[]):
            if rng.get('CidrIp') == '0.0.0.0/0':
                print('found')
                sys.exit(0)
" 2>/dev/null | grep -q found; then
            echo -e "  ${YLW}FIX${NC}   Revoking port $danger_port 0.0.0.0/0 from $sg_id"
            aws ec2 revoke-security-group-ingress \
              --group-id "$sg_id" \
              --protocol tcp \
              --port "$danger_port" \
              --cidr 0.0.0.0/0 2>&1 && ok "  Revoked port $danger_port" || warn "  Could not revoke port $danger_port"
          fi
        done
      fi
    else
      warn "Could not query SG $sg_id: $RULES"
    fi
  done
else
  warn "aws CLI not configured (no credentials). Skipping SG rule inspection."
  info "To check manually:"
  info "  aws ec2 describe-security-groups --group-ids <sg-id> \\"
  info "    --query 'SecurityGroups[].IpPermissions' --output json"
  info "Known SG from metadata:${SG_IDS}"
fi

# ── 5. Host firewall summary ──────────────────────────
hdr "5. Host-level firewall"

if command -v ufw &>/dev/null; then
  UFW_STATUS=$(sudo ufw status 2>/dev/null || echo "permission denied")
  info "ufw status: $UFW_STATUS"
  if echo "$UFW_STATUS" | grep -q "^Status: inactive"; then
    warn "ufw is inactive — firewall enforcement relies solely on AWS Security Group"
  fi
elif command -v iptables &>/dev/null; then
  CHAIN=$(sudo iptables -L INPUT -n 2>/dev/null | head -5 || echo "permission denied")
  info "iptables INPUT chain:"
  echo "$CHAIN" | while read -r line; do info "  $line"; done
fi

# ── Summary ───────────────────────────────────────────
echo ""
echo "=================================================="
echo -e " ${BLD}Audit Summary${NC}"
echo "=================================================="
if [[ $ISSUES -eq 0 && $WARN -eq 0 ]]; then
  echo -e " ${GRN}CLEAN${NC}  No issues found."
elif [[ $ISSUES -eq 0 ]]; then
  echo -e " ${YLW}WARNINGS${NC}  $WARN warning(s), 0 critical issues."
else
  echo -e " ${RED}CRITICAL${NC}  $ISSUES critical issue(s), $WARN warning(s)."
  echo ""
  echo " Recommended actions:"
  echo "   1. Remove 5432 and 6379 from SG inbound rules (AWS Console or --fix flag)"
  echo "   2. Remove host port bindings for postgres/redis in docker-compose.yml"
  echo "   3. Restrict SSH (port 22) to known office/VPN IPs in the SG"
  echo "   4. Enable PLANE_WEBHOOK_ALLOWED_IPS in .env for webhook hardening"
  echo ""
  echo " Re-run after fixing: bash scripts/audit-ec2-security.sh"
fi
echo ""
echo " Required demo ports: 3000 (API), 3001 (UI), 8083 (Plane)"
echo " Docs: docs/ec2-security.md | Runbook: docs/runbook.md"
echo "=================================================="

[[ $ISSUES -gt 0 ]] && exit 1 || exit 0
