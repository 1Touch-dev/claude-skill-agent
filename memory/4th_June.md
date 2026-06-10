# Enterprise Claude Skills Platform — June 4, 2026 Sprint Plan

**Date:** June 4, 2026  
**Builds on:** [3rd_June.md](./3rd_June.md) (MVP complete, demo **PASS**)  
**Branch:** `feature/mvp-completion-june-3` (merge to `main` today if approved)  
**EC2 demo:** http://54.167.31.169:3001 — token `changeme`  
**Latest ops:** Docker `restart: unless-stopped` — site runs without laptop/Cursor open  

---

## Where We Left Off (June 3)

| Done | Status |
|------|--------|
| MVP control plane (all admin modules + APIs) | ✅ Complete |
| EC2 deployment + persistent Docker | ✅ Running |
| QA (API + live browser + acceptance) | ✅ PASS |
| Docs (user guide, demo script, limitations, README) | ✅ Complete |
| James briefing message prepared | ✅ Ready |

**MVP is demo-ready.** Today is **not** a greenfield build day — it is **stakeholder handoff, merge hygiene, and Sprint 2 kickoff planning/execution**.

---

## Goals for June 4

1. **Support James / stakeholder demo** — site healthy, no regressions.  
2. **Close the MVP branch** — PR, merge to `main`, tag or release note if needed.  
3. **Start post-MVP Sprint 2** — first production-grade increment (GitHub integration or SSO, per priority).  
4. **Capture feedback** — anything from demo becomes tickets in this file or `memory/progress.md`.

---

## Priority 1 — Demo & Stakeholder (Morning)

| # | Task | Owner | Done |
|---|------|-------|------|
| 1.1 | Smoke-check EC2: `curl` health + login + dashboard loads | Dev | ☐ |
| 1.2 | Confirm James has links: UI, token, `docs/mvp-demo-script.md` | Dev | ☐ |
| 1.3 | Attend / support James demo (or async walkthrough) | Dev | ☐ |
| 1.4 | Log stakeholder feedback in **Feedback** section below | Dev | ☐ |

**Demo path (5 min):** Login → Dashboard → Skills → Integrations (Test) → Routing Demo → Audit → Reports.

---

## Priority 2 — Git & Release Hygiene (Midday)

| # | Task | Owner | Done |
|---|------|-------|------|
| 2.1 | Open PR: `feature/mvp-completion-june-3` → `main` | Dev | ☐ |
| 2.2 | PR description: link `mvp-acceptance-report`, `mvp-known-limitations` | Dev | ☐ |
| 2.3 | Resolve any review comments | Dev | ☐ |
| 2.4 | Merge to `main` after James/sign-off | Dev | ☐ |
| 2.5 | On EC2: `git checkout main && git pull && docker compose up -d --build` | Dev | ☐ |
| 2.6 | Update `memory/3rd_June.md` / this file with merge commit hash | Dev | ☐ |

---

## Priority 3 — Sprint 2 Kickoff (Afternoon)

**Recommended focus (from June 3 plan):** **Live GitHub integration** — highest demo value after MVP.

Pick **one** primary track today; do not split across three.

### Track A — Live GitHub connector (preferred)

| # | Task | Done |
|---|------|------|
| 3A.1 | Design: OAuth app / PAT flow, env vars, token storage | ☐ |
| 3A.2 | Replace mock `connectors.js` test for GitHub with real API ping (e.g. `/user`) | ☐ |
| 3A.3 | Store tokens encrypted or env-backed vault pattern (no secrets in API responses) | ☐ |
| 3A.4 | UI: show real connection status after test | ☐ |
| 3A.5 | Tests + update `mvp-known-limitations.md` for GitHub only | ☐ |

### Track B — Enterprise auth (if James prioritizes security)

| # | Task | Done |
|---|------|------|
| 3B.1 | Spike OIDC provider (Auth0 / Cognito / Keycloak) | ☐ |
| 3B.2 | Backend JWT validation middleware (`REQUIRE_AUTH=true`) | ☐ |
| 3B.3 | Frontend login redirect flow (replace raw token paste) | ☐ |

### Track C — Workers / orchestration (if ops priority)

| # | Task | Done |
|---|------|------|
| 3C.1 | Wire BullMQ worker skeleton + Redis queue | ☐ |
| 3C.2 | Async job: post-approval run state transition | ☐ |
| 3C.3 | Health endpoint for worker status | ☐ |

**Decision needed:** Confirm with James which track wins — default **Track A**.

---

## Priority 4 — Hardening (If Time Permits)

| # | Task | Done |
|---|------|------|
| 4.1 | Seed script: always have 1 pending approval for live demos | ☐ |
| 4.2 | Integration edit UI (PUT already exists on API) | ☐ |
| 4.3 | CI: run `npm test` + `scripts/api-validate.sh` on PR | ☐ |
| 4.4 | HTTPS / domain in front of EC2 (nginx + cert) — optional | ☐ |

---

## Explicitly NOT for June 4

Do not start these today (future sprints):

- Full PM product (projects, epics, comments, end-user app)  
- RAG / brand voice / hybrid search  
- All five live integrations at once  
- Full SAML + workers + PM in one day  

---

## Feedback from Stakeholders (fill during/after demo)

| Source | Feedback | Action |
|--------|----------|--------|
| James | _TBD_ | _TBD_ |
| Team | _TBD_ | _TBD_ |

---

## End-of-Day Checklist

- [ ] EC2 demo URL still returns 200 (health + login)  
- [ ] MVP branch merged or PR open with clear status  
- [ ] Sprint 2 track chosen and first commit pushed  
- [ ] `memory/4th_June.md` updated with what shipped vs carried over  
- [ ] Standup tomorrow has clear carry-forward items  

---

## Carry-Forward to June 5+ (if not done today)

| Item | Phase |
|------|--------|
| Live Asana + Slack connectors | Sprint 2 continuation |
| Webhook ingestion | Sprint 2–3 |
| OIDC / SSO | Sprint 3 |
| BullMQ orchestration | Sprint 3 |
| PM domain tables + APIs | Phase D (large) |
| Observability (logs/metrics) | Production hardening |

---

## Reference Links

| Doc | Use |
|-----|-----|
| [3rd_June.md](./3rd_June.md) | MVP completion record |
| [2nd_June.md](./2nd_June.md) | Full 100% backlog |
| [docs/mvp-demo-script.md](../docs/mvp-demo-script.md) | James demo |
| [docs/mvp-known-limitations.md](../docs/mvp-known-limitations.md) | Honest scope |

---

## Git / Environment (start of day)

| Item | Value |
|------|--------|
| **Branch** | `feature/mvp-completion-june-3` |
| **Target** | merge → `main` |
| **EC2** | http://54.167.31.169:3001 |

---

*June 4, 2026 — Post-MVP: demo support, merge, Sprint 2 kickoff*
