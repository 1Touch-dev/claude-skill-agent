# GitHub Webhooks — Reference & Return Path

**Purpose:** Canonical snapshot of the **native GitHub repo webhook** approach as implemented on the platform. Use this document to restore or re-enable the webhook path once admin access is available. The **interim solution (EC2 GitHub Poller)** is currently LIVE — see [github_poller.md](github_poller.md).

**Last updated:** June 15, 2026  
**Status:** Receiver **implemented and tested** on EC2; repo webhook **not registered** (admin required). **Interim poller ACTIVE.**  
**Branch:** `feature/github-poller` (built on `feature/platform-github-slack`)  
**Related:** [integration-github.md](integration-github.md) · [github_poller.md](github_poller.md) · [15th_June.md](../memory/15th_June.md) · [12th_June.md](../memory/12th_June.md)

---

## Quick status (read this first)

| Layer | Status |
|-------|--------|
| Platform webhook handler `POST /webhooks/github` | ✅ Live on EC2 |
| HMAC signature verification (`GITHUB_WEBHOOK_SECRET`) | ✅ Enforced (401 without sig) |
| GitHub PAT outbound API (`GITHUB_TOKEN`) | ✅ Live — Integrations test passes |
| **EC2 GitHub Poller** (interim) | ✅ **LIVE** — polls every 2 min, cursor advancing |
| GitHub repo webhook registered on GitHub.com | ❌ **Not done** — admin required |
| Real PR/issue → task → Plane → Slack (via poller) | ✅ **Functional** (≤2 min delay) |

**Current path:** EC2 Poller handles inbound GitHub events at ~2 min delay. Native webhook will replace it (zero delay, zero polling overhead) once admin access is available.

---

## Strategic context (do not lose this)

| Decision | Choice (James, Jun 12 2026) |
|----------|----------------------------|
| PM layer | **Plane CE** — not Plane Commercial |
| GitHub integration location | **Our platform hub** — not Plane Settings |
| Architecture | `GitHub → Platform API → task_intake → Plane CE + Slack` |
| James quote | *“We would do it with our architecture”* |

Native GitHub **repo webhooks** are the **intended long-term** inbound path. GitHub Actions is only a possible **temporary stop-gap** if admin access is delayed.

---

## Architecture (canonical webhook design)

```
GitHub.com (repo: 1Touch-dev/claude-skill-agent)
    │
    │  POST on pull_request / issues events
    │  Headers: X-GitHub-Event, X-Hub-Signature-256, X-GitHub-Delivery
    ▼
Platform API — http://54.167.31.169:3000/webhooks/github
    │
    ├── Verify HMAC (GITHUB_WEBHOOK_SECRET)
    ├── Parse payload → find task_id from branch/title/body
    ├── UPDATE task_intake (status, github_pr_*, github_issue_*)
    ├── INSERT integration_events
    ├── pm-bridge → sync Plane work item state (if plane_issue_id set)
    └── Slack → thread reply (if slack_message_ts set)

Admin UI (:3001) does NOT receive webhooks — only humans + Integrations “Test”.
```

**Source of truth:** `task_intake` in platform Postgres (`enterprise_claude_skills`).

---

## Repository & access facts (verified Jun 15, 2026)

| Item | Value |
|------|--------|
| Repo | `1Touch-dev/claude-skill-agent` |
| Visibility | **Public** |
| Default branch on GitHub.com | `main` (may lag `feature/platform-github-slack`) |
| Active dev branch | `feature/platform-github-slack` (EC2 deploy) |
| PAT user | `Abhishek9302` |
| PAT scopes | `repo`, `workflow`, `read:org`, `project`, `user` |
| Repo permissions (Abhishek9302) | `push: true`, `admin: **false**` |
| Webhooks API `GET /repos/.../hooks` | **404** (hidden without admin) |
| Browser `/settings/hooks` | **Page not found** (404) for non-admin |

### PAT can vs cannot

| Action | PAT only? | Notes |
|--------|-----------|--------|
| Integrations → Test connection | ✅ Yes | `mode: live`, lists PRs, etc. |
| List/create repo webhooks | ❌ No | Requires repo **Admin** — extra PAT scopes do **not** help |
| Poll Events API `GET /repos/.../events` | ✅ Yes | Public repo; not implemented in platform |
| Register webhook via GitHub UI | ❌ No | Admin only |

---

## Webhook registration (exact values)

**Who:** James or any user with **Admin** on `1Touch-dev/claude-skill-agent`.

**URL:** https://github.com/1Touch-dev/claude-skill-agent/settings/hooks  
*(Non-admins get 404 — expected.)*

### Form fields

