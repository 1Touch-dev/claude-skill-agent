# GitHub Integration — Platform Hub

**Branch:** `feature/platform-github-slack`  
**Status:** Live connector + webhook receiver implemented; **repo webhook registration pending repo admin**  
**Related:** [integration-slack.md](integration-slack.md) · [plane-integration.md](plane-integration.md) · [12th_June.md](../memory/12th_June.md)

---

## Overview

Plane CE does **not** include native GitHub integration. We connect GitHub to **our platform**, which orchestrates sync with `task_intake` and Plane CE via pm-bridge.

```
GitHub (PR/issue events)
    │ POST /webhooks/github
    ▼
Platform API (:3000)
    ├── UPDATE task_intake (status, github_pr_* fields)
    ├── pm-bridge → Plane work item state
    └── Slack → thread reply (if task has slack_thread_ts)
```

---

## What works today

| Capability | Status |
|------------|--------|
| Live connection test (`GET /api/integrations/:id/test`) | ✅ `mode: live` |
| Webhook receiver `POST /webhooks/github` | ✅ HMAC `X-Hub-Signature-256` |
| PR opened → task `running` | ✅ |
| PR merged → task `completed` | ✅ |
| Issue opened/closed → task status | ✅ |
| Link task by branch/title pattern | ✅ `task-{id}`, `[T-{id}]`, etc. |
| Sync to Plane issue state | ✅ when `plane_issue_id` set |
| Slack notification on status change | ✅ |

---

## Credentials

| Variable | Required | How to obtain |
|----------|----------|---------------|
| `GITHUB_TOKEN` | Yes | GitHub → Settings → Developer settings → PAT (classic) with `repo` scope |
| `GITHUB_DEFAULT_REPO` | Yes | e.g. `1Touch-dev/claude-skill-agent` |
| `GITHUB_WEBHOOK_SECRET` | Yes (production) | `openssl rand -hex 32` — same value in repo webhook settings |

Add to `.env` and restart backend:

```bash
docker compose up -d --build backend
```

Verify in container:

```bash
docker exec claude-skill-agent-backend-1 printenv GITHUB_WEBHOOK_SECRET | wc -c
# Should be > 1
```

---

## Register repo webhook (requires repo **Admin**)

> **Current blocker (Jun 12):** Personal account `Abhishek9302` has `push` access only — Settings → Webhooks is not visible. **James or a repo admin** must complete this step.

### Steps

1. Sign in to GitHub as a user with **Admin** on `1Touch-dev/claude-skill-agent`
2. Open **Settings → Webhooks → Add webhook**:  
   https://github.com/1Touch-dev/claude-skill-agent/settings/hooks
3. Configure:

| Field | Value |
|-------|-------|
| **Payload URL** | `http://54.167.31.169:3000/webhooks/github` |
| **Content type** | `application/json` |
| **Secret** | Value of `GITHUB_WEBHOOK_SECRET` from server `.env` |
| **SSL verification** | **Disable** (HTTP endpoint on EC2) |
| **Which events?** | Let me select individual events |
| **Events** | ✅ Pull requests, ✅ Issues |
| **Active** | ✅ |

4. Click **Add webhook**
5. Confirm first delivery (`ping`) shows green ✓ in Recent Deliveries

### Verify signature enforcement

```bash
# Without signature → 401 (secret configured)
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  "http://54.167.31.169:3000/webhooks/github" \
  -H "Content-Type: application/json" -d '{}'
# Expected: 401
```

---

## Task linking conventions

The webhook handler extracts `task_id` from PR/issue **title**, **body**, or **branch name**:

| Pattern | Example |
|---------|---------|
| `task-{id}` | Branch `feature/task-18-fix` |
| `[T-{id}]` | Title `[T-18] Plane webhook fix` |
| `[TASK-{id}]` | Body reference |
| `T#{id}` | Title `T#18 cleanup` |

**Best practice:** name branches `task-{id}-short-description` or include `[T-{id}]` in PR title.

---

## Event → status mapping

| GitHub event | Action | Task status |
|--------------|--------|-------------|
| `pull_request` | opened, reopened | `running` |
| `pull_request` | closed + merged | `completed` |
| `pull_request` | closed (not merged) | unchanged |
| `issues` | opened | `queued` |
| `issues` | closed | `completed` |

Plane state mapping (via pm-bridge): `running` → started, `completed` → done, `queued` → backlog.

---

## API and code references

| Area | Location |
|------|----------|
| GitHub service | `backend/src/services/github/index.js` |
| Webhook handler | `backend/src/routes/webhooks.js` → `POST /github` |
| Connector test | `backend/src/lib/connectors.js` |
| DB columns | `backend/db/migrations/0011_github_slack_links.sql` |
| Event log | `integration_events` table |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Webhook deliveries fail with 401 | `GITHUB_WEBHOOK_SECRET` mismatch between `.env` and GitHub webhook settings |
| Webhook skipped (no task update) | PR/issue missing `task-{id}` pattern |
| Can't open Settings → Webhooks | Need **Admin** on repo — ask org owner |
| Test connection fails | Check `GITHUB_TOKEN` scope and expiry |
| Plane not updating | Task must have `plane_issue_id`; pm-bridge must be enabled |

---

## Test script

```bash
bash scripts/test-integrations.sh http://localhost:3000
```

---

*Platform-owned GitHub integration — not Plane Commercial Silo.*
