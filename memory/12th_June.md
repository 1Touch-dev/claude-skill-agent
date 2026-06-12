# Enterprise Claude Skills Platform — June 12, 2026

**Last updated:** June 12, 2026  
**Current branch:** `feature/plane-pm-integration` (stable, all P0/P1 complete except integrations)  
**New work branch:** `feature/platform-github-slack` (to be created from `feature/plane-pm-integration`)  
**GitHub:** https://github.com/1Touch-dev/claude-skill-agent  
**Status:** 📋 **Planning complete — integrations sprint not started**

---

## Strategic decision (June 12)

| Decision | Choice |
|----------|--------|
| PM layer | **Stay on Plane CE** (free, already working) |
| GitHub + Slack | **Build in our platform** — not Plane Commercial (~$6/seat/mo) |
| Architecture | **Platform = hub** — GitHub/Slack ↔ platform ↔ Plane CE via pm-bridge |
| Merge to `main` | **Still blocked** until James explicitly approves |

**Why:** Plane instance reports `edition: PLANE_COMMUNITY`, `is_github_enabled: false`, `slack_client_id: null`. Native GitHub/Slack require Plane Commercial + Silo service. Our pm-bridge already syncs tasks ↔ Plane work items; we extend the same pattern for GitHub and Slack.

---

## What is DONE (carried forward from Jun 11)

| Item | Status |
|------|--------|
| Plane CE pm-bridge (REST + webhooks, 12/12 tests) | ✅ |
| Auto-sync on `POST /api/route/apply` | ✅ |
| PM Status UI (`/tasks`, badges, Routing Demo) | ✅ |
| Agent → Plane member mapping (P1-8) | ✅ |
| Webhook IP allowlist (P1-9) | ✅ |
| EC2 security audit + SG fixes (P1-10) | ✅ |
| E2E regression B01–B22 (Jun 11) | ✅ |
| Startup scripts (`start.sh`, `stop.sh`, `status.sh`) | ✅ |
| Operational runbook (`docs/runbook.md`) | ✅ |
| Integrations registry UI + API (create/test/delete) | ✅ **mock only** |
| `integration_connections` table + seeded GitHub/Slack rows | ✅ |
| `connectors.js` mock test layer | ✅ MVP placeholder |

---

## What is NOT done (this sprint)

| Item | Status |
|------|--------|
| Real GitHub API connector (live test, webhooks) | ❌ pending |
| Real Slack API connector (live test, post messages) | ❌ pending |
| Link tasks ↔ GitHub issues/PRs | ❌ pending |
| Link tasks ↔ Slack threads/channels | ❌ pending |
| Sync orchestrator (GitHub/Slack events → task + Plane) | ❌ pending |
| Webhook receivers `/webhooks/github`, `/webhooks/slack` | ❌ pending |
| OAuth flows (optional — can defer to PAT/bot token MVP) | ❌ pending |
| Integration E2E test script | ❌ pending |
| Update `docs/user-guide.md` with integrations flow | ❌ pending |
| P1-6 / P1-7 (re-scoped from Plane Settings → platform) | ❌ pending |

---

## P1 task re-scope (James priorities #2 and #3)

| Old # | Old scope | New scope | Status |
|-------|-----------|-----------|--------|
| P1-6 | Plane GitHub in Plane Settings | **Platform GitHub connector** + sync to tasks/Plane | pending |
| P1-7 | Plane Slack in Plane Settings | **Platform Slack connector** + notifications + optional commands | pending |

---

## Target architecture

```
                    ┌─────────────────────────────────────┐
                    │   Platform (:3000 API, :3001 UI)    │
                    │                                     │
  GitHub ─webhook─▶ │  /webhooks/github                   │
  Slack  ─events─▶  │  /webhooks/slack                    │
                    │                                     │
                    │  integration-sync service           │
                    │    ├── task_intake (source of truth)│
                    │    ├── pm-bridge ───────────────┐   │
                    │    ├── github connector         │   │
                    │    └── slack connector          │   │
                    └─────────────────────────────────┼───┘
                                                      │
                                                      ▼ REST + webhooks
                                               Plane CE (:8083)
```

**Source of truth for orchestration:** `task_intake` in our Postgres.  
**Plane CE:** human PM board (boards, assignees, cycles).  
**GitHub:** code/PR/issue events.  
**Slack:** team notifications (and later task creation).

---

## Implementation plan (phased)

### Phase 0 — Branch and prerequisites (Day 1)

| # | Task | Owner | Deliverable |
|---|------|-------|-------------|
| 0.1 | Create branch `feature/platform-github-slack` from `feature/plane-pm-integration` | Dev | Branch pushed |
| 0.2 | Document required secrets in `.env.example` | Dev | `GITHUB_*`, `SLACK_*` vars |
| 0.3 | Confirm EC2 port **3000** reachable for inbound webhooks | Ops | Webhook URL documented |
| 0.4 | James/ops: create **Slack app** (bot token) OR defer to Phase 2 | James/Ops | `SLACK_BOT_TOKEN` |
| 0.5 | James/ops: create **GitHub PAT** or GitHub App for `1Touch-dev` org | James/Ops | `GITHUB_TOKEN` or app creds |