| Field | Value |
|-------|--------|
| **Payload URL** | `http://54.167.31.169:3000/webhooks/github` |
| **Content type** | `application/json` |
| **Secret** | Exact value of `GITHUB_WEBHOOK_SECRET` in EC2 `.env` |
| **SSL verification** | **Disable** (HTTP endpoint; not HTTPS) |
| **Which events?** | Let me select individual events |
| **Events** | ✅ **Pull requests**, ✅ **Issues** |
| **Active** | ✅ checked |

### Get the secret (EC2 — do not commit)

```bash
grep GITHUB_WEBHOOK_SECRET /home/ubuntu/claude-skill-agent/.env
```

Generated originally with:

```bash
openssl rand -hex 32
```

Secret must match **exactly** in both GitHub webhook settings and `.env`. After changing `.env`:

```bash
cd /home/ubuntu/claude-skill-agent
docker compose up -d --no-deps --force-recreate backend
```

### Browser steps (admin)

1. Sign in to GitHub as repo admin.
2. Open https://github.com/1Touch-dev/claude-skill-agent
3. **Settings** tab → left sidebar **Webhooks**
4. **Add webhook** → fill table above → **Add webhook**
5. Open webhook → **Recent Deliveries** → first `ping` should be **200 ✓**

---

## Environment variables (EC2)

| Variable | Purpose | In `.env.example` |
|----------|---------|-------------------|
| `GITHUB_TOKEN` | Outbound GitHub REST API (PAT) | ✅ |
| `GITHUB_DEFAULT_REPO` | `1Touch-dev/claude-skill-agent` | ✅ |
| `GITHUB_WEBHOOK_SECRET` | HMAC verify inbound webhooks | ✅ |

**Never commit `.env`.** Rotate secret only if you also update the GitHub webhook Secret field.

---

## Code references (return-to-webhook checklist)

| Component | Path |
|-----------|------|
| Webhook route | `backend/src/routes/webhooks.js` → `POST /github` |
| Signature verify | `verifyGitHubSignature()` — `X-Hub-Signature-256` |
| Event handler | `handleGitHubEvent()` — `pull_request`, `issues` |
| Task ID extraction | `extractTaskIdFromText()` — `task-{id}`, `[T-{id}]`, etc. |
| GitHub REST client | `backend/src/services/github/index.js` |
| Connector test | `backend/src/lib/connectors.js` → `testGitHub` |
| DB migration | `backend/db/migrations/0011_github_slack_links.sql` |
| Event log table | `integration_events` |
| Integration test script | `scripts/test-integrations.sh` |

### Event → task status mapping (implemented)

| `X-GitHub-Event` | `action` | Task status |
|------------------|----------|-------------|
| `pull_request` | `opened`, `reopened` | `running` |
| `pull_request` | `closed` + merged | `completed` |
| `pull_request` | `closed` not merged | unchanged |
| `issues` | `opened` | `queued` |
| `issues` | `closed` | `completed` |

Plane sync (pm-bridge): `running` → started, `completed` → done, `queued` → backlog.

### Task linking conventions

| Pattern | Example |
|---------|---------|
| `task-{id}` | Branch `feature/task-21-fix` |
| `[T-{id}]` | PR title `[T-21] Fix webhook` |
| `[TASK-{id}]` | Issue body |
| `T#{id}` | Title `T#21 cleanup` |

---

## Verification commands

### 1. Integration script (includes webhook reachability)

```bash
bash scripts/test-integrations.sh http://localhost:3000
# Expect: 6/6 PASS
# GitHub webhook line: HTTP 401 — sig check active=yes
```

### 2. Unsigned POST → must 401

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  "http://54.167.31.169:3000/webhooks/github" \
  -H "Content-Type: application/json" -d '{}'
# Expected: 401
```

### 3. Slack url_verification (sanity — separate endpoint)

```bash
curl -sS -X POST "http://54.167.31.169:3000/webhooks/slack" \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test-123"}'
# Expected: {"challenge":"test-123"}
```

### 4. PAT permissions (API)

```bash
source /home/ubuntu/claude-skill-agent/.env
curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/1Touch-dev/claude-skill-agent \
  | jq '{permissions, private, visibility}'
```

### 5. After webhook registered — GitHub UI

Repo → Settings → Webhooks → your webhook → **Recent Deliveries**  
- `ping` → 200  
- Real `pull_request` / `issues` → 200  

### 6. End-to-end PR test

1. Create/route a task in platform (e.g. task #21).
2. Open PR with branch `feature/task-21-...` or title `[T-21] ...`.
3. Confirm `task_intake.status` updates and Plane ✈ badge syncs.
4. Check `#server-alerts` for Slack thread reply (if task was routed first).

---

## What works today without the repo webhook

| Capability | Works? |
|------------|--------|
| Integrations UI → GitHub Test (`live`) | ✅ |
| Outbound: list PRs, create issues (API) | ✅ |
| Inbound: automatic PR merge → task update | ❌ |
| Simulated webhook via curl + valid HMAC | ✅ (dev only) |
| Platform demo: Routing → Plane + Slack | ✅ |

