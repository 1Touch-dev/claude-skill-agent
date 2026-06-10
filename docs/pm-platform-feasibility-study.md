# PM Platform Feasibility Study — Revised (June 10, 2026)

**Date:** 10 June 2026  
**Author:** Engineering assessment (Claude Skills Platform)  
**Audience:** James (product), engineering leadership  
**Context:** Following James's WhatsApp message on 10/06/26 opening three paths + sharing GitHub repos + Instagram post (AppFlowy)

---

## What Changed Since June 2

| Update | Detail |
|--------|--------|
| **Worksuite source code received** | James sent the zip: `Worksuite SaaS Project Management.zip` (87MB, v6.0.09) — **inspected** |
| **James opened 3 options** | 1) Worksuite (code in hand), 2) Multi-agentic system builds PM core, 3) Open-source PM tools |
| **5 GitHub repos shared** | `taskNebula`, `FlowBoard`, `mission-control`, `Orchestra`, `taskboard` |
| **AppFlowy shared** (Instagram) | Open-source Notion alternative, 72K stars, AGPL-3.0, $30M raised |

---

## Executive Summary

After inspecting the Worksuite source and researching all options, **the recommendation changes** from "Neither" to a structured two-week decision spike.

**Updated Recommendation:**
1. **Worksuite** is now more viable than the June 2 assessment because the REST API package (`froiden/laravel-rest-api`) is **bundled in the vendor folder** — it does not require a separate paid module.
2. **Plane** (open-source, 50K stars, TypeScript/React/Django, full REST + webhooks, GitHub/Slack native) is the strongest open-source candidate — **not** any of the 5 repos James linked.
3. The 5 GitHub repos are **personal/hobby projects** (14–73 stars each) and are **not viable** as an enterprise PM foundation.
4. AppFlowy is a **Notion/wiki tool**, not a PM system, and runs on **Dart + Rust** — the hardest possible stack to integrate with.

### If I were CTO

> **Run a 2-week integration spike on Plane first, then decide.**
>
> Plane is free (AGPL-3.0), has a documented REST API and webhooks, and runs on Docker. We can hook it to our Node control plane via Strategy A without modifying its source (which avoids the AGPL obligation). If the spike succeeds, adopt Plane as the PM layer. If not, use the Worksuite code James has.

**Recommended Option:** **Plane (open-source)** — with Worksuite as fallback if AGPL or integration friction is unacceptable.

**Reason:** Plane is free, TypeScript/React ecosystem closer to ours, natively integrates GitHub + Slack + GitLab, has full documented REST API and webhooks with no paid add-on requirement, and 50K+ stars means production-grade quality. We do not need to modify Plane's source — Strategy A (integrate via API) avoids AGPL concerns entirely.

**Estimated time saved vs building PM ourselves:** 4–6 weeks (Plane integration spike completes in 2 weeks; full PM wiring in 6 weeks total vs 10 weeks build from scratch).

**Confidence level:** High (80%) on Plane as the right external candidate; Medium (60%) on integration effort estimate pending spike.

---

## Worksuite Source Code Inspection (v6.0.09)

> **Inspected zip:** `Worksuite SaaS Project Management.zip` (87MB)
> **Internal path:** `worksuite-saas-new-6.0.09/script/`

### Key findings

| Finding | Evidence |
|---------|----------|
| **Laravel 12, PHP ^8.2** | `composer.json`: `"laravel/framework": "^12.0"` |
| **Sanctum 4.0 included** | `"laravel/sanctum": "^4.0"` |
| **REST API bundled** | `froiden/laravel-rest-api ^13.0.0` in `composer.json`; **`vendor/froiden/laravel-rest-api/` folder present** |
| **Module system** | `nwidart/laravel-modules: 10.0.6` in composer; `Modules/` folder is **empty** — sold separately |
| **Codebase size** | **1,701 PHP files** in `app/`; **326 database migrations** |
| **PM models** | `Project`, `Task`, `SubTask`, `TaskComment`, `TaskFile`, `ProjectMilestone`, `TaskboardColumn`, `TaskHistory`, `TaskLabel`, etc. — **fully built** |
| **Tenancy** | `HasCompany` trait on all models, `company_id` FK — single-database multi-tenancy |
| **Slack built-in** | `SlackSetting` (per-company webhook URL); `NewTask`, `TaskComment`, `ProjectMemberMention` notifications use `slack_webhook` directly — **no extra purchase needed** |
| **Outbound webhooks** | Payment webhooks only in this zip (Stripe, Paystack, Razorpay); the **project/task event webhook module is NOT included** — still sold separately |
| **Routes/api.php** | Only 1 stub route (`purchased-module`) — REST controllers not auto-wired; `ApiController` base class present for building them |