**Webhook base URL (EC2):** `http://54.167.31.169:3000/webhooks/...`  
**Note:** OAuth later may need HTTPS + domain (P2-11). MVP can use PAT + bot token without OAuth.

---

### Phase 1 — Foundation (Days 1–2)

| # | Task | Files / area |
|---|------|--------------|
| 1.1 | DB migration `0011_integration_links.sql` | `backend/db/migrations/` |
| 1.2 | Add columns on `task_intake`: `github_repo`, `github_issue_number`, `github_pr_number`, `slack_channel_id`, `slack_thread_ts` | migration |
| 1.3 | Create `integration_events` log table (provider, event_type, payload, task_id, processed_at) | migration |
| 1.4 | Replace mock `testProvider()` with real HTTP pings | `backend/src/lib/connectors.js` |
| 1.5 | GitHub test: `GET https://api.github.com/user` with PAT | connectors |
| 1.6 | Slack test: `auth.test` API with bot token | connectors |
| 1.7 | Encrypt or redact tokens in API responses (already partial via `sanitizeConnection`) | `integrations.js` |
| 1.8 | Unit tests for real connector tests (mock `fetch`) | `backend/tests/` |

---

### Phase 2 — Slack connector (Days 2–4) — ship first (lower risk)

| # | Task | Description |
|---|------|-------------|
| 2.1 | `backend/src/services/slack/` — `SlackClient` (post message, post thread reply) | New service |
| 2.2 | Env: `SLACK_BOT_TOKEN`, `SLACK_DEFAULT_CHANNEL` | `.env.example` |
| 2.3 | On `POST /api/route/apply` success → post Slack notification with task title, agent, Plane link | Hook in `routing.js` or sync service |
| 2.4 | On Plane webhook `issue.updated` (status → completed) → post Slack “task done” | `webhooks.js` or sync service |
| 2.5 | `POST /webhooks/slack` — Events API receiver (URL verification + optional slash command stub) | `routes/webhooks.js` |
| 2.6 | Integrations UI: show “live” vs “mock” mode badge | `Integrations.jsx` |
| 2.7 | Manual test checklist in doc | `docs/integration-slack.md` |

**MVP Slack scope:** outbound notifications only. No `/globex` slash command until Phase 4.

---

### Phase 3 — GitHub connector (Days 4–7)

| # | Task | Description |
|---|------|-------------|
| 3.1 | `backend/src/services/github/` — `GitHubClient` (get repo, create issue, list PRs) | New service |
| 3.2 | Env: `GITHUB_TOKEN` or App credentials; `GITHUB_DEFAULT_REPO=1Touch-dev/claude-skill-agent` | `.env.example` |
| 3.3 | `POST /webhooks/github` — verify HMAC signature (`X-Hub-Signature-256`) | `webhooks.js` |
| 3.4 | Handle events: `pull_request` (opened, merged), `issues` (opened, closed) | webhook handler |
| 3.5 | Link PR/issue to task via branch name pattern (`task-{id}`) or title tag `[GLOBEX-{n}]` | linking logic |
| 3.6 | PR opened → update `task_intake.status` → `running` → update Plane issue state via pm-bridge | sync service |
| 3.7 | PR merged → `completed` + Plane state + optional Slack notify | sync service |
| 3.8 | Optional: on route/apply → create GitHub issue linked to task | `routing.js` |
| 3.9 | Manual test checklist | `docs/integration-github.md` |

**MVP GitHub scope:** webhook-driven status sync for one repo. Full bi-directional issue sync is Phase 4+.

---

### Phase 4 — Sync orchestrator (Days 7–9)

| # | Task | Description |
|---|------|-------------|
| 4.1 | `backend/src/services/integration-sync/` — central dispatcher | New module |
| 4.2 | `onTaskUpdated(taskId)` → Plane + Slack (+ GitHub if linked) | single entry point |
| 4.3 | `onPlaneIssueUpdated(issueId)` → task + Slack (+ GitHub) | refactor webhook handler |
| 4.4 | `onGitHubEvent(event)` → task + Plane + Slack | refactor github webhook |
| 4.5 | Idempotency: dedupe by `integration_events` + external event ID | prevent double posts |
| 4.6 | Failure handling: log errors, never crash routing/webhooks | match pm-bridge pattern |
| 4.7 | `scripts/test-integrations.sh` — Slack ping + GitHub ping + mock webhook | test script |

---

### Phase 5 — UI, docs, and demo (Days 9–10)

| # | Task | Description |
|---|------|-------------|
| 5.1 | Tasks page: show GitHub/Slack link badges (like Plane `✈ #n`) | `Tasks.jsx` |
| 5.2 | Task detail: manual “Link GitHub PR” / “Notify Slack” actions (optional) | API + UI |
| 5.3 | Update `docs/user-guide.md` — integrations + sync flow | docs |
| 5.4 | Update `docs/mvp-known-limitations.md` — mark live Slack/GitHub | docs |
| 5.5 | Update `docs/runbook.md` — webhook URLs, token rotation | docs |
| 5.6 | E2E demo script: route task → Slack message → Plane badge → simulate PR webhook | `docs/mvp-demo-script.md` |
| 5.7 | James demo / WhatsApp summary | comms |