---

## Alternatives considered (and why webhook stays canonical)

### Alternative A — GitHub Actions (temporary stop-gap)

**Idea:** Workflow on `pull_request` / `issues` runs `curl` to platform endpoint.

| Pros | Cons |
|------|------|
| Works with **push** access (no admin) | Must mimic webhook payload + HMAC, or add new endpoint |
| Can ship via PR on feature branch | Workflow on `main` needed for full repo coverage after merge |
| Unblocks demo faster | Extra maintenance; not native GitHub delivery |

**If we enable Actions workaround:** document the workflow path in a separate file (e.g. `.github/workflows/notify-platform.yml`). **Keep this file** as the return spec.

### Alternative B — API polling (`GET /repos/.../events`)

**Idea:** Cron on EC2 polls GitHub Events API with PAT.

| Pros | Cons |
|------|------|
| No admin needed (public repo + PAT) | Not implemented |
| | Not real-time; rate limits |
| | Different payload shape than webhooks |

**Verified:** Events API returns 200 with current PAT. **Not recommended** vs one admin webhook.

### Alternative C — New PAT with webhook scopes

**Verdict:** ❌ **Does not work** without repo Admin. Confirmed via API 404 on `/hooks`.

---

## Return path: GitHub Actions → native webhook

When admin access is available, **switch back** to this checklist:

1. **Register repo webhook** — use [Webhook registration](#webhook-registration-exact-values) above.
2. **Verify** — `ping` 200 in Recent Deliveries; `test-integrations.sh` 6/6.
3. **Disable/remove** temporary GitHub Actions workflow (if added):
   - Delete or disable `.github/workflows/*platform*` (or whatever stop-gap file was added).
   - Remove any `GITHUB_ACTION_*` secrets added only for the workaround.
4. **Do not remove** from platform:
   - `POST /webhooks/github` handler
   - `GITHUB_WEBHOOK_SECRET` in `.env`
   - `GITHUB_TOKEN` (still used for outbound API test)
5. **Run E2E:**
   ```bash
   bash scripts/test-integrations.sh http://localhost:3000
   bash scripts/test-pm-integration.sh http://localhost:3000
   ```
6. **Live PR test** — merge a PR with `task-{id}` in branch/title; confirm task + Plane + Slack.

No code changes should be required on the platform if the webhook is registered correctly — handler is already production-ready.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|--------|-----|
| `/settings/hooks` → 404 | Not repo admin | Ask James/org owner |
| Webhook delivery 401 | Secret mismatch | Align GitHub Secret ↔ `.env`; restart backend |
| Webhook 200 but no task update | Missing `task-{id}` in PR/issue | Fix branch/title pattern |
| Webhook timeout | EC2 SG / backend down | Open port 3000; `docker compose ps` |
| Plane not updating | No `plane_issue_id` on task | Route task first (creates Plane work item) |
| PAT test OK, webhook N/A | Expected | PAT ≠ webhook registration |

---

## EC2 URLs (snapshot)

| Service | URL |
|---------|-----|
| Platform API (webhooks) | http://54.167.31.169:3000 |
| GitHub webhook endpoint | http://54.167.31.169:3000/webhooks/github |
| Admin UI | http://54.167.31.169:3001 |
| Plane CE | http://54.167.31.169:8083 |
| GitHub repo | https://github.com/1Touch-dev/claude-skill-agent |
| Webhook settings (admin) | https://github.com/1Touch-dev/claude-skill-agent/settings/hooks |

---

## Sprint timeline (webhook-specific)

| Date | Event |
|------|--------|
| Jun 12 | Webhook receiver implemented; `GITHUB_WEBHOOK_SECRET` set on EC2 |
| Jun 12 | Simulated PR webhook → task + Plane — PASS |
| Jun 12 | Slack Event Subscriptions — DONE (separate from GitHub) |
| Jun 12 PM | James approves platform-hub architecture |
| Jun 15 | PAT vs admin investigation — PAT cannot register webhooks |
| Jun 15 | API 6/6 + PM 12/12 + browser E2E — PASS (outbound GitHub live) |
| Jun 15 | **This document created** — canonical webhook return reference |
| TBD | James registers repo webhook OR temporary GitHub Actions workaround |

---

## Related documentation

| Document | Use |
|----------|-----|
| [integration-github.md](integration-github.md) | Shorter integration guide |
| [integration-slack.md](integration-slack.md) | Slack (already configured) |
| [user-guide.md](user-guide.md) | Where integrations appear in UI |
| [runbook.md](runbook.md) | Ops / restart / troubleshooting |
| [15th_June.md](../memory/15th_June.md) | Full Jun 15 sprint status |
| [12th_June.md](../memory/12th_June.md) | GitHub/Slack implementation sprint |

---

*Native GitHub repo webhooks are the intended inbound integration. This file is the restore point if we pause that path for GitHub Actions.*
