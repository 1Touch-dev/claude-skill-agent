# Enterprise Claude Skills Platform — June 12, 2026

**Last updated:** June 12, 2026 (evening)  
**Current branch:** `feature/platform-github-slack` (from `feature/plane-pm-integration`)  
**GitHub:** https://github.com/1Touch-dev/claude-skill-agent  
**Status:** ✅ **GitHub + Slack MVP implemented and live-demo tested** — GitHub repo webhook pending admin only

---

## Strategic decision (June 12)

| Decision | Choice |
|----------|--------|
| PM layer | **Stay on Plane CE** (free, already working) |
| GitHub + Slack | **Build in our platform** — not Plane Commercial (~$6/seat/mo) |
| Architecture | **Platform = hub** — GitHub/Slack ↔ platform ↔ Plane CE via pm-bridge |
| Merge to `main` | **Still blocked** until James explicitly approves |
| **Architecture (Jun 12 PM)** | ✅ James: *“We would do it with our architecture”* — see [15th_June.md](15th_June.md) |

**Why:** Plane CE reports `edition: PLANE_COMMUNITY`, `is_github_enabled: false`, `slack_client_id: null`. Native GitHub/Slack require Plane Commercial + Silo. Our pm-bridge already syncs tasks ↔ Plane work items; we extended the same pattern for GitHub and Slack in the platform.

---

## What is DONE (June 12 sprint)

| Item | Status |
|------|--------|
| Branch `feature/platform-github-slack` created and pushed | ✅ |
| DB migration `0011_github_slack_links.sql` — task GitHub/Slack columns + `integration_events` | ✅ |
| Live GitHub connector (`backend/src/services/github/`) | ✅ |
| Live Slack connector (`backend/src/services/slack/`) | ✅ |
| `connectors.js` — real `testGitHub` / `testSlack` (mode: `live`) | ✅ |
| `POST /webhooks/github` — HMAC verify, PR/issue → task + Plane + Slack | ✅ |
| `POST /webhooks/slack` — URL verification + event log | ✅ |
| Slack notify on `POST /api/route/apply` | ✅ |
| Slack thread reply on Plane `issue.updated` webhook | ✅ |
| Slack notify on GitHub PR status change | ✅ |
| Plane webhook SQL bug fix (`ORDER BY` in UPDATE → subquery) | ✅ tested on EC2 |
| `.env.example` — `GITHUB_*`, `SLACK_*` vars | ✅ |
| `scripts/test-integrations.sh` | ✅ |
| Live demo E2E (route → Slack + Plane; simulated GitHub PR; Plane webhook) | ✅ |
| Credentials on EC2: `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`, `SLACK_*` | ✅ |

### Carried forward from Jun 11 (still valid)

| Item | Status |
|------|--------|
| Plane CE pm-bridge (REST + webhooks, 12/12 tests) | ✅ |
| PM Status UI (`/tasks`, badges, Routing Demo) | ✅ |
| Agent → Plane member mapping (P1-8) | ✅ |
| Webhook IP allowlist (P1-9) | ✅ |
| EC2 security audit + SG fixes (P1-10) | ✅ |
| E2E regression B01–B22 (Jun 11) | ✅ |
| Startup scripts + `docs/runbook.md` | ✅ |

---

## What is NOT done / blocked

| Item | Status | Blocker |
|------|--------|---------|
| **GitHub repo webhook registration** | ⏳ pending | Repo **admin** required — `Abhishek9302` has push only (`admin: false`) |
| ~~Slack Event Subscriptions URL~~ | ✅ **done** | Events ON, URL verified, `app_mention` subscribed, app reinstalled |
| Tasks UI: GitHub/Slack link badges | ❌ deferred | Phase 5 |
| Central `integration-sync` orchestrator module | ❌ deferred | Logic inline in `webhooks.js` + `routing.js` for MVP |
| OAuth flows (GitHub App / Slack OAuth) | ❌ deferred | PAT + bot token MVP sufficient |
| Integrations UI “live vs mock” badge | ❌ deferred | API returns `mode: live` in test response |
| Merge `feature/platform-github-slack` → `main` | ❌ blocked | James approval |

---

## P1 task re-scope (James priorities #2 and #3)

| Old # | Old scope | New scope | Status |
|-------|-----------|-----------|--------|
| P1-6 | Plane GitHub in Plane Settings | **Platform GitHub connector** + sync to tasks/Plane | ✅ **MVP done** — repo webhook pending admin |
| P1-7 | Plane Slack in Plane Settings | **Platform Slack connector** + notifications | ✅ **done** — outbound + Event Subscriptions enabled |

---

## Live architecture (implemented)

```
                    ┌──────────────────────────────────────────┐
                    │   Platform (:3000 API, :3001 UI)         │
                    │                                          │
  GitHub ─webhook─▶ │  POST /webhooks/github                   │
  Slack  ─events─▶  │  POST /webhooks/slack                   │
  Plane  ─webhook─▶ │  POST /webhooks/plane                   │
                    │                                          │
                    │  task_intake (source of truth)           │
                    │    ├── pm-bridge ──────────────────┐     │
                    │    ├── services/github             │     │
                    │    └── services/slack              │     │
                    └────────────────────────────────────┼─────┘
                                                         │
                                                         ▼ REST + webhooks
                                                  Plane CE (:8083)
```

**Source of truth:** `task_intake` in platform Postgres.  
**Plane CE:** human PM board. **GitHub:** PR/issue events. **Slack:** team notifications.

---

## Environment variables (EC2 — configured)

