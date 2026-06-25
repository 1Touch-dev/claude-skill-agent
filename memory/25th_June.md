# Enterprise Claude Skills Platform — June 25, 2026

**Last updated:** June 25, 2026  
**Current branch:** `feature/github-poller`  
**GitHub:** https://github.com/1Touch-dev/claude-skill-agent/tree/feature/github-poller  
**Status:** Platform live on EC2 · Integrations functional · Sprint focus: agency features (Zapier MCP, agent API, skills, workflows)  
**Builds on:** [24th_June.md](24th_June.md) — James strategic direction + full done/pending baseline

---

## Today's focus (25 Jun 2026) — COMPLETED

James confirmed agency market (AI marketing, design, SEO agencies) as primary GTM. All 6 sprint items delivered and deployed.

| # | Task | Status |
|---|------|--------|
| 1 | Zapier MCP integration — service + routes + docs | Done |
| 2 | Simple public agent API /v1 + docs + 10/10 tests | Done |
| 3 | 6 agency skills added (SEO, ad copy, email, landing, social, competitor) | Done |
| 4 | 3 workflow templates + /api/workflows run endpoint | Done |
| 5 | Tasks UI — GitHub PR + Slack thread badges | Done |
| 6 | Full regression: 6/6 + 12/12 + 8/8 + 10/10 + 6/6 all pass | Done |

---

## What is DONE (cumulative through 24 Jun 2026)

### Today 25 Jun (done in this sprint)
- 6 agency skills added: mkt_seo_content, mkt_ad_copy, mkt_email_sequence, mkt_landing_copy, mkt_social_post, mkt_competitor_report
- Public Agent API /v1 live (skills, tasks, route, run, status) — 10/10 tests pass
- Zapier MCP service + /api/mcp routes (status, tools, execute) — 6/6 tests pass, awaiting token
- 3 workflow templates: agency_client_onboarding, b2b_outbound_sequence, seo_content_pipeline
- Tasks UI: GitHub PR badge + Slack thread badge columns added
- All 5 regression suites pass (6+12+8+10+6 = 42 tests)
- Agent profiles, autonomy levels, skill assignments, orchestration stubs
- Routing engine (auto-pick agent by workspace + skill + autonomy + risk)
- Routing Demo, Executive Dashboard, approvals, audit logs, reports
- Bearer token auth + roles (admin/operator/viewer)
- Docker Compose on EC2, demo seed (Acme, Globex, 6 skills, 2 agents)

### Plane CE pm-bridge
- Plane CE self-hosted (:8083), pm-bridge REST + webhooks
- Task → Plane work item sync, workspace → Plane project sync
- Plane webhook → task status, Slack thread reply on status change
- Agent → Plane member mapping, Tasks UI with Plane badges
- 22/22 tasks synced, 12/12 E2E pass, webhook SQL fix

### GitHub + Slack integrations
- Live GitHub connector (PAT, testConnection, listPRs, createIssue)
- Live Slack connector (postMessage, postReply, task notifications)
- POST /webhooks/github|slack|plane — HMAC verify, event processing
- Slack Event Subscriptions (app_mention), Integrations page live tests
- DB migration 0011, scripts/test-integrations.sh 6/6 pass

### GitHub Poller (interim — no admin needed)
- EC2 poller live every 2 min, shared processGitHubEvent()
- Dedup (integration_events unique constraint), poller_cursors table (0012)
- scripts/test-github-poller.sh 8/8 pass
- docs/github_poller.md + docs/github_webhooks.md

### E2E + docs (verified 15–24 Jun)
- test-integrations.sh 6/6, test-pm-integration.sh 12/12, test-github-poller.sh 8/8
- Browser E2E 9/9 (Dashboard, Integrations, Routing Demo, Tasks, Agents)
- README.md, user-guide, runbook, integration docs updated

### James communications (24 Jun)
- Platform autonomy + agent routing explained
- 6/6 integration features done (~93%), GitHub webhook specs sent
- Zapier, MCP, multi-user/SaaS, workflows, skills breakdown answered
- Pricing packages (Agency Starter/Growth/Team/Enterprise) designed
- GTM, affiliate, B2B outreach plans delivered
- Agency market focus confirmed by James
- memory/24th_June.md created

---

## What is PENDING

### Today / this sprint (25 Jun onward)

| # | Item | Owner | Notes |
|---|------|-------|-------|
| T1 | Native GitHub repo webhook | James / Shubham | Payload: http://54.167.31.169:3000/webhooks/github · PRs + Issues · GITHUB_WEBHOOK_SECRET · disable SSL |
| T2 | Disable poller after webhook live | Abhi | GITHUB_POLL_ENABLED=false in .env |
| T3 | Merge feature/github-poller → main | James approval | Branch tested and ready |
| T4 | Add 20–30 new skills (agency-first) | Abhi | See skills roadmap in 24th_June.md |
| T5 | Zapier MCP integration | Abhi | 9,000+ apps via MCP; ~1 week |
| T6 | Simple public agent API + docs | Abhi | For Asana, Monday, marketplace use |
| T7 | 3 workflow templates | Abhi | Agency onboarding, B2B outbound, SEO pipeline |
| T8 | Asana + Monday live connectors | Abhi | Same pattern as GitHub/Slack |
| T9 | Skill marketplace UI (ratings, usage) | Abhi | Phase 5 |
| T10 | Tasks UI GitHub PR + Slack badges | Abhi | Data in DB, UI missing |

