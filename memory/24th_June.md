# Enterprise Claude Skills Platform — June 24, 2026

**Last updated:** June 24, 2026  
**Current branch:** `feature/github-poller`  
**GitHub:** https://github.com/1Touch-dev/claude-skill-agent/tree/feature/github-poller  
**Status:** Platform live on EC2 · All integrations functional · Major strategic direction confirmed by James

---

## Today's key discussions with James (24 Jun 2026)

### 1. Platform autonomy & agent routing
James asked: "Is this fully autonomous? What agent is picked?"

**Answer given:**
- Platform is **semi-autonomous** today. Route & Apply picks the agent automatically (by workspace, skill, autonomy level, risk tier), creates the orchestration record, syncs to Plane, and posts to Slack — all without manual steps after clicking Route & Apply.
- Full hands-off execution (agent runs Claude skills in the background without any human click) is **Phase 2** — requires worker queues.
- On demo workspace, skill `mkt_campaign_brief` routes to **Globex Agent** (autonomy level 3, pooled). Acme workspace gets **Acme Agent**.

---

### 2. New features James asked for

James raised the following new capabilities (24 Jun):

| # | Request | Priority |
|---|---------|----------|
| A | Zapier integration | High |
| B | MCP workflow scripts | High |
| C | Simple agent API for marketplaces (Asana, Monday, etc.) | High |
| D | Multi-user + SaaS functionality confirmation | Confirmed existing |
| E | Automated workflows for agencies, B2B call centres, etc. | High |
| F | Break down all skills, build pricing packages + team bundles | High |
| G | Add more skills, advanced ones with integrations + limits | High |
| H | Skill marketplace with ranking (stars, usage, test logs) | Medium |
| I | Loops to improve skills (self-improving AI) | Medium |
| J | Go-to-market strategy | Strategic |
| K | Growth strategies | Strategic |
| L | Affiliate marketing program | Strategic |
| M | B2B outreach plan | Strategic |
| N | Agency-focused product (AI agency, marketing, design, SEO) | Strategic — confirmed focus |

---

### 3. Market focus confirmed

**James confirmed focus on agencies as primary market:**
> "Amazing! This sounds great we can even just focus on this, I think agency, AI agency, marketing design agency, SEO agency, teams are something we can sell with a big market"

Market facts (researched 24 Jun):
- Global marketing agency market: **$473 billion in 2026**
- "AI agency" search volume grew **60x since 2023**
- 89% of top agencies use AI with up to **49% productivity gains**
- Agencies growing 43% faster when specialised vs generalist
- Standard agency retainer: $2,000–$10,000/month per client
- AI automation agency: $5,000–$25,000/month per client

---

## Full DONE list (cumulative — all sprints)

### Core platform (May–June 2026)

| Item | Status | Sprint |
|------|--------|--------|
| Multi-tenant admin control plane UI | ✅ | Jun 3 |
| Skills registry, packages, suites, overlays | ✅ | Jun 3 |
| Customers, workspaces, entitlements, credit pools | ✅ | Jun 3 |
| Agent profiles, autonomy levels, skill assignments | ✅ | Jun 3 |
| Skill runs, orchestration stubs | ✅ | Jun 3 |
| Approvals (approve/reject) + audit logs | ✅ | Jun 3 |
| Reports (credits, adoption, billing, governance) | ✅ | Jun 3 |
| Routing engine (auto-pick agent by skill + workspace) | ✅ | Jun 3 |
| Routing Demo (create task → route → apply) | ✅ | Jun 3 |
| Executive Dashboard (live metrics from API) | ✅ | Jun 3 |
| Bearer token auth + role-based access (admin/operator/viewer) | ✅ | Jun 3 |
| Docker Compose deployment on EC2 | ✅ | Jun 3 |
| Demo seed data (Acme Corp, Globex Inc, 6 skills, 2 agents) | ✅ | Jun 3 |

### Plane CE pm-bridge (June 10–11, 2026)

| Item | Status |
|------|--------|
| Plane CE self-hosted on EC2 (:8083) | ✅ |
| pm-bridge REST client (create project, work item, update state) | ✅ |
| Task → Plane work item sync (auto on Route & Apply) | ✅ |
| Workspace → Plane project sync | ✅ |
| Plane webhook → task_intake status update | ✅ |
| Plane status change → Slack thread reply | ✅ |
| Agent → Plane member mapping | ✅ |
| Tasks UI with ✈ Plane badges | ✅ |
| 22/22 tasks synced to Plane | ✅ |
| E2E test suite — 12/12 pass (`test-pm-integration.sh`) | ✅ |
| Plane webhook SQL fix (ORDER BY in UPDATE → subquery) | ✅ |