| Variable | Status | Purpose |
|----------|--------|---------|
| `GITHUB_TOKEN` | ✅ set | Live API test, future issue create |
| `GITHUB_DEFAULT_REPO` | ✅ `1Touch-dev/claude-skill-agent` | Default repo |
| `GITHUB_WEBHOOK_SECRET` | ✅ set | Verify `X-Hub-Signature-256` |
| `SLACK_BOT_TOKEN` | ✅ set | Post messages (`xoxb-...`) |
| `SLACK_SIGNING_SECRET` | ✅ set | Verify Slack Events API |
| `SLACK_DEFAULT_CHANNEL` | ✅ set | `#server-alerts` channel ID |

See `.env.example` for template. **Never commit `.env`.**

---

## Webhook URLs (EC2)

| Provider | URL | Registered? |
|----------|-----|-------------|
| Plane | `http://54.167.31.169:3000/webhooks/plane` | ✅ |
| GitHub | `http://54.167.31.169:3000/webhooks/github` | ⏳ **James / repo admin** |
| Slack | `http://54.167.31.169:3000/webhooks/slack` | ✅ **Event Subscriptions** (`app_mention`) |

---

## Success criteria (June 12)

| # | Criterion | Result |
|---|-----------|--------|
| S1 | Slack “Test connection” → real API (`mode: live`) | ✅ |
| S2 | GitHub “Test connection” → real API (`mode: live`) | ✅ |
| S3 | Route task → Slack notification with Plane link | ✅ live demo |
| S4 | GitHub PR webhook → task status → Plane state | ✅ simulated curl |
| S5 | Plane status change → Slack thread reply | ✅ live demo |
| S6 | `scripts/test-integrations.sh` on EC2 | ✅ |
| S7 | `test-pm-integration.sh` 12/12 regression | ✅ (after plane webhook fix) |
| S8 | GitHub repo webhook delivers real events | ⏳ blocked on admin |
| S9 | Slack Event Subscriptions verified | ✅ |

---

## Live demo results (June 12)

| Step | Result |
|------|--------|
| Create + route task #16 / #18 | Plane work item + Slack message in `#server-alerts` |
| Simulated GitHub PR opened (`task-16`) | Task → `running`, GitHub PR fields set |
| Simulated GitHub PR merged | Task → `completed` |
| Plane `issue.updated` webhook | Task status sync + Slack reply (after SQL fix) |
| Plane webhook crash (`ORDER BY` in UPDATE) | **Fixed** — subquery pattern |

---

## Pending actions (who does what)

### James / repo admin — GitHub webhook

1. Open https://github.com/1Touch-dev/claude-skill-agent/settings/hooks  
2. **Add webhook** — Payload URL `http://54.167.31.169:3000/webhooks/github`  
3. Secret = same as `GITHUB_WEBHOOK_SECRET` in server `.env`  
4. Events: **Pull requests** + **Issues**  
5. SSL verification: **Disable** (HTTP endpoint)

Full steps: [docs/integration-github.md](../docs/integration-github.md)

### ~~Abhi / ops — Slack Event Subscriptions~~ ✅ Done Jun 12 PM

- Events **On**, Request URL verified, `app_mention` subscribed, app reinstalled on Kyma workspace  
- **Save Changes** stays greyed out when there are no pending edits — that means already saved  
- Reference: [docs/integration-slack.md](../docs/integration-slack.md)

---

## P2 — deferred

| # | Task |
|---|------|
| 11 | HTTPS / domain (OAuth + Slack Events production hardening) |
| 12 | Plane DB + MinIO backup rotation |
| 13 | Merge branches → `main` (James approval) |
| 14 | Plane Commercial (only if native Plane integrations wanted later) |
| ~~15~~ | ~~Fix `plane_webhook_events.task_id` SQL bug~~ | ✅ **Done Jun 12** |
| 16 | Remove postgres/redis host port bindings in docker-compose |
| 17 | Tasks UI GitHub/Slack badges |
| 18 | `integration-sync` central orchestrator |

---

## Live URLs

| Service | URL |
|---------|-----|
| Platform admin UI | http://54.167.31.169:3001 |
| Platform API | http://54.167.31.169:3000 |
| Plane PM UI | http://54.167.31.169:8083 |
| GitHub repo | https://github.com/1Touch-dev/claude-skill-agent |
| Slack app (Globex Platform) | https://api.slack.com/apps/A0B9XTZS33M |

---

## Related docs

- [15th_June.md](15th_June.md) — James approval + E2E verification (Jun 15)  
- [11th_June.md](11th_June.md) — Plane operationalization complete  
- [docs/integration-github.md](../docs/integration-github.md) — GitHub setup + sync flow  
- [docs/integration-slack.md](../docs/integration-slack.md) — Slack setup + notifications  
- [docs/plane-integration.md](../docs/plane-integration.md) — pm-bridge reference  
- [docs/runbook.md](../docs/runbook.md) — ops including integrations  
- [docs/mvp-known-limitations.md](../docs/mvp-known-limitations.md) — honest boundaries  

---

## Sprint log

| Date | Action | Status |
|------|--------|--------|
| Jun 12 AM | Decision: stay Plane CE, build GitHub/Slack in platform | ✅ |
| Jun 12 AM | Created plan (`12th_June.md`) | ✅ |
| Jun 12 PM | Branch `feature/platform-github-slack` + full MVP implementation | ✅ |
| Jun 12 PM | Live demo + plane webhook SQL fix | ✅ |
| Jun 12 PM | `GITHUB_WEBHOOK_SECRET` in `.env`, backend restarted | ✅ |
| Jun 12 PM | GitHub repo webhook registration | ⏳ blocked — needs repo admin |
| Jun 12 PM | Slack Event Subscriptions + app reinstall | ✅ |
| Jun 12 PM | Documentation sweep (this file + docs/*) | ✅ |
| Jun 12 PM | Commit + push `feature/platform-github-slack` | ✅ |