### Phase 2 (medium term)

| # | Item |
|---|------|
| P2-1 | Worker queues (BullMQ) — fully autonomous skill execution |
| P2-2 | Pricing packages wired to Stripe |
| P2-3 | Affiliate program (PartnerStack or Rewardful) |
| P2-4 | Self-improving skill eval loops |
| P2-5 | Skill ranking + marketplace ratings |
| P2-6 | Inbound Slack bot commands |
| P2-7 | White-label for agencies |
| P2-8 | Multi-workspace self-serve onboarding |

### Deferred / P3

| # | Item |
|---|------|
| D1 | HTTPS + custom domain |
| D2 | SSO / SAML / OIDC |
| D3 | OAuth (GitHub App, Slack OAuth) |
| D4 | RAG / document ingestion |
| D5 | End-user copilot/chat app |
| D6 | Fine-grained RBAC |
| D7 | Remove postgres/redis host port bindings |
| D8 | Plane DB + MinIO backup rotation |
| D9 | Plane Commercial (not pursuing per James) |

---

## Platform snapshot (25 Jun 2026)

| Service | URL | Status |
|---------|-----|--------|
| Admin UI | http://54.167.31.169:3001 | Live |
| API + Webhooks | http://54.167.31.169:3000 | Live |
| Plane CE | http://54.167.31.169:8083 | Live |
| GitHub Poller | EC2 background | Running every 2 min |

| Data | Count |
|------|-------|
| Skills | 6 |
| Department suites | 6 |
| Industry overlays | 5 |
| Tasks | 22 (22/22 synced to Plane) |
| Integrations | 4/4 connected |
| Agents | 2 (Globex, Acme) |
| Subscription plans in DB | 0 (schema ready, not seeded) |

---

## Skills — current vs target

### Live today (6)
| Key | Name | Department |
|-----|------|------------|
| mkt_campaign_brief | Campaign Brief Generator | Marketing |
| eng_pr_summary | PR Summary Bot | Engineering |
| prod_spec_outline | Spec Outline Assistant | Product |
| grc_policy_check | Policy Checker | Security/GRC |
| ops_runbook | Runbook Draft | Operations |
| cs_response_helper | CS Response Helper | Customer Success |

### First batch to add (25 Jun target — agency focus)
- SEO content writer
- Ad copy generator (Google, Meta, LinkedIn)
- Email sequence builder
- Landing page copy generator
- Social media post writer
- Competitor analysis report

Full 40+ roadmap: see [24th_June.md](24th_June.md#skills-roadmap-james-requested--24-jun)

---

## Pricing packages (designed 24 Jun — not wired yet)

| Tier | Price | Skills | Workspaces | Runs/mo |
|------|-------|--------|------------|---------|
| Agency Starter | $99 | 5 | 1 | 500 |
| Agency Growth | $249 | 15 | 3 | 3,000 |
| Agency Team | $599 | All | 10 | Unlimited (fair use) |
| Enterprise | Custom | All | Unlimited | Unlimited |

DB tables ready: subscription_plans, credit_pools, usage_charges, license_entitlements

---

## James action items (unchanged)

| # | Action |
|---|--------|
| J1 | Repo admin — register GitHub webhook (or Shubham; specs sent) |
| J2 | Approve merge feature/github-poller → main |
| J3 | Confirm agency GTM Phase 1 |
| J4 | Decide Stripe / billing platform |
| J5 | Decide affiliate platform (PartnerStack vs Rewardful) |

---

## Architecture (25 Jun)

```
Admin UI (:3001) → Platform API (:3000)
    ├── Routing engine → agents, skill runs
    ├── pm-bridge → Plane CE (:8083)
    ├── GitHub service + Poller (2 min)
    ├── Slack service
    ├── /webhooks/plane|github|slack
    └── [PLANNED TODAY] Zapier MCP + public agent API

Zapier MCP → [building] → Asana, Monday, HubSpot, Gmail, etc.
```

---

## Sprint log

| Date | Action | Status |
|------|--------|--------|
| Jun 24 | 24th_June.md — full done/pending + James strategy | Done |
| Jun 25 | 25th_June.md created, sprint kickoff | In progress |
| Jun 25 | Zapier MCP integration | Planned |
| Jun 25 | Simple public agent API + docs | Planned |
| Jun 25 | First agency skill batch (4–6 skills) | Planned |
| Jun 25 | Workflow template drafts | Planned |

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [24th_June.md](24th_June.md) | Full baseline — GTM, pricing, affiliate, skills roadmap, research |
| [15th_June.md](15th_June.md) | GitHub poller implementation |
| [12th_June.md](12th_June.md) | GitHub + Slack MVP |
| [README.md](../README.md) | Project overview |
