# Finance Platform Handoff — Enterprise Claude Skills

**Date:** 13 July 2026  
**Handoff from:** Abhishek Kulkarni  
**Active branch:** `feature/jun25-agency-sprint`  
**GitHub:** https://github.com/1Touch-dev/claude-skill-agent/tree/feature/jun25-agency-sprint  
**Status:** Live on EC2 · 43/43 tests pass · Do NOT merge to `main` until James approves

---

## 1. What this system is

An enterprise **AI control plane** (not a task manager or prompt library). It governs Claude skills, agents, workspaces, entitlements, credits, approvals, and integrations.

**Primary market:** Marketing / AI / SEO / design agencies (confirmed by James Thunder Marketing).

**Architecture decision (James-approved):** Our platform is the integration hub. Plane CE is only the PM work-item store. GitHub + Slack are built into *our* system (not Plane Commercial).

---

## 2. Purpose

- Register and govern Claude Skills as licensed product units
- Bundle skills into department suites and industry overlays
- Assign skills to AI agents with autonomy levels and risk tiers
- Meter usage via credit pools and (planned) subscription packages
- Sync tasks → Plane CE; notify Slack; ingest GitHub PR/issue events
- Expose a public Agent API (`/v1`) for marketplaces (Asana, Monday, Zapier, Make)
- Connect agents to 9,000+ apps via Zapier MCP
- Run multi-step agency workflows with one API call

---

## 3. How it works (flow)

```
User / Marketplace / Workflow
        │
        ▼
Admin UI (:3001)  OR  Public API /v1  OR  /api/workflows/:key/run
        │
        ▼
Express API (:3000)
  ├── Auth: Bearer ADMIN_TOKEN (admin) OR API_KEYS (/v1)
  ├── Routing engine → pickAgent(workspace, skill, autonomy, risk)
  ├── Creates task_intake + orchestration run
  ├── pm-bridge → Plane CE work item (:8083)
  ├── Slack service → #server-alerts
  └── Zapier MCP → mcp.zapier.com (optional external actions)

Inbound:
  GitHub ──(poller every 2min)──► processGitHubEvent() → task → Plane → Slack
  Slack  ──(Event Subscriptions)──► /webhooks/slack
  Plane  ──(webhooks)──► /webhooks/plane → update task status
```

---

## 4. Live environment

| Service | URL | Status |
|---------|-----|--------|
| Admin UI | http://54.167.31.169:3001 | Live |
| Platform API | http://54.167.31.169:3000 | Live |
| Public Agent API | http://54.167.31.169:3000/v1 | Live |
| Zapier MCP proxy | http://54.167.31.169:3000/api/mcp | Live |
| Plane CE | http://54.167.31.169:8083 | Live |
| GitHub Poller | EC2 backend job | Running every 120s |

### Credentials (demo)

| What | Value |
|------|--------|
| Platform login | http://54.167.31.169:3001/login |
| Platform token | `changeme` (`ADMIN_TOKEN` in `.env`) |
| Roles | `admin`, `operator`, `viewer` |
| Plane admin | `admin@planepmsystem.local` / see `PLANE_ADMIN_PASSWORD` in `.env` |
| Plane workspace | `claude-skills` |

**Never commit `.env`.** Use `.env.example` as the template.

---

## 5. Platform snapshot (live, Jul 13 2026)

| Metric | Count |
|--------|-------|
| Skills | 12 (all enabled) |
| Packages | 12 |
| Department suites | 6 |
| Industry overlays | 5 |
| Customers | 2 (Acme, Globex) |
| Workspaces | 2 |
| Agents | 2 |
| Tasks | 29 |
| Integrations (UI registry) | 4 connected |
| Workflow templates | 3 |
| Test suites | 43/43 PASS |

### Skills live now

| Key | Name |
|-----|------|
| mkt_campaign_brief | Campaign Brief Generator |
| eng_pr_summary | PR Summary Bot |
| prod_spec_outline | Spec Outline Assistant |
| grc_policy_check | Policy Checker |
| ops_runbook | Runbook Draft |
| cs_response_helper | CS Response Helper |
| mkt_seo_content | SEO Content Writer |
| mkt_ad_copy | Ad Copy Generator |
| mkt_email_sequence | Email Sequence Builder |
| mkt_landing_copy | Landing Page Copy Generator |
| mkt_social_post | Social Media Post Writer |
| mkt_competitor_report | Competitor Analysis Report |

### Workflow templates

| Key | Steps | Credits |
|-----|-------|---------|
| agency_client_onboarding | brief → SEO → landing copy | 44 |
| b2b_outbound_sequence | email sequence → ad copy → competitor report | 33 |
| seo_content_pipeline | competitor → SEO article → social posts | 46 |

Files: `backend/data/workflows/*.json`

---

## 6. What is DONE (cumulative)