### GitHub + Slack integrations (June 12, 2026)

| Item | Status |
|------|--------|
| Live GitHub connector (PAT, testConnection, listPRs, createIssue) | ✅ |
| Live Slack connector (postMessage, postReply, buildTaskRoutedMessage) | ✅ |
| Integrations page — GitHub + Slack show `mode: live` | ✅ |
| Slack notify on Route & Apply | ✅ |
| Slack thread reply on Plane status change | ✅ |
| Slack thread reply on GitHub PR/issue event | ✅ |
| POST /webhooks/github — HMAC verify, PR/issue → task + Plane + Slack | ✅ |
| POST /webhooks/slack — URL verification + event log | ✅ |
| POST /webhooks/plane — issue sync + Slack notify | ✅ |
| Slack Event Subscriptions — app_mention subscribed + verified | ✅ |
| DB migration 0011 — github/slack columns on task_intake + integration_events | ✅ |
| .env.example updated with GITHUB_* and SLACK_* vars | ✅ |
| scripts/test-integrations.sh — 6/6 pass | ✅ |

### GitHub Poller (June 15, 2026)

| Item | Status |
|------|--------|
| EC2 GitHub Poller live — polls PRs + issues every 2 min | ✅ |
| Refactored processGitHubEvent() — shared by webhook + poller | ✅ |
| Dedup via ON CONFLICT (provider, external_id) DO NOTHING | ✅ |
| poller_cursors table (migration 0012) | ✅ |
| GITHUB_POLL_ENABLED + GITHUB_POLL_INTERVAL_SEC env vars | ✅ |
| scripts/test-github-poller.sh — 8/8 pass | ✅ |
| docs/github_poller.md — ops reference | ✅ |
| docs/github_webhooks.md — canonical webhook reference + return path | ✅ |
| listPullRequests() + listIssues() added to GitHub service | ✅ |
| Poller boot on server start (index.js) | ✅ |

### Live E2E test results (15 Jun 2026)

| Test suite | Result |
|------------|--------|
| scripts/test-integrations.sh | ✅ 6/6 PASS |
| scripts/test-pm-integration.sh | ✅ 12/12 PASS |
| scripts/test-github-poller.sh | ✅ 8/8 PASS |
| Browser E2E (Dashboard, Integrations, Routing Demo, Tasks, Agents) | ✅ 9/9 PASS |

### Documentation (cumulative)

| Document | Status |
|----------|--------|
| README.md — fully updated with done/pending/branch | ✅ Jun 24 |
| docs/github_poller.md | ✅ |
| docs/github_webhooks.md | ✅ |
| docs/integration-github.md | ✅ |
| docs/integration-slack.md | ✅ |
| docs/plane-integration.md | ✅ |
| docs/user-guide.md | ✅ |
| docs/runbook.md | ✅ |
| docs/mvp-known-limitations.md | ✅ |
| memory/15th_June.md | ✅ |
| memory/12th_June.md | ✅ |

### James communications (Jun 24 2026)

| Item | Status |
|------|--------|
| Status reply to James — 6/6 features done, 93% | ✅ |
| GitHub webhook specs sent to James for Shubham | ✅ |
| Platform autonomy + agent routing explanation | ✅ |
| Zapier, MCP, multi-user, SaaS, workflow capabilities answered | ✅ |
| Full skill breakdown + pricing packages designed | ✅ |
| Go-to-market strategy for agency market delivered | ✅ |
| Affiliate + B2B outreach plan delivered | ✅ |
| This 24th_June.md file created | ✅ |

---

## Current platform state snapshot (24 Jun 2026)

| Service | URL | Status |
|---------|-----|--------|
| Admin UI | http://54.167.31.169:3001 | ✅ Live |
| API + Webhooks | http://54.167.31.169:3000 | ✅ Live |
| Plane CE | http://54.167.31.169:8083 | ✅ Live |
| GitHub Poller | EC2 background job | ✅ Running every 2 min |

