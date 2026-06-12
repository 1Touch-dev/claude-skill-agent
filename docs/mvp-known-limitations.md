# MVP Known Limitations

**Branch:** `feature/platform-github-slack` (extends MVP; **not merged to `main`**)  
**Audience:** Stakeholders, product, engineering  
**Purpose:** Honest boundaries for what the MVP does **not** do yet  

This document prevents over-promising during demos and sets clear roadmap expectations.

> **June 10 update:** Branch `feature/plane-pm-integration` adds **Plane CE pm-bridge**. See [plane-integration.md](plane-integration.md).  
> **June 12 update:** Branch `feature/platform-github-slack` adds **live GitHub + Slack connectors** (platform hub, not Plane Commercial). See [integration-github.md](integration-github.md) and [integration-slack.md](integration-slack.md).

---

## What the MVP **Does** Do

- Multi-tenant **admin control plane** UI (skills, suites, overlays, customers, workspaces, entitlements, credits, agents, runs).  
- **Live dashboard** metrics from PostgreSQL via API.  
- **MVP authentication** (bearer token + role header; not enterprise SSO).  
- **Approvals** list with approve/reject and audit side effects.  
- **Integrations registry** with create, delete, status badges, and **live** test for GitHub/Slack (mock for Asana/Monday/Trello).  
- **Routing demo** (task intake → route → apply orchestration stub).  
- **Audit logs** per run ID.  
- **Reports** panels (credits, adoption, utilization, governance, billing).  
- **Docker** deployment on EC2 with documented URLs.  

---

## Not Yet Implemented (Roadmap)

The following are **planned** capabilities — **not** available in the current MVP.

### Identity and access

| Item | Status |
|------|--------|
| **SSO / SAML / OIDC** | Not implemented — demo uses shared `ADMIN_TOKEN` |
| **Enterprise directory sync** | Not implemented |
| **Fine-grained API RBAC** | Partial — role header only; not full policy matrix |
| **API keys per service** | Not implemented |
| **Session timeout / refresh** | Not implemented |

### Integrations (production)

| Item | Status |
|------|--------|
| **GitHub live connector** (PAT test, PR/issue webhooks) | ✅ On `feature/platform-github-slack` — repo webhook needs admin |
| **Slack live connector** (post messages, thread replies) | ✅ Outbound live + Event Subscriptions enabled |
| **Webhook receivers** `/webhooks/github`, `/webhooks/slack` | ✅ Implemented |
| **OAuth authorization flows** | Not implemented — PAT + bot token MVP |
| **Token refresh and revocation** | Not implemented |
| **Retry / dead-letter queues for integrations** | Not implemented |
| **Asana / Monday / Trello live APIs** | Not implemented — **mock test only** |
| **Inbound Slack commands / slash commands** | Not implemented |

### Runtime orchestration

| Item | Status |
|------|--------|
| **BullMQ / worker queues** | Dependencies present; workers not operational |
| **SLA escalations for approvals** | Not implemented |
| **Supervisor orchestrator with retries** | Not implemented |
| **Idempotent run pipeline** | Partial |

### Knowledge and AI product depth

| Item | Status |
|------|--------|
| **RAG / hybrid search** | Not implemented |
| **Brand voice enforcement** | Not implemented |
| **Document ingestion pipeline** | Not implemented |
| **End-user chat / copilot app** | Not implemented |

### Project management product

| Item | Status |
|------|--------|
| **Plane CE pm-bridge** (sync + webhooks) | ✅ |
| **PM status in admin UI** (`/tasks`, ✈ badge) | ✅ |
| **Platform GitHub / Slack hub** (not Plane Commercial) | ✅ MVP — GitHub repo webhook pending admin |
| **Full PM layer in-platform** (no external tool) | Not implemented — Plane is external |
| **End-user delivery application** | Not implemented |
| **Plane native GitHub / Slack** (Commercial Silo) | Not used — built in platform instead |

### Security and compliance (production-grade)