### Core control plane (Jun 3)
- React admin UI: Dashboard, Skills, Packages, Suites, Overlays, Customers, Workspaces, Entitlements, Credit Pools, Agents, Runs, Tasks, Routing Demo, Approvals, Integrations, Audit, Reports
- Multi-tenant model + Bearer auth + roles
- Routing engine `pickAgent`
- Docker Compose on EC2 + demo seed

### Plane CE pm-bridge (Jun 10–11)
- Self-hosted Plane on `:8083`
- Task → Plane work item sync (auto on Route & Apply)
- Plane webhook → task status + Slack reply
- Agent → Plane member mapping
- `scripts/test-pm-integration.sh` 12/12

### GitHub + Slack hub (Jun 12)
- Live GitHub PAT connector + Slack Web API
- Webhooks: `/webhooks/github`, `/webhooks/slack`, `/webhooks/plane`
- Slack Event Subscriptions (`app_mention`)
- Migration `0011_github_slack_links.sql`
- `scripts/test-integrations.sh` 6/6

### GitHub Poller interim inbound (Jun 15)
- Polls every 2 min via PAT (no repo admin needed)
- Shared `processGitHubEvent()` with webhook path
- Dedup via unique `(provider, external_id)`
- Migration `0012_github_poller.sql`
- `scripts/test-github-poller.sh` 8/8

### Agency sprint (Jun 25) — CURRENT BRANCH
- 6 agency skills (migration `0013_agency_skills.sql`) — total 12
- Public Agent API `/v1` — `backend/src/routes/agent-api.js` — 10/10 tests
- Zapier MCP — `backend/src/services/zapier-mcp/` + `/api/mcp/*` — live Slack tested — 7/7
- 3 workflow templates + `/api/workflows/*`
- Tasks UI: GitHub PR + Slack thread badges
- Docs: `docs/agent-api.md`, `docs/zapier-mcp.md`, `memory/25th_June.md`

---

## 7. What is PENDING (next work)

### Immediate / high priority
| # | Item | Owner | Notes |
|---|------|-------|-------|
| N1 | Native GitHub repo webhook | James/Shubham | Payload `http://54.167.31.169:3000/webhooks/github`, events PRs+Issues, secret=`GITHUB_WEBHOOK_SECRET`, disable SSL verify if needed |
| N2 | Disable poller after webhook live | Dev | `GITHUB_POLL_ENABLED=false`, recreate backend |
| N3 | Merge branch → `main` | James approval | Branch ready, all tests green |
| N4 | Seed pricing packages | Dev | $99 / $249 / $599 / Custom — schema ready |
| N5 | Stripe billing | James decision | `usage_charges` / credit pools ready |
| N6 | +14 skills (sales, CS, ops, HR, finance) | Dev | Target 40+ — see `memory/24th_June.md` |
| N7 | More Zapier apps | Dev | Add Asana, Monday, Gmail, HubSpot on mcp.zapier.com |
| N8 | Skill marketplace UI | Dev | ratings, usage, categories |
| N9 | Affiliate program | James | PartnerStack vs Rewardful |
| N10 | Workflow wizard UI | James requested Jun 29 | Text inputs → fill template vars; optional per-step approval |
| N11 | Multi-agent + RAG per industry | James requested Jun 29 | pgvector knowledge bases — Phase 3, high differentiation |

### Medium term
- Worker queues (BullMQ/Redis) for fully autonomous skill execution
- Self-improving skill eval loops
- Inbound Slack bot commands (beyond logging)
- White-label for agencies
- Self-serve onboarding
- Landing + pricing pages
- Demo Loom video

### Deferred
- HTTPS + custom domain, SSO/SAML, OAuth apps, end-user chat UI, fine-grained RBAC
- Close public postgres/redis ports properly in production
- Plane Commercial (James: not pursuing)

---

## 8. Key technical map

### Important source paths
```
backend/src/app.js                 # mounts /v1, /api, /webhooks
backend/src/index.js               # starts githubPoller
backend/src/routes/agent-api.js    # public /v1
backend/src/routes/mcp.js          # Zapier MCP proxy
backend/src/routes/workflows.js    # workflow templates
backend/src/routes/webhooks.js     # plane|github|slack + processGitHubEvent
backend/src/routes/routing.js      # pickAgent, route/apply
backend/src/services/pm-bridge/    # Plane REST
backend/src/services/github/       # GitHub REST + list PRs/issues
backend/src/services/slack/        # Slack Web API
backend/src/services/zapier-mcp/   # MCP JSON-RPC client
backend/src/jobs/github-poller.js  # interim inbound
backend/data/workflows/            # JSON templates
frontend/src/pages/Tasks.jsx       # Plane + GitHub + Slack badges
frontend/src/pages/Integrations.jsx
```

### DB migrations (apply in order)
`0002` … `0008` core → `0009` pm-bridge → `0010` agent plane map → `0011` github/slack → `0012` poller → `0013` agency skills

Database name in Docker: check compose; local `.env` uses `enterprise_skills` / container may use `enterprise_claude_skills`. Confirm with `docker compose exec postgres psql -U ... -l`.