| Data | Count |
|------|-------|
| Skills | 6 |
| Department suites | 6 |
| Industry overlays | 5 |
| Tasks | 22 (22/22 synced to Plane) |
| Integrations connected | 4/4 |
| Agents | 2 (Globex Agent, Acme Agent) |

---

## PENDING — Technical / Product

### Immediate (next sprint)

| # | Item | Owner | Notes |
|---|------|-------|-------|
| T1 | Native GitHub repo webhook | James / Shubham (repo admin) | Payload URL: http://54.167.31.169:3000/webhooks/github · Events: PRs + Issues · Secret: GITHUB_WEBHOOK_SECRET from .env · Disable SSL (HTTP) · 5 min setup |
| T2 | After webhook registered: set GITHUB_POLL_ENABLED=false | Abhi | One line in .env, restart backend |
| T3 | Merge feature/github-poller → main | James approval | Branch fully ready and tested |
| T4 | Add 20–30 new skills (see skills roadmap below) | Abhi | Platform structure already supports it |
| T5 | Zapier MCP integration | Abhi | Unlocks 9,000+ app connections instantly; ~1 week |
| T6 | Simple public agent API endpoint | Abhi | For marketplaces — documented REST endpoint |
| T7 | 3 workflow templates (agency, B2B outbound, SEO pipeline) | Abhi | Pre-built in platform |
| T8 | Asana + Monday live connectors | Abhi | Same pattern as GitHub/Slack service |
| T9 | Skill marketplace UI (categories, ratings, usage stats) | Abhi | Phase 5 UI |
| T10 | Tasks UI — GitHub PR + Slack thread badges | Abhi | Data in DB, UI not shown yet |

### Medium term (Phase 2)

| # | Item | Notes |
|---|------|-------|
| P2-1 | Worker queues (BullMQ/Redis) — fully autonomous skill execution | No human click needed to run skills |
| P2-2 | Pricing packages wired to Stripe | subscription_plans, credit_pools, usage_charges tables ready in DB |
| P2-3 | Affiliate program (PartnerStack or Rewardful) | 25–30% recurring commission, 60-day attribution |
| P2-4 | Self-improving skill eval loops | Nightly eval harness, learnings.md per skill, auto-improvement |
| P2-5 | Skill ranking + marketplace ratings | trust_score, skill_runs, audit_logs, scan_results already in DB |
| P2-6 | Inbound Slack bot commands | Events logged only today |
| P2-7 | White-label option for agencies | Brand platform as their own tool |
| P2-8 | Multi-workspace onboarding flow | Self-serve signup for agencies |

### Deferred / P3

| # | Item | Notes |
|---|------|-------|
| D1 | HTTPS + custom domain | HTTP on EC2 today |
| D2 | SSO / SAML / OIDC | Bearer token today |
| D3 | OAuth (GitHub App, Slack OAuth) | PAT + bot token OK for MVP |
| D4 | RAG / document ingestion | Future AI product depth |
| D5 | End-user copilot/chat app | Admin UI only today |
| D6 | Fine-grained RBAC policy matrix | Role header only today |
| D7 | Remove postgres/redis host port bindings from docker-compose | Security hardening |
| D8 | Plane DB + MinIO backup rotation | Ops hygiene |
| D9 | Plane Commercial (native integrations) | Not needed per James decision |

---

## Skills roadmap (James requested — 24 Jun)

### Existing skills (6)

| Key | Name | Department |
|-----|------|------------|
| mkt_campaign_brief | Campaign Brief Generator | Marketing |
| eng_pr_summary | PR Summary Bot | Engineering |
| prod_spec_outline | Spec Outline Assistant | Product |
| grc_policy_check | Policy Checker | Security/GRC |
| ops_runbook | Runbook Draft | Operations |
| cs_response_helper | CS Response Helper | Customer Success |

### Skills to add (40+)

**Marketing (agency-focused):**
- SEO content writer
- Ad copy generator (Google, Meta, LinkedIn)
- Email sequence builder (cold outreach, nurture)
- Social media post scheduler/writer
- Competitor analysis report
- Lead scoring model
- GEO (generative engine optimisation) content writer
- Landing page copy generator

**Sales / B2B Outreach:**
- Personalised outreach email writer
- Sales proposal generator
- Deal summary / CRM notes writer
- Follow-up sequence builder
- LinkedIn connection message writer
- Cold call script generator