---

## File change map (expected)

| Area | New / modified files |
|------|----------------------|
| DB | `0011_integration_links.sql`, `0012_integration_events.sql` (if split) |
| Services | `services/github/index.js`, `services/slack/index.js`, `services/integration-sync/index.js` |
| Routes | `routes/webhooks.js` (extend), `routes/integrations.js`, `routes/routing.js` |
| Lib | `lib/connectors.js` (real tests) |
| Config | `services/integration-sync/config.js` or extend pm-bridge config pattern |
| Frontend | `pages/Integrations.jsx`, `pages/Tasks.jsx` |
| Scripts | `scripts/test-integrations.sh` |
| Docs | `docs/integration-github.md`, `docs/integration-slack.md`, updates to runbook + user-guide |
| Env | `.env.example` |

---

## Environment variables (planned)

```env
# GitHub (MVP: PAT; later: GitHub App)
GITHUB_TOKEN=
GITHUB_WEBHOOK_SECRET=
GITHUB_DEFAULT_REPO=1Touch-dev/claude-skill-agent

# Slack (MVP: bot token)
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_DEFAULT_CHANNEL=C01234567

# Webhook security (reuse pattern from Plane)
INTEGRATION_WEBHOOK_ALLOWED_IPS=   # optional; GitHub publishes IP ranges
```

---

## Credentials needed from James / ops

| Credential | Who creates | Used for |
|------------|-------------|----------|
| Slack Bot Token (`xoxb-...`) | Slack workspace admin | Post messages |
| Slack Signing Secret | Same Slack app | Verify incoming events |
| GitHub PAT (`repo` scope) or GitHub App | GitHub org admin | API calls + webhooks |
| GitHub webhook secret | Same GitHub app/repo webhook | Verify `X-Hub-Signature-256` |
| Default Slack channel ID | Team | Where notifications go |

**No Plane login required** for this sprint. Plane CE stays as-is.

---

## Success criteria (definition of done)

| # | Criterion | How to verify |
|---|-----------|---------------|
| S1 | Slack “Test connection” calls real Slack API | Integrations UI → Test → `mode: live` |
| S2 | GitHub “Test connection” calls real GitHub API | Same |
| S3 | Route a task → Slack channel receives notification with Plane link | Manual + script |
| S4 | GitHub PR webhook → platform task status updates → Plane issue state updates | curl or real PR |
| S5 | Plane status change → Slack notification (optional second message) | Drag card in Plane UI |
| S6 | `scripts/test-integrations.sh` passes on EC2 | CI / manual |
| S7 | No regression: `test-pm-integration.sh` still 12/12 | regression |

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| HTTP-only EC2 URL for Slack Events API | Start with outbound-only Slack; add Events when HTTPS ready |
| GitHub webhook delivery to HTTP IP | GitHub allows `http://` for some setups; prefer repo webhook on EC2; document if blocked |
| Token exposure in DB | Store in `credential_vault` JSONB; never return raw tokens in API |
| Double notifications | Idempotency keys in `integration_events` |
| Sync loops (Plane → platform → Plane) | Only update Plane when status actually changed; compare before write |

---

## P2 — unchanged / deferred

| # | Task |
|---|------|
| 11 | HTTPS / domain (helps OAuth + Slack Events fully) |
| 12 | Plane DB + MinIO backup rotation |
| 13 | Merge `feature/plane-pm-integration` → `main` (James approval) |
| 14 | Plane Commercial upgrade (only if James wants native Plane integrations later) |
| 15 | Fix `plane_webhook_events.task_id` SQL bug (`ORDER BY` in UPDATE) |
| 16 | Remove postgres/redis host port bindings in docker-compose |

---

## Live URLs (unchanged)

| Service | URL |
|---------|-----|
| Platform admin UI | http://54.167.31.169:3001 |
| Platform API | http://54.167.31.169:3000 |
| Plane PM UI | http://54.167.31.169:8083 |
| GitHub repo | https://github.com/1Touch-dev/claude-skill-agent |

---

## Related docs

- [11th_June.md](11th_June.md) — Plane operationalization complete  
- [docs/plane-integration.md](../docs/plane-integration.md) — pm-bridge reference  
- [docs/mvp-known-limitations.md](../docs/mvp-known-limitations.md) — current boundaries  
- [docs/runbook.md](../docs/runbook.md) — ops  

---

## Sprint log

| Date | Action | Status |
|------|--------|--------|
| Jun 12 | Decision: stay Plane CE, build GitHub/Slack in platform | ✅ |
| Jun 12 | Created this plan (`12th_June.md`) | ✅ |
| Jun 12 | Branch `feature/platform-github-slack` | ☐ not started |
| Jun 12 | Phase 0 prerequisites (tokens from James) | ☐ blocked on credentials |
