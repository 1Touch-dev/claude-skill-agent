# GitHub Poller — EC2 Background Job

> **Status: LIVE** — running on EC2, polls every 2 minutes  
> Branch: `feature/github-poller`  
> Interim solution while repo-admin webhook access is pending

---

## Why This Exists

GitHub's native webhook mechanism requires **repository admin access** to register a delivery URL.
The platform's PAT has `repo` scope (push/pull, issue create, comment) but not admin privileges on
`1Touch-dev/claude-skill-agent`.

Rather than blocking on James for admin access, the **GitHub Poller** achieves the same outcome
by periodically querying the GitHub API and processing events through the **identical handler**
that the live webhook receiver (`POST /webhooks/github`) uses.

Once a real webhook is registered, set `GITHUB_POLL_ENABLED=false` and restart — no code changes
required. The native webhook and the poller use the same `processGitHubEvent()` function.

---

## Architecture

```
GitHub.com ──[REST API]──▶ EC2 github-poller.js (every 2 min)
                                    │
                          processGitHubEvent(event, payload, deliveryId, 'poll')
                                    │
                         ┌──────────┴───────────────────────────────┐
                         │                                          │
               task_intake (status update)              integration_events (dedup log)
                         │                                          │
               plane PM bridge (state sync)        poller_cursors (last seen id/ts)
                         │
               Slack notify (thread reply or new msg)
```

---

## How It Works

| Step | Detail |
|------|--------|
| **1. Tick** | Every `GITHUB_POLL_INTERVAL_SEC` seconds (default 120) |
| **2. Fetch** | GET `/repos/{owner}/{repo}/pulls?state=all&sort=updated&per_page=100` |
| **3. Compare** | Skip items where `id ≤ last_seen_id` AND `updated_at ≤ last_seen_at` |
| **4. Process** | Build synthetic webhook payload → call `processGitHubEvent()` |
| **5. Dedup** | `INSERT ... ON CONFLICT (provider, external_id) DO NOTHING` |
| **6. Advance cursor** | Update `poller_cursors.last_seen_id` and `last_seen_at` |
| **7. Repeat for issues** | Same flow for GET `/repos/{owner}/{repo}/issues` (PRs filtered out) |

**Delivery ID format:** `poll:pr:{github_item_id}:{updated_at}` — unique per update snapshot.

---

## Task Linking

The poller uses the same patterns as the webhook:

| Pattern | Example |
|---------|---------|
| `task-{id}` in PR title | `task-17 add auth module` |
| `[T-{id}]` in PR title/body | `[T-17] fix login bug` |
| `[TASK-{id}]` in title/body | `[TASK-17] ...` |
| `T#{id}` in title/body | `T#17 ...` |
| Branch name | `feature/task-17-auth` |

---

## Status Mapping

| GitHub event | Action | Task status |
|-------------|--------|-------------|
| `pull_request` | `opened` / `reopened` | `running` |
| `pull_request` | `closed` + merged | `completed` |
| `pull_request` | `closed` + not merged | *(unchanged)* |
| `issues` | `opened` | `queued` |
| `issues` | `closed` | `completed` |

---

## Environment Variables

Add to `.env` (or EC2 environment):

```env
# Turn poller on
GITHUB_POLL_ENABLED=true

# Seconds between polls (default 120 = 2 min)
GITHUB_POLL_INTERVAL_SEC=120

# Repo to poll (already required for GitHub service)
GITHUB_DEFAULT_REPO=1Touch-dev/claude-skill-agent

# PAT with repo / public_repo scope (already set)
GITHUB_TOKEN=ghp_...
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/jobs/github-poller.js` | Poller job — tick, fetch, deduplicate, process |
| `backend/src/routes/webhooks.js` | Exports `processGitHubEvent()` — shared handler |
| `backend/src/services/github/index.js` | `listPullRequests()` and `listIssues()` methods |
| `backend/src/index.js` | Calls `githubPoller.start()` on server boot |
| `backend/db/migrations/0012_github_poller.sql` | Unique constraint + `poller_cursors` table |
| `scripts/test-github-poller.sh` | 8-point E2E test suite |

---

## Database Tables

### `poller_cursors`

| Column | Type | Description |
|--------|------|-------------|
| `resource` | TEXT UNIQUE | `'github:prs'` or `'github:issues'` |
| `last_seen_id` | BIGINT | GitHub item numeric ID of last processed item |
| `last_seen_at` | TIMESTAMPTZ | `updated_at` of last processed item |
| `updated_at` | TIMESTAMPTZ | When this cursor was last advanced |

### `integration_events` (existing, extended)

New unique constraint `uq_integration_events_provider_ext_id` on `(provider, external_id)` enables
idempotent inserts:

```sql
INSERT INTO integration_events(...) VALUES (...)
ON CONFLICT (provider, external_id) DO NOTHING;
```

---

## Switching to Native Webhook

When James (or anyone with repo admin) grants webhook access:

1. **Register webhook** in GitHub → Repo → Settings → Webhooks  
   - Payload URL: `http://54.167.31.169:3000/webhooks/github`
   - Content type: `application/json`
   - Secret: value of `GITHUB_WEBHOOK_SECRET` in `.env`
   - Events: `Pull requests`, `Issues`

2. **Disable poller** in `.env`:
   ```env
   GITHUB_POLL_ENABLED=false
   ```

3. Restart backend: `docker compose up -d backend`

4. Verify: `POST /webhooks/github` returns `{ ok: true }` for a test delivery.

No code changes needed. See `docs/github_webhooks.md` for full native webhook reference.

---

## E2E Test Results (15 Jun 2026)

```
[PASS] Backend is up (HTTP 200)
[PASS] Backend log: [github-poller] starting found
[PASS] PR cursor last_seen_id=3838358305 (cursor advanced)
[PASS] Issue cursor — no issues in repo yet (normal)
[PASS] integration_events has 1 GitHub poll row(s)
[PASS] Dedup works: ON CONFLICT DO NOTHING → only 1 row for duplicate delivery ID
[PASS] Webhook sig check active — payload test skipped (expected)
[PASS] Tasks with GitHub PR links found: task #16 PR#999

PASS: 8   FAIL: 0
```

---

## Operational Notes

- **Delay:** up to `GITHUB_POLL_INTERVAL_SEC` seconds (default 2 min). Set to `30` for demo.
- **Rate limits:** 5,000 requests/hour on PAT. At 2-min intervals = 60 req/hr (well under limit).
- **Log prefix:** `[github-poller]` — visible in `docker logs claude-skill-agent-backend-1`.
- **On restart:** poller re-reads cursor from DB; won't duplicate events already recorded.
- **Plane sync:** same as webhook — updates Plane issue state if task has `plane_issue_id`.
- **Slack notify:** same as webhook — posts to task's Slack thread or default channel.