**Customer Success / Call Centre:**
- Ticket triage and routing classifier
- Escalation handler
- FAQ auto-responder
- Sentiment classifier
- Churn risk detector
- Customer onboarding guide generator

**Engineering:**
- Code review assistant
- Incident report writer
- Sprint planning helper
- Release notes generator
- API documentation writer

**Operations:**
- SOP (standard operating procedure) generator
- Vendor comparison report
- Contract summariser
- Meeting notes → action items extractor
- Project status report writer

**HR / Talent:**
- Job description writer
- CV / resume screener
- Onboarding checklist generator
- Performance review drafter

**Finance / GRC:**
- Invoice extractor
- Expense classifier
- Compliance checker
- Risk report generator
- Audit trail summariser

---

## Pricing packages designed (24 Jun 2026)

Based on 2026 hybrid SaaS pricing research (flat base + usage credits):

| Tier | Price | Skills | Workspaces | Runs/month | Integrations | Target |
|------|-------|--------|------------|------------|--------------|--------|
| Agency Starter | $99/mo | 5 | 1 | 500 | Slack + GitHub + Zapier | Solo operators |
| Agency Growth | $249/mo | 15 | 3 | 3,000 | All integrations | 2–5 person teams |
| Agency Team | $599/mo | All | 10 | Unlimited (fair use) | All + white-label | Established agencies |
| Enterprise | Custom | All | Unlimited | Unlimited | Custom | Large orgs / resellers |
| White-label add-on | +$200/mo | — | — | — | — | Agencies reselling |

**Credit overage:** $0.01 per skill run above plan limit  
**Credit packs:** $50 for 5,000 runs (pre-purchase)  
**Infrastructure:** subscription_plans, credit_pools, usage_charges, license_entitlements tables already exist in DB

---

## Go-to-market plan (James confirmed — agency focus)

### Phase 1 — Land with agencies (months 1–3)

- Pick vertical: AI marketing agencies (lowest barrier, highest demand in 2026)
- Offer free pilot: set up Campaign Brief + SEO + CS skills for agency, connect to their Slack + Asana via Zapier MCP, show workflow live
- One pilot → case study → 5 more clients
- Target: 5 paying clients at $249/month = $1,245 MRR in month 1

### Phase 2 — Productize (months 3–6)

- Build 3 workflow templates: (1) Agency new client onboarding, (2) B2B outbound sequence, (3) SEO content pipeline
- Landing page + pricing page live
- Demo video (5-min Loom)
- Target: 20 clients = ~$5,000 MRR

### Phase 3 — Scale via affiliate + outreach (months 6–12)

- Affiliate program (PartnerStack or Rewardful): 25–30% recurring, 12 months, 60-day attribution
- B2B outreach: 200 targeted agencies/month via Apollo/Clay
- Target: 100+ clients = $25,000–$60,000 MRR

---

## Affiliate marketing plan (24 Jun 2026)

Based on research (B2B SaaS 2026 best practices):

- **Commission:** 25–30% recurring for 12 months (industry standard for AI SaaS)
- **Attribution window:** 60–90 days (B2B sales cycles are longer)
- **Platform:** PartnerStack (115,000+ B2B partners) or Rewardful (simpler, built for SaaS)
- **Target affiliates:** Niche newsletters for agency owners, AI tools YouTubers, agency community owners, RevOps bloggers, SEO consultants
- **For white-label partners:** flat bounty $200–$500 per onboarded client
- **Fraud prevention:** velocity checks, IP fingerprinting, Stripe webhook sync for commission on actual billing

---

## B2B outreach plan (24 Jun 2026)

- Build list of 200 AI agencies, SEO agencies, marketing agencies (2–15 employees) via Apollo or Clay
- Personalised, problem-first messages (not generic cold email)
- Follow-up with Loom video demo specific to their use case
- 14-day free trial with white-glove setup offer
- Target funnel: 200 outreach → 40 replies → 15 demos → 5 paying customers in 30 days

---

## Zapier MCP — research findings (24 Jun)

Zapier MCP is live and production-ready in 2026:
- Connects Claude and any AI agent to **9,000+ apps** and **30,000+ actions**
- No code required to set up
- Works with Claude, ChatGPT, Cursor and any MCP-compatible client
- Action-level permissions, centralised auth, audit logging
- Each MCP tool call uses 2 Zapier tasks from plan
- **Integration plan:** Add Zapier MCP server to our platform agent routing; agents can then take actions in Asana, Monday, Gmail, Salesforce, HubSpot, Google Sheets, etc. immediately