| Item | Status |
|------|--------|
| **Automated security scanner pipeline** | API stubs only |
| **Full policy engine** | Not implemented |
| **Enterprise compliance exports** | Not implemented |
| **SOC2 evidence automation** | Not implemented |
| **EC2 security group audit** | ✅ Audited Jun 11 — see `docs/ec2-security.md` |
| **Webhook IP allowlist** | ✅ `PLANE_WEBHOOK_ALLOWED_IPS` (P1-9) |
| **5432/6379 SG closure** | ⚠️ Host binding exists — SG inspection requires AWS credentials; see `docs/ec2-security.md` |

### Observability and operations

| Item | Status |
|------|--------|
| **Centralized logs / metrics / traces** | Not implemented |
| **Alerting and on-call runbooks** | Not implemented |
| **Multi-region HA deployment** | Not implemented |
| **Migration idempotency guarantees** | Partial |

---

## MVP-Specific Caveats (Say These in Demos)

1. **Integrations:** GitHub and Slack use **live** API tests and real notifications; Asana/Monday/Trello remain **mock**. GitHub repo webhook requires **repo admin**; Slack Event Subscriptions are enabled (`app_mention` inbound stub only).  
2. **Auth:** Anyone with the demo token can sign in as any role — not production security.  
3. **Routing:** Rule-based agent pick — not a full autonomous orchestrator with queues.  
4. **Approvals:** Workflow is approve/reject on a record — not multi-step SLA escalation.  
5. **Reports:** Data is real from DB but not full BI/charting/export suite.  
6. **Deployment:** EC2 demo requires security group ports **3000**, **3001**, and **8083** (Plane) open. Ports **5432** and **6379** must NOT be open to `0.0.0.0/0` — see `docs/ec2-security.md`.  
7. **PM (Plane):** Tasks sync to Plane as work items; PM UI is a **separate app** at `:8083`, not embedded in the admin UI yet.  
8. **GitHub/Slack:** Platform posts to Slack on route/status change; GitHub PR webhooks update tasks when branch/title includes `task-{id}`. Real GitHub delivery waits on repo webhook registration by an admin.  

---

## What “Complete” Means vs This MVP

| Dimension | MVP (~June 2026) | Full enterprise vision |
|-----------|------------------|------------------------|
| Control plane UI | ✅ Demo-ready | ✅ + end-user app |
| Governance | ✅ Registry + approvals MVP | ✅ Full policy + scanner |
| Integrations | ✅ Registry + live GitHub/Slack MVP | ✅ OAuth + full vendor sync |
| Auth | ⚠️ Token only | ✅ SSO + RBAC |
| Orchestration | ⚠️ Routing demo | ✅ Workers + SLA |
| PM / RAG | ⚠️ Plane bridge on feature branch | ✅ Full in-platform or embedded |

Estimate from sprint planning: **~75% MVP demo readiness**; **~35–40%** of full enterprise requirements document coverage.

---

## Related documents

- [user-guide.md](user-guide.md) — how to use the platform  
- [mvp-demo-script.md](mvp-demo-script.md) — 5-minute presenter script  
- [mvp-acceptance-report.md](mvp-acceptance-report.md) — QA evidence  
- [api-validation-report.md](api-validation-report.md) — endpoint validation  
- [live-browser-test-report.md](live-browser-test-report.md) — live browser proof  
- [memory/3rd_June.md](../memory/3rd_June.md) — MVP sprint history  
- [memory/10th_June.md](../memory/10th_June.md) — Plane PM integration spike  
- [plane-integration.md](plane-integration.md) — pm-bridge setup and API  
- [integration-github.md](integration-github.md) — GitHub webhook + sync  
- [integration-slack.md](integration-slack.md) — Slack notifications + Events API  
- [memory/12th_June.md](../memory/12th_June.md) — GitHub/Slack sprint log  

---

*Roadmap items are intentional next phases — not hidden failures of the MVP.*