### Env flags that matter
```
ADMIN_TOKEN / API_KEYS / REQUIRE_AUTH
PUBLIC_API_URL / PUBLIC_UI_URL
PLANE_API_URL / PLANE_API_KEY / PLANE_WORKSPACE_SLUG / PLANE_WEBHOOK_SECRET
GITHUB_TOKEN / GITHUB_DEFAULT_REPO / GITHUB_WEBHOOK_SECRET
GITHUB_POLL_ENABLED / GITHUB_POLL_INTERVAL_SEC
SLACK_BOT_TOKEN / SLACK_DEFAULT_CHANNEL / SLACK_SIGNING_SECRET
ZAPIER_MCP_ENABLED / ZAPIER_MCP_TOKEN / ZAPIER_MCP_ENDPOINT
```

### Deploy / restart (code or .env changes)
```bash
cd /home/ubuntu/claude-skill-agent
git checkout feature/jun25-agency-sprint
git pull origin feature/jun25-agency-sprint
docker compose build backend frontend
docker compose up -d --force-recreate backend frontend
# Plane stack (if down):
docker compose -f docker-compose-plane.yml up -d
bash scripts/status.sh
```

### Tests
```bash
bash scripts/test-pm-integration.sh http://localhost:3000   # 12
bash scripts/test-integrations.sh http://localhost:3000     # 6
bash scripts/test-github-poller.sh http://localhost:3000    # 8
bash scripts/test-agent-api.sh                              # 10
bash scripts/test-zapier-mcp.sh                             # 7
# Total 43
```

---

## 9. Two integration layers (do not confuse)

**Layer 1 — Direct (core):** GitHub poller/webhook, Slack service + Event Subscriptions, Plane pm-bridge. Real-time product path for tasks.

**Layer 2 — Zapier MCP (extension):** Agents call 9,000+ apps without custom OAuth. Slack already authenticated on free Zapier MCP plan. Does **not** replace Layer 1.

---

## 10. Plane CE — enough? / build our own?

**Enough for basic PM:** tasks, due dates, assignees, labels, statuses, sub-issues/checklists, comments, cycles, modules, Gantt.

**CE gaps:** no billing, no SSO, weak advanced analytics, community support, AGPL if forked, dual stack (Django).

**Recommendation:** Keep Plane as PM store now. Mid-term consider native PM for white-label. Differentiator James wants: **multi-agent + RAG per industry** (pgvector knowledge bases), not rebuilding Asana.

Full study: `docs/pm-platform-feasibility-study.md`

---

## 11. James open decisions

1. GitHub webhook admin access (Shubham) — specs already sent  
2. Approve merge `feature/jun25-agency-sprint` → `main`  
3. Stripe vs other billing  
4. Affiliate platform  
5. First 3 agency pilot clients  
6. Workflow wizard + per-step approvals (Jun 29)  
7. RAG / multi-agent industry knowledge (Jun 29)

---

## 12. Branch history

| Branch | Purpose |
|--------|---------|
| `main` | Stable MVP — **do not merge integrations until James says** |
| `feature/plane-pm-integration` | Plane bridge |
| `feature/platform-github-slack` | GitHub + Slack hub |
| `feature/github-poller` | EC2 poller |
| `feature/jun25-agency-sprint` | **ACTIVE** — skills, /v1, Zapier, workflows, badges |

---

## 13. Must-read docs (in order)

1. This handoff  
2. `README.md`  
3. `memory/25th_June.md` — latest done/pending  
4. `memory/24th_June.md` — James strategy, pricing, GTM, skills roadmap  
5. `docs/agent-api.md`  
6. `docs/zapier-mcp.md`  
7. `docs/plane-integration.md`  
8. `docs/github_poller.md` + `docs/github_webhooks.md`  
9. `docs/runbook.md` + `docs/ec2-security.md`  
10. `docs/user-guide.md`

---

## 14. First-week checklist for new owner

- [ ] Clone, checkout `feature/jun25-agency-sprint`, copy `.env.example` → `.env` (get secrets from Abhishek/ops — never from git)
- [ ] `docker compose up -d --build` + Plane compose
- [ ] Login UI with `changeme`, verify Dashboard shows 12 skills
- [ ] Run all 5 test scripts — expect 43/43
- [ ] `curl /v1/health`, `/api/mcp/status`, `/api/workflows`
- [ ] Read Jun 24 + Jun 25 memory files
- [ ] Confirm with James: merge to main? Stripe? pilots?
- [ ] Pick next sprint: N6 skills OR N10 wizard OR N11 RAG spike

---

## 15. Security notes

- Demo tokens are intentionally weak (`changeme`) — rotate before any real customers
- Ports 3000/3001/8083 open for demo; **do not** expose 5432/6379 publicly in production — see `docs/ec2-security.md`
- Zapier MCP token and GitHub/Slack secrets live only in `.env`

---

*Handoff prepared 13 July 2026. For day-to-day sprint truth prefer `memory/25th_June.md`; for product strategy prefer `memory/24th_June.md`.*
