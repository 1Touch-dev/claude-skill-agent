# EC2 Security Group Audit — Claude Skills Platform

**Branch:** `feature/plane-pm-integration`  
**Last audited:** June 11, 2026  
**Instance:** `i-007f63e3c802844fe` · `t3.medium` · `us-east-1c`  
**Public IP:** `54.167.31.169`  
**Security Group:** `sg-0106b45e7552109a0` (`launch-wizard-60`)  
**Audit tool:** `bash scripts/audit-ec2-security.sh`

---

## 1. Purpose

This document records the firewall posture of the demo EC2 instance, identifies risks, and provides the recommended target state. It is the reference for:

- James / ops when reviewing security before expanding access
- Engineers applying SG changes or removing dangerous host port bindings
- Future audits (re-run the script after any change)

---

## 2. Required Open Ports (Demo Mode)

| Port | Protocol | Service | Public? | Reason |
|------|----------|---------|---------|--------|
| **3001** | TCP | React Admin UI | ✅ Yes | Demo access for James + team |
| **3000** | TCP | Express API + Plane webhooks | ✅ Yes | Plane posts webhook events to `:3000/webhooks/plane`; direct API access for demos |
| **8083** | TCP | Plane CE (Caddy proxy) | ✅ Yes | PM board access for James + team |
| **22** | TCP | SSH | ⚠️ Restrict | Should be limited to office/VPN IPs — not `0.0.0.0/0` |

---

## 3. Ports That Must Stay Closed to the Internet

| Port | Service | Risk if open to `0.0.0.0/0` |
|------|---------|------------------------------|
| **5432** | PostgreSQL | Full unauthenticated DB access (no TLS, plain password) |
| **6379** | Redis | Unauthenticated read/write access to cache; can be used for RCE via `CONFIG SET` |
| **9000** | MinIO | S3-compatible object store — should remain internal only |
| **4369 / 5672 / 15672** | RabbitMQ | Message broker — internal only |

---

## 4. Audit Findings — June 11, 2026

### What was audited
- Instance metadata via EC2 IMDSv2 (confirmed instance ID, region, SG IDs)
- Host listening ports via `ss -tlnp`
- Docker container port bindings via `docker ps`
- Host firewall via `ufw` (inactive)
- AWS SG rules: **not queryable** — no AWS CLI credentials on this EC2 instance; SG must be checked via AWS Console

### Findings

| Severity | Finding | Action Required |
|----------|---------|----------------|
| 🔴 CRITICAL | Port **5432** (PostgreSQL) bound to `0.0.0.0` — Docker publishes `0.0.0.0:5432->5432/tcp` | Remove host port binding in `docker-compose.yml` **and** verify SG blocks port 5432 |
| 🔴 CRITICAL | Port **6379** (Redis) bound to `0.0.0.0` — Docker publishes `0.0.0.0:6379->6379/tcp` | Remove host port binding in `docker-compose.yml` **and** verify SG blocks port 6379 |
| 🟡 WARN | `ufw` is **inactive** — no host-level firewall; firewall enforcement relies entirely on AWS SG | Note for production: enable ufw as defence-in-depth; current risk is low if SG is correct |
| 🟡 WARN | AWS SG rules not inspected (no CLI credentials) | See manual inspection steps below |
| ℹ️ INFO | Ports 22, 3000, 3001, 8083 listening as expected | ✅ OK |

---

## 5. Security Group: Manual Inspection Steps

Since AWS CLI credentials are not present on this EC2 instance, verify the SG from outside:

```bash
# From a machine with AWS credentials configured (office/laptop)
SG_ID="sg-0106b45e7552109a0"
aws ec2 describe-security-groups --group-ids "$SG_ID" \
  --query 'SecurityGroups[0].IpPermissions' --output json
```

**Check for and remove any rules matching:**

| Port | CIDR | Action |
|------|------|--------|
| 5432 | 0.0.0.0/0 | ❌ Remove — PostgreSQL must never be world-accessible |
| 6379 | 0.0.0.0/0 | ❌ Remove — Redis must never be world-accessible |

