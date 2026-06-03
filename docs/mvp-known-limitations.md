# MVP Known Limitations

**Branch:** `feature/mvp-completion-june-3`  
**Audience:** Stakeholders, product, engineering  
**Purpose:** Honest boundaries for what the MVP does **not** do yet  

This document prevents over-promising during demos and sets clear roadmap expectations.

---

## What the MVP **Does** Do

- Multi-tenant **admin control plane** UI (skills, suites, overlays, customers, workspaces, entitlements, credits, agents, runs).  
- **Live dashboard** metrics from PostgreSQL via API.  
- **MVP authentication** (bearer token + role header; not enterprise SSO).  
- **Approvals** list with approve/reject and audit side effects.  
- **Integrations registry** with create, delete, status badges, and **mock** test connection.  
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
| **OAuth authorization flows** | Not implemented |
| **Token refresh and revocation** | Not implemented |
| **Webhook ingestion** | Not implemented |
| **Outbound sync jobs** | Not implemented |
| **Retry / dead-letter queues for integrations** | Not implemented |
| **Live vendor API calls** | Not implemented — **mock test only** |

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
| **Full PM layer** (projects, epics, comments, files, dependencies) | Not implemented |
| **End-user delivery application** | Not implemented |
| **Notifications and automations** | Not implemented |

### Security and compliance (production-grade)

| Item | Status |
|------|--------|
| **Automated security scanner pipeline** | API stubs only |
| **Full policy engine** | Not implemented |
| **Enterprise compliance exports** | Not implemented |
| **SOC2 evidence automation** | Not implemented |

### Observability and operations

| Item | Status |
|------|--------|
| **Centralized logs / metrics / traces** | Not implemented |
| **Alerting and on-call runbooks** | Not implemented |
| **Multi-region HA deployment** | Not implemented |
| **Migration idempotency guarantees** | Partial |

---

## MVP-Specific Caveats (Say These in Demos)

1. **Integrations:** “Test connection” uses a **mock connector** — it proves registry and workflow, not live Asana/GitHub/Slack sync.  
2. **Auth:** Anyone with the demo token can sign in as any role — not production security.  
3. **Routing:** Rule-based agent pick — not a full autonomous orchestrator with queues.  
4. **Approvals:** Workflow is approve/reject on a record — not multi-step SLA escalation.  
5. **Reports:** Data is real from DB but not full BI/charting/export suite.  
6. **Deployment:** EC2 demo requires security group ports **3000** and **3001** open.  

---

## What “Complete” Means vs This MVP

| Dimension | MVP (~June 2026) | Full enterprise vision |
|-----------|------------------|------------------------|
| Control plane UI | ✅ Demo-ready | ✅ + end-user app |
| Governance | ✅ Registry + approvals MVP | ✅ Full policy + scanner |
| Integrations | ✅ Registry + mock test | ✅ OAuth + webhooks + sync |
| Auth | ⚠️ Token only | ✅ SSO + RBAC |
| Orchestration | ⚠️ Routing demo | ✅ Workers + SLA |
| PM / RAG | ❌ | ✅ |

Estimate from sprint planning: **~75% MVP demo readiness**; **~35–40%** of full enterprise requirements document coverage.

---

## Related documents

- [user-guide.md](user-guide.md) — how to use the platform  
- [mvp-demo-script.md](mvp-demo-script.md) — 5-minute presenter script  
- [mvp-acceptance-report.md](mvp-acceptance-report.md) — QA evidence  
- [api-validation-report.md](api-validation-report.md) — endpoint validation  
- [live-browser-test-report.md](live-browser-test-report.md) — live browser proof  
- [memory/3rd_June.md](../memory/3rd_June.md) — sprint history and status  

---

*Roadmap items are intentional next phases — not hidden failures of the MVP.*
