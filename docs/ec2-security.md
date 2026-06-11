# EC2 Security Group Audit — Claude Skills Platform

**Branch:** `feature/plane-pm-integration`  
**Last audited:** June 11, 2026  
**Instance:** `i-007f63e3c802844fe` · `t3.medium` · `us-east-1c`  
**Public IP:** `54.167.31.169`  
**Security Group:** `sg-0106b45e7552109a0` (`launch-wizard-60`)  
**VPC:** `vpc-037a5b1a79516d72b`  
**Audit tool:** `bash scripts/audit-ec2-security.sh`

---

## 1. Purpose

This document records the firewall posture of the demo EC2 instance, identifies risks, and provides the required changes. It is the reference for:

- James / ops when applying SG changes
- Engineers removing dangerous host port bindings
- Future audits (re-run the script after any change)

---

## 2. Confirmed SG Inbound Rules (from AWS Console, June 11 2026)

| Rule ID | Port | Protocol | Source | Status | Required Action |
|---------|------|----------|--------|--------|-----------------|
| Rule ID | Port | Protocol | Source | Status | Notes |
|---------|------|----------|--------|--------|-------|
| ~~`sgr-0d994a19ed959b581`~~ | ~~6379~~ | ~~TCP~~ | ~~0.0.0.0/0~~ | ✅ **Deleted Jun 11** | Redis — removed |
| ~~`sgr-0d1258741902daed1`~~ | ~~5432~~ | ~~TCP~~ | ~~0.0.0.0/0~~ | ✅ **Deleted Jun 11** | PostgreSQL — removed |
| *(new)* | **8083** | TCP | 0.0.0.0/0 | ✅ **Added Jun 11** | Plane CE — now externally accessible |
| `sgr-002eac07aba0dd577` | 22 | TCP | 0.0.0.0/0 | ⚠️ Restrict | SSH — change source to office/VPN IP when convenient |
| `sgr-009b94fb15a45fe45` | 80 | TCP | 0.0.0.0/0 | ℹ️ Harmless | HTTP — not in active use; can keep (reserved for future TLS proxy) |
| `sgr-090d5542703b446d5` | 443 | TCP | 0.0.0.0/0 | ℹ️ Harmless | HTTPS — not in active use; reserved for future TLS |
| `sgr-0a955b142d68b158c` | 3000 | TCP | 0.0.0.0/0 | ✅ Required | Platform API + Plane webhook receiver |
| `sgr-0bd45d2d9861e2e82` | 3001 | TCP | 0.0.0.0/0 | ✅ Required | Admin UI |

> **Applied June 11:** Rules for 5432 and 6379 deleted; port 8083 added. All three services verified reachable/blocked.

---

## 3. SG Changes Applied — June 11, 2026

Changes have been applied via AWS Console. Verified by port connectivity test from EC2.

| Action | Port | Result |
|--------|------|--------|
| Deleted rule `sgr-0d994a19ed959b581` | 6379 (Redis) | ✅ Now blocked — `timeout 4 bash -c 'echo > /dev/tcp/54.167.31.169/6379'` → BLOCKED |
| Deleted rule `sgr-0d1258741902daed1` | 5432 (PostgreSQL) | ✅ Now blocked — same test → BLOCKED |
| Added new rule | 8083 (Plane CE) | ✅ Now reachable — `curl http://54.167.31.169:8083` → HTTP 200 |

**If SG changes are ever needed again**, use the CLI commands below (requires AWS credentials):

```bash
SG="sg-0106b45e7552109a0"

# 1. Delete Redis (CRITICAL)
aws ec2 revoke-security-group-ingress \
  --group-id "$SG" \
  --security-group-rule-ids sgr-0d994a19ed959b581

# 2. Delete PostgreSQL (CRITICAL)
aws ec2 revoke-security-group-ingress \
  --group-id "$SG" \
  --security-group-rule-ids sgr-0d1258741902daed1

# 3. Add Plane CE port 8083 (MISSING — required for Plane external access)
aws ec2 authorize-security-group-ingress \
  --group-id "$SG" \
  --protocol tcp \
  --port 8083 \
  --cidr 0.0.0.0/0 \
  --tag-specifications \
    'ResourceType=security-group-rule,Tags=[{Key=Name,Value=plane-ce-ui}]'

# 4. Optional: restrict SSH to your office IP (find your IP first: curl ifconfig.me)
# aws ec2 revoke-security-group-ingress \
#   --group-id "$SG" --security-group-rule-ids sgr-002eac07aba0dd577
# aws ec2 authorize-security-group-ingress \
#   --group-id "$SG" --protocol tcp --port 22 --cidr <your-ip>/32
```

### Target state after changes

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 3001 | TCP | 0.0.0.0/0 | Admin UI |
| 3000 | TCP | 0.0.0.0/0 | API + Plane webhooks |
| 8083 | TCP | 0.0.0.0/0 | **Plane CE** (add this) |
| 22 | TCP | `<office-ip>/32` | SSH (restrict when convenient) |
| 80 | TCP | 0.0.0.0/0 | HTTP (keep; reserved for future proxy) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (keep; reserved for future TLS) |
| ~~5432~~ | ~~TCP~~ | ~~0.0.0.0/0~~ | **Delete** |
| ~~6379~~ | ~~TCP~~ | ~~0.0.0.0/0~~ | **Delete** |