---

## Self-improving skills — research findings (24 Jun)

State-of-art approach (MindStudio / Claude Code, 2026):
1. **Eval harness** — binary pass/fail test cases per skill
2. **Diagnostic layer** — Claude analyses failures, identifies root cause
3. **Learnings store** — persistent `learnings.md` per skill, updated after each run
4. **Loop** — runs nightly, improves skill instructions autonomously, iteration cap for safety
5. **Version control** — skill changes committed to git for rollback

Implementation path for our platform:
- Each skill gets an `evals/` folder with `eval.json` test cases
- Nightly background job runs evals, scores pass rate, calls Claude to rewrite skill instructions if below threshold
- Learnings stored in DB per skill (we have `scan_results` + `metadata` JSONB already)
- Skills improve from real usage without model retraining

---

## Architecture (current — 24 Jun 2026)

```
Admin UI (:3001)
    │
    ▼
Platform API (:3000)
    ├── Skills, Suites, Overlays, Agents, Entitlements, Credits
    ├── Routing engine (auto-pick agent → task → run)
    ├── pm-bridge ──────────────────────────────▶ Plane CE (:8083)
    ├── GitHub service (PAT outbound + poller inbound)
    ├── Slack service (postMessage, thread replies)
    ├── POST /webhooks/plane|github|slack
    └── Background: GitHub Poller (every 2 min)

GitHub ─(webhook pending admin)──▶ /webhooks/github
       ─(poller active)──────────▶ processGitHubEvent()

Slack ──(Event Subscriptions)───▶ /webhooks/slack
      ◀─(notifications)──────────── Slack service

Zapier MCP ─(planned)───────────▶ Agent tool calls
```

---

## What James needs to do (action items for James)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| J1 | Grant repo admin on `1Touch-dev/claude-skill-agent` to register webhook (or have Shubham do it — specs already sent) | 5 min | GitHub becomes instant instead of 2-min polling |
| J2 | Approve merge of `feature/github-poller` → `main` | 1 min | Platform on stable branch |
| J3 | Confirm agency market focus + approve go-to-market Phase 1 | Strategic call | Unlocks pilot outreach |
| J4 | Decide on Stripe / billing platform for pricing packages | 1 conversation | Unlocks monetisation |
| J5 | Decide on affiliate platform (PartnerStack vs Rewardful) | 1 conversation | Unlocks affiliate channel |

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [memory/15th_June.md](15th_June.md) | Jun 15 — GitHub poller, E2E, James approval |
| [memory/12th_June.md](12th_June.md) | Jun 12 — GitHub + Slack MVP sprint |
| [memory/11th_June.md](11th_June.md) | Jun 11 — Plane CE operationalization |
| [docs/github_poller.md](../docs/github_poller.md) | Poller ops reference |
| [docs/github_webhooks.md](../docs/github_webhooks.md) | Native webhook — return path |
| [README.md](../README.md) | Full project overview (updated Jun 24) |

---

## Sprint log

| Date | Action | Status |
|------|--------|--------|
| Jun 12 | GitHub + Slack MVP live | ✅ |
| Jun 12 | Slack Event Subscriptions | ✅ |
| Jun 12 | James: "We would do it with our architecture" | ✅ |
| Jun 15 | EC2 GitHub Poller live, 8/8 E2E pass | ✅ |
| Jun 15 | docs/github_poller.md + github_webhooks.md | ✅ |
| Jun 15 | Branch feature/github-poller pushed to GitHub | ✅ |
| Jun 17 | Status update sent to James (6/6 features, 90–93%) | ✅ |
| Jun 17 | GitHub webhook specs sent to James for Shubham | ✅ |
| Jun 24 | Full README.md updated (done/pending) | ✅ |
| Jun 24 | Answered James: autonomy, Zapier, MCP, skills, pricing, GTM | ✅ |
| Jun 24 | Agency market focus confirmed by James | ✅ |
| Jun 24 | 24th_June.md created (this file) | ✅ |
| Next | Add 20–30 skills + Zapier MCP + workflow templates | 🔜 |
| Next | Landing page + pricing page | 🔜 |
| Next | Affiliate program setup | 🔜 |