**Remove dangerous rules (if present):**
```bash
# Revoke PostgreSQL if open to world
aws ec2 revoke-security-group-ingress \
  --group-id sg-0106b45e7552109a0 \
  --protocol tcp --port 5432 --cidr 0.0.0.0/0

# Revoke Redis if open to world
aws ec2 revoke-security-group-ingress \
  --group-id sg-0106b45e7552109a0 \
  --protocol tcp --port 6379 --cidr 0.0.0.0/0
```

**Recommended final inbound rules for demo mode:**

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 3001 | TCP | 0.0.0.0/0 | Admin UI |
| 8083 | TCP | 0.0.0.0/0 | Plane CE |
| 3000 | TCP | 0.0.0.0/0 | API + Plane webhooks |
| 22   | TCP | `<office-ip>/32` | SSH — restrict from 0.0.0.0/0 in prod |
| — | — | 5432 / 6379 must NOT appear | — |

---

## 6. Docker Host Port Binding Issue

Even if the AWS SG blocks 5432/6379 at the network edge, the current `docker-compose.yml` binds these ports to the host's `0.0.0.0`:

```yaml
# docker-compose.yml (current — problematic for production)
postgres:
  ports:
    - "5432:5432"   # ← exposes to host; remove in production

redis:
  ports:
    - "6379:6379"   # ← exposes to host; remove in production
```

**Recommendation:** Remove the `ports:` section for `postgres` and `redis` in `docker-compose.yml`. These services are accessed only by the backend container over the internal `app-net` Docker network, not from the host.

> ⚠️ This change is out of scope for the `feature/plane-pm-integration` branch to avoid regressions. Tracked as a follow-up (P2).

---

## 7. Webhook Security Note

Port `:3000` must remain publicly accessible because **Plane CE posts webhook events** to `http://54.167.31.169:3000/webhooks/plane`. Restricting `:3000` to internal-only would break bidirectional PM sync.

Mitigations already in place (P1-9):
- **`PLANE_WEBHOOK_ALLOWED_IPS`** — set in `.env` to restrict which IPs may call `/webhooks/plane`
- **`PLANE_WEBHOOK_SECRET`** (HMAC-SHA256) — all webhook payloads are signature-verified

Reference: `docs/runbook.md` § "Webhook returns 403 ip_not_allowed"

---

## 8. How to Re-run the Audit

```bash
# Quick scan (no AWS credentials needed — checks ports and Docker bindings)
bash scripts/audit-ec2-security.sh

# With AWS credentials (also queries SG rules and can auto-fix)
AWS_PROFILE=myprofile bash scripts/audit-ec2-security.sh

# Auto-revoke dangerous SG rules (requires credentials + permission)
AWS_PROFILE=myprofile bash scripts/audit-ec2-security.sh --fix
```

Exit code `0` = clean. Exit code `1` = critical issues found.

---

## 9. Production Hardening Recommendations

| # | Recommendation | Priority | Notes |
|---|---------------|----------|-------|
| 1 | **Remove 5432/6379 from SG** (if present) | 🔴 Immediate | Use AWS Console or CLI |
| 2 | **Remove postgres/redis host port bindings** in `docker-compose.yml` | 🟠 High | P2 follow-up; requires rebuild |
| 3 | **Restrict SSH (port 22)** to office/VPN IP range | 🟠 High | Update SG rule; note the IP first |
| 4 | **Enable `ufw`** as defence-in-depth | 🟡 Medium | `sudo ufw allow 3000/tcp; ufw enable` |
| 5 | **HTTPS** with a domain / reverse proxy | 🟡 Medium | Unify `:3000`, `:3001`, `:8083` behind TLS |
| 6 | **Set `PLANE_WEBHOOK_ALLOWED_IPS`** in `.env` | 🟡 Medium | P1-9 already implemented; just configure the env var |
| 7 | **Restrict API port 3000** behind a proxy in production | 🟡 Medium | Keep public for webhooks; add rate-limiting |
| 8 | **Rotate `ADMIN_TOKEN`** from `changeme` before customer demos | 🟠 High | Change in `.env` and restart backend |

---

## 10. Related Documents

- `docs/runbook.md` — operational guide (webhook troubleshooting, log commands)
- `docs/plane-integration.md` — Plane CE integration (webhook setup)
- `scripts/audit-ec2-security.sh` — automated audit script
- `memory/11th_June.md` — P1 task log