---

## 4. Findings Summary

| Severity | Finding | Details |
|----------|---------|---------|
| 🔴 CRITICAL | **Redis (6379) open to internet** | Rule `sgr-0d994a19ed959b581` — unauthenticated access; can be exploited for RCE via `CONFIG SET` |
| 🔴 CRITICAL | **PostgreSQL (5432) open to internet** | Rule `sgr-0d1258741902daed1` — full unauthenticated DB access |
| 🔴 CRITICAL | **Plane CE (8083) missing from SG** | Port not in inbound rules — Plane is only accessible from localhost/Cursor IDE on the EC2 |
| 🟡 WARN | **SSH (22) open to 0.0.0.0/0** | Should be restricted to office/VPN IP — acceptable for now |
| 🟡 WARN | **`ufw` inactive** | No host-level firewall; relying solely on AWS SG |
| ℹ️ INFO | **Docker also publishes 5432 + 6379 to host** | Even after SG fix, containers still bind `0.0.0.0:5432` and `0.0.0.0:6379` on the host. Remove host port bindings in `docker-compose.yml` as a P2 follow-up. |
| ✅ OK | Ports 3000, 3001 in SG as expected | — |
| ✅ OK | Ports 80, 443 present but unused | Harmless; reserved |

---

## 5. Docker Host Port Binding Issue (P2)

Even after the SG fix, `docker-compose.yml` still binds postgres and redis to the host `0.0.0.0`. This means any process on the EC2 instance itself can reach them. The SG is the only external protection.

```yaml
# docker-compose.yml (current — remove these for production)
postgres:
  ports:
    - "5432:5432"   # ← bind to 127.0.0.1:5432 or remove entirely

redis:
  ports:
    - "6379:6379"   # ← bind to 127.0.0.1:6379 or remove entirely
```

**Recommendation (P2):** Change to `127.0.0.1:5432:5432` or remove the `ports:` section entirely — these services are accessed only by the backend container over the internal Docker network.

---

## 6. Webhook Security Note

Port `:3000` must remain publicly accessible because **Plane CE posts webhook events** to `http://54.167.31.169:3000/webhooks/plane`. Restricting `:3000` would break bidirectional PM sync.

Mitigations already in place (P1-9):
- **`PLANE_WEBHOOK_ALLOWED_IPS`** — restrict which IPs may call `/webhooks/plane`
- **`PLANE_WEBHOOK_SECRET`** (HMAC-SHA256) — signature-verified

Reference: `docs/runbook.md` § "Webhook returns 403 ip_not_allowed"

---

## 7. How to Re-run the Audit

```bash
# Quick scan (no AWS credentials needed — checks ports and Docker bindings)
bash scripts/audit-ec2-security.sh

# With AWS credentials (also queries SG rules, can auto-revoke dangerous ones)
AWS_PROFILE=myprofile bash scripts/audit-ec2-security.sh

# Auto-revoke dangerous SG rules (requires credentials + permission)
AWS_PROFILE=myprofile bash scripts/audit-ec2-security.sh --fix
```

Exit code `0` = clean. Exit code `1` = critical issues found.

---

## 8. Production Hardening Checklist

| # | Action | Priority | Status |
|---|--------|----------|--------|
| 1 | **Delete 5432 from SG** (`sgr-0d1258741902daed1`) | 🔴 Immediate | ✅ Done Jun 11 |
| 2 | **Delete 6379 from SG** (`sgr-0d994a19ed959b581`) | 🔴 Immediate | ✅ Done Jun 11 |
| 3 | **Add 8083 to SG** (Plane CE) | 🔴 Immediate | ✅ Done Jun 11 |
| 4 | **Remove postgres/redis host port bindings** in `docker-compose.yml` | 🟠 High | P2 follow-up |
| 5 | **Restrict SSH (22)** to office/VPN IP | 🟠 High | ⏳ Optional — update when office IP known |
| 6 | **Enable `ufw`** as defence-in-depth | 🟡 Medium | P2 follow-up |
| 7 | **Set `PLANE_WEBHOOK_ALLOWED_IPS`** in `.env` | 🟡 Medium | ✅ Implemented (P1-9) |
| 8 | **HTTPS** with domain / reverse proxy | 🟡 Medium | P2 follow-up |
| 9 | **Rotate `ADMIN_TOKEN`** from default before customer demos | 🟠 High | Change in `.env`, restart backend |

---

## 9. Related Documents

- `docs/runbook.md` — operational guide (§8 Security, webhook troubleshooting)
- `docs/plane-integration.md` — Plane CE integration (webhook setup)
- `scripts/audit-ec2-security.sh` — automated audit script
- `memory/11th_June.md` — P1 task log