### What the REST API package provides (now confirmed by source)

The `froiden/laravel-rest-api` package exposes:
- `ApiController` base class (CRUD on any Eloquent model)
- `ApiRoute` facade for resource routing
- Prefix `api/v1`, CORS, limit/offset pagination
- Filter, include relations in query params

To expose e.g. `Project` as an API resource: create `ProjectApiController extends ApiController` and add one line in `routes/api.php`. This is **low-code**.

**Revised assessment:** The REST API story is stronger than we thought. No additional module purchase is needed to build API endpoints — the infrastructure is already in the zip. The separate "REST API Module" sold on CodeCanyon just ships pre-built controllers for all Worksuite resources. We can build those controllers ourselves using the same package.

### What is still missing from the zip

| Feature | Status |
|---------|--------|
| Project/task outbound webhooks | **Not in zip** — separate module |
| Pre-built REST controllers for all resources | **Not in zip** — separate module (but buildable) |
| nwidart add-on modules (Recruit, Payroll, etc.) | **Not in zip** — each sold separately |

---

## James's 5 GitHub Repos — Assessment

> James shared these as trending open-source options.

| Repo | Stars | Stack | Description | Verdict |
|------|-------|-------|-------------|---------|
| [neuraparse/taskNebula](https://github.com/neuraparse/taskNebula) | 33 | Next.js + PostgreSQL | Linear-like UX, AI copilot — personal project | **Too small — not production-ready** |
| [rasimme/FlowBoard](https://github.com/rasimme/FlowBoard) | 73 | Unknown | Project workspaces for AI agents (OpenClaw context) | Interesting concept, not a PM system |
| [rdsthomas/mission-control](https://github.com/rdsthomas/mission-control) | 20 | Unknown | Kanban for AI assistants (MoltBot) | Toy project |
| [Traves-Theberge/Orchestra](https://github.com/Traves-Theberge/Orchestra) | 25 | Desktop | AI coding agents + PM + terminal | Desktop IDE tool, not web PM |
| [tcarac/taskboard](https://github.com/tcarac/taskboard) | 14 | Go / SQLite | Local PM, MCP server, single binary | Local-only, not multi-tenant |

**Verdict on all 5:** None of these are enterprise PM platforms. They are individual developer projects. **Do not use any of them as the PM layer foundation.** The MCP server concept in `taskboard` is interesting for future agent tool integration, but that is separate work.

---

## AppFlowy (Instagram Post)

![AppFlowy](../assets/PHOTO-2026-06-09-04-44-14-3c6a081f-467a-4a08-ba4a-01878fd8da24.png)

> James shared: "Open-source Notion. Sell self-hosted to enterprises worried about data privacy. They raised $30M because this market is massive."

| Attribute | Detail |
|-----------|--------|
| Stars | **~72K** ([github.com/AppFlowy-IO/AppFlowy](https://github.com/appflowy-io/appflowy)) |
| License | **AGPL-3.0** |
| Stack | **Dart (Flutter) + Rust** — desktop/mobile first |
| Backend | AppFlowy-Cloud (Rust, separate repo, also AGPL) |
| PM features | Documents, databases, kanban boards, pages — Notion-like |
| REST API | Available ([OpenAPI docs](https://github.com/AppFlowy-IO/documentations/blob/main/documentation/appflowy-cloud/openapi/README.md)), workspace/database/page endpoints |
| Zapier | Official integration ([announced April 2025](https://appflowy.com/blog/appflowy-is-now-on-zapier)) |
| Business model | Open-core — commercial fork is closed-source proprietary |

**Why AppFlowy is wrong for us:**

1. **Stack mismatch:** Dart/Rust vs our Node/React. No shared libraries.
2. **Notion-like, not PM-like:** AppFlowy is a docs/wiki/database tool. It can approximate PM but lacks sprints, Gantt, resource tracking, team workflows.
3. **AGPL + open-core commercial risk:** The commercial fork is closed. Integrating the open version means AGPL obligations. Their own team runs a separate paid version.
4. **Integration complexity:** API exists but requires GoTrue JWT auth + separate Cloud backend deployment.

**Verdict: Pass.** Not suitable as our PM layer.

---

## Plane — The Real Open-Source Candidate

> James did not link Plane, but it is the strongest open-source PM platform available in 2026.

| Attribute | Detail |
|-----------|--------|
| Stars | **~50K** ([github.com/makeplane/plane](https://github.com/makeplane/plane/)) |
| License | **AGPL-3.0** (Community Edition) |
| Stack | **TypeScript + React** (frontend) + **Python/Django** (backend) |
| Database | **PostgreSQL** |
| Deploy | Docker Compose, Kubernetes, Helm — same as our stack |
| REST API | **Full documented API** at [developers.plane.so](https://developers.plane.so/api-reference/introduction) — `X-API-Key` auth |
| Webhooks | **Every event** — projects, work items, cycles, modules |
| Native integrations | **GitHub, GitLab, Slack** — built-in, not add-ons |
| PM features | Projects, Work Items (issues), Cycles (sprints), Modules, Pages, Dashboards, Gantt, Intake, Estimates |
| Self-host | Free, unlimited users, no license fee |

### Why Plane beats Worksuite for our use case

| Factor | Plane | Worksuite |
|--------|-------|-----------|
| License cost | **Free** | $59+ Extended |
| API | **Full documented REST** (out of the box) | REST package bundled but needs controller wiring |
| Webhooks | **Every event, built-in** | Separate purchase / custom build |
| Slack integration | **Native, full** | Notification webhook only (outbound) |
| GitHub integration | **Native sync** | Not available |
| Stack language | TypeScript/React (closer to ours) | PHP/Laravel (different) |
| Scope | PM only | HR + CRM + PM + Finance (bloat) |
| DB | **PostgreSQL** (same as ours) | MySQL (different) |
| Docker deploy | Yes | Yes |
| AGPL concern | **If not forked — no obligation** | No concern (paid license) |

### AGPL concern — when it applies and when it does not

| Our approach | AGPL applies? |
|-------------|--------------|
| Run Plane unmodified, call its API from our Node service | **No** — we are a user of the API, not distributing Plane's code |
| Fork Plane and modify source | **Yes** — must open-source our modifications |
| Deploy Plane inside our Docker cluster | **No** — internal deployment does not trigger AGPL |
| Ship Plane as part of our SaaS product | Potentially — seek legal review |

**Safe path:** Run Plane as a **separate service**, integrate via REST API + webhooks from our Node control plane. Never modify Plane source. This is Strategy A and avoids AGPL entirely.

---

## Option 2: Multi-Agentic System Builds PM Core

James proposed this on 08/06/26 as an alternative to buying software.

**What this means:** Use our own AI agents (the skills and routing system we've already built) to generate the PM layer code for our existing Node/Postgres stack.

| Aspect | Assessment |
|--------|------------|
| Feasibility | **Yes** — we already have agents/skills/routing in the platform |
| What gets built | React PM UI pages + Express routes + Postgres tables — same stack |
| Speed multiplier | AI-assisted development cuts 10-week build to ~4–6 weeks |
| Stack consistency | **Best** — single Node/Postgres codebase, one auth model, one audit log |
| Risk | Low — we can verify every generated piece |
| PM layer quality | Starts lean; grows to exactly what we need |
| External dependency | **None** |

**This is not mutually exclusive with Option 3.** You can use AI agents to build the integration bridge to Plane (or the in-house PM tables). The agents produce working Node code.

---

## Architecture Options (Updated)

### Strategy A — Control plane + Plane (or Worksuite) via REST/webhooks

```
Claude Skills Platform  (Node/Express/React/Postgres)
        ↕  pm-bridge service (new Node microservice)
        ↕  REST API calls + webhook consumers
Plane  (React/Django/Postgres)  OR  Worksuite  (Laravel/MySQL)
        (separate Docker container, same server)
```

**With Plane:**
- `pm-bridge` calls `POST /api/v1/workspaces/{slug}/projects/` when a customer workspace is provisioned
- When a `task_intake` is routed to an agent, `pm-bridge` creates a Plane Work Item
- Plane webhooks → `pm-bridge` → update `task_routes` status in our DB
- Skill run `approval_gates` remain 100% in our Postgres (Plane never knows about them)
- Users see Plane UI for PM; admins see our UI for governance

**Effort:** 4–6 weeks (2-week spike + 2–4 weeks wiring)

**With Worksuite (fallback):**
- Similar bridge but PHP/MySQL vs our Postgres — dual DB
- Must build REST controllers (low-code with bundled package)
- Outbound webhook module still needed for task events

**Effort:** 6–10 weeks

---

### Strategy B — Fork source and build inside

| Product | Verdict |
|---------|---------|
| Plane | Don't fork. AGPL requires releasing modifications. |
| Worksuite | Don't fork. 1,701 PHP files + Laravel — team is Node/React. |

**Not recommended.**

---

### Strategy C — PM as system of record, control plane as modules

Incompatible with our architecture. Governance logic (skills/approvals/credits) cannot live inside either product's module system cleanly.

**Not recommended.**

---

## Entity Mapping (Updated with Plane)

### Agent System

| Our concept | Plane equivalent | Integration |
|-------------|-----------------|-------------|
| Agent profiles | Members/Assignees | Map `agent_id` → Plane member via `external_id` |
| Skill runs | Work Items (Issues) | `POST /work-items` with `run_id` in meta/description |
| Approvals | None in Plane | Stay 100% in our DB; set Work Item label = "pending approval" |
| Audit logs | Plane Activity feed | Supplement with our `audit_log` (ours is canonical) |
| Routing | Plane assignment | When routed, update Work Item assignee to mapped agent member |

### Governance Model

| Our concept | Plane equivalent | Integration |
|-------------|-----------------|-------------|
| Skill lifecycle | None | Stays in our registry — no sync needed |
| Risk tiers | Priority field (0-4) | Map risk_tier → priority |
| Approval gates | None | Stay in our `approval_gates` table; add label on Work Item |
| Entitlements | None | Our `workspaces.entitlement_id` governs what Plane project is accessible |
| Credit pools | None | Deducted by our `orchestration_runs` — Plane unaware |

### Integration Registry

| Our target | Plane | Status |
|------------|-------|--------|
| **Slack** | Native integration built-in | Plane handles team PM notifications; we handle governance alerts |
| **GitHub** | Native integration built-in | Plane syncs issues ↔ GitHub directly |
| **Asana** | No native Plane integration | Zapier bridge or custom import |

---

## Estimated Engineering Effort (All Options)

| Path | Effort | Calendar (2 devs) | Cost |
|------|--------|--------------------|------|
| **Plane Strategy A** (recommended) | pm-bridge service, mapping tables, webhook handlers | **4–6 weeks** | Free |
| **Worksuite Strategy A** | REST controllers + bridge + webhook module | **6–10 weeks** | $59+ |
| **Build PM v1 in-house** | PM tables, React pages, API routes | **8–10 weeks** | Eng time only |
| **Any Strategy B/C** | Rewrite in foreign stack | **8–15 months** | Not viable |

---

## Risks

| Risk | Plane | Worksuite | Build own |
|------|-------|-----------|-----------|
| AGPL if we modify source | Medium | None | None |
| Dual-stack ops burden | Medium (Postgres/Django) | High (MySQL/PHP/Laravel) | None |
| API completeness | Low (full docs) | Medium (must build controllers) | None |
| Webhook coverage | Low (every event) | High (must buy module) | None |
| James wants owned source | Plane CE is AGPL free | Code in hand already | Full ownership |
| Scope creep (HR/CRM) | None — PM only | **High** | None |

---

## Recommended Next Steps (Action Plan)

### Week 1–2: Plane Integration Spike

**Goal:** Prove that our Node control plane can create/read/update Plane projects and work items via REST API.

| Task | Owner | Output |
|------|-------|--------|
| Deploy Plane CE via Docker Compose on EC2 | Abhishek | Plane running at `pm.54.167.31.169:8080` |
| Create `pm-bridge` Node service (skeleton) | Abhishek | `backend/src/services/pm-bridge/` |
| Map one `workspace` → Plane project via REST | Abhishek | Working `POST /api/v1/...` call |
| Map one `task_intake` → Plane Work Item | Abhishek | Work Item created with `run_id` in description |
| Receive one Plane webhook → update our DB | Abhishek | Webhook → `task_routes` status update |
| Report to James | Abhishek | Go/No-go decision |

### Week 3–6: Full PM Layer Wiring (if spike passes)

- Workspace provisioning → auto-create Plane project
- Agent routing → assign Plane Work Item to agent member
- Approval state changes → update Plane Work Item label
- Slack notifications via Plane (replace mock in our registry)
- GitHub issues ↔ Plane sync (via Plane's native GitHub integration)

### Parallel: Continue Platform Work

- Sprint 2 GitHub live connector (already planned)
- SSO groundwork
- Worker queues

---

## Decision Matrix for James

| Criteria | Plane | Worksuite | Build own |
|----------|-------|-----------|-----------|
| Fastest to demo | ✅ 4–6 weeks | 6–10 weeks | 8–10 weeks |
| Zero cost | ✅ Free | ❌ $59–200+ | ✅ Eng only |
| Code ownership | AGPL (can own modifications if AGPL compliant) | ✅ Commercial | ✅ Full |
| GitHub native | ✅ Built-in | ❌ Manual | Manual |
| Slack native | ✅ Built-in | Webhook only | Manual |
| Single stack | ❌ Adds Django/React service | ❌ Adds PHP/MySQL | ✅ One stack |
| PM scope only | ✅ | ❌ HR/CRM/Finance bloat | ✅ |

---

## Final Recommendation Block

**Recommended Option:** **Plane** (open-source integration, Strategy A)

**Reason:** James now has the Worksuite code, but after source inspection, Worksuite is 1,701 PHP files of HR/CRM/finance baggage plus a MySQL database — a second stack to operate forever. Plane is a PM-only TypeScript/React/PostgreSQL system with a fully documented REST API, native GitHub and Slack integrations, webhooks on every event, and zero license cost. We can deploy it alongside our existing EC2 stack, integrate via a thin `pm-bridge` Node service (Strategy A), and have a working demo in 2 weeks without touching Plane's source (which keeps us outside AGPL obligations). The 5 GitHub repos James shared are personal projects and not viable. AppFlowy is a Notion tool on Dart/Rust — wrong stack and wrong use case.

If James requires **full source code ownership** and no AGPL risk: **Worksuite** (code in hand, REST API infrastructure already bundled in vendor, buildable with 6–10 weeks of Node bridge work).

If James wants **zero external dependencies**: Build the PM layer in-house using our multi-agentic system (Option 2) in 8–10 weeks.

**Estimated time saved versus building PM layer ourselves:**
- Plane: **4–6 weeks saved** (6-week integration vs 10-week build)
- Worksuite: **0–2 weeks saved** (dual-stack penalty cancels efficiency gains)

**Confidence level:** **High (80%)** on Plane as the best external option; **Medium (65%)** on effort estimate pending 2-week spike results.

---

## Sources

- Worksuite source code inspection: `Worksuite SaaS Project Management.zip` (in-repo, `/home/ubuntu/claude-skill-agent/`)
- Worksuite composer.json: `froiden/laravel-rest-api ^13.0.0`, `nwidart/laravel-modules: 10.0.6`, `laravel/sanctum ^4.0`, `laravel/framework ^12.0`
- Plane GitHub: https://github.com/makeplane/plane (50K+ stars, AGPL-3.0)
- Plane API docs: https://developers.plane.so/api-reference/introduction
- Plane self-host: https://plane.so/open-source
- AppFlowy GitHub: https://github.com/appflowy-io/appflowy (72K stars, AGPL-3.0, Dart/Rust)
- AppFlowy REST API: https://github.com/AppFlowy-IO/documentations/blob/main/documentation/appflowy-cloud/openapi/README.md
- AppFlowy Zapier: https://appflowy.com/blog/appflowy-is-now-on-zapier
- taskNebula: https://github.com/neuraparse/taskNebula (33 stars)
- FlowBoard: https://github.com/rasimme/FlowBoard (73 stars)
- mission-control: https://github.com/rdsthomas/mission-control (20 stars)
- Orchestra: https://github.com/Traves-Theberge/Orchestra (25 stars)
- taskboard: https://github.com/tcarac/taskboard (14 stars)
- June 2 feasibility study: first revision of this document
- WhatsApp conversation: 04/06/26–10/06/26 (Abhishek ↔ James)

*Last updated: June 10, 2026*
