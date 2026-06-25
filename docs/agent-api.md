# Agent API v1 — Developer Reference

**Base URL:** `http://54.167.31.169:3000/v1`  
**Auth:** `Authorization: Bearer <API_KEY>` (when `REQUIRE_AUTH=true`)  
**Content-Type:** `application/json`  
**Rate limit:** 200 requests per 15-minute window (headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`)

---

## Overview

The `/v1` API is a simple, stable REST surface for integrating the platform into third-party marketplaces (Asana, Monday.com, Zapier, Make) and building automation scripts.  It is separate from the internal `/api` namespace used by the Admin UI.

Typical call flow:

```
1. GET  /v1/skills                 → pick a skill_key
2. POST /v1/tasks                  → create a task
3. POST /v1/tasks/:id/run          → route to agent, fire Plane + Slack
4. GET  /v1/tasks/:id/status       → poll until done
```

---

## Authentication

Set `API_KEYS` in the server `.env` as a comma-separated list:

```
API_KEYS=your-key-1,your-key-2
REQUIRE_AUTH=true
```

Every request must include:

```
Authorization: Bearer your-key-1
```

When `REQUIRE_AUTH=false` (default in dev), auth is bypassed.

---

## Endpoints

---

### `GET /v1/health`

Liveness check. No auth required.

**Response 200:**
```json
{
  "status": "ok",
  "version": "1",
  "service": "agent-api"
}
```

---

### `GET /v1/skills`

List all enabled skills.

**Response 200:**
```json
{
  "total": 12,
  "skills": [
    {
      "key": "mkt_seo_content",
      "name": "SEO Content Writer",
      "department_tags": ["marketing"],
      "industry_tags": ["saas", "retail", "agency"],
      "risk_tier": 1,
      "credit_cost": 12,
      "description": "Generates SEO-optimised blog posts and articles from a keyword brief.",
      "example_prompt": "Write a 1,000-word SEO article targeting the keyword ...",
      "category": "agency"
    }
  ]
}
```

---

### `GET /v1/skills/:key`

Get a single skill by key.

**Example:**
```bash
curl http://54.167.31.169:3000/v1/skills/mkt_seo_content
```

**Response 200:** single skill object (same fields as list above)  
**Response 404:**
```json
{ "error": "skill_not_found", "key": "mkt_seo_content" }
```

---

### `POST /v1/tasks`

Create a new task. Does not route or run — use `/run` for that.

**Body:**
```json
{
  "workspace_id": 2,
  "title": "Write SEO article on AI marketing tools",
  "description": "Target keyword: AI marketing tools for agencies. 1,000 words.",
  "skill_key": "mkt_seo_content"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `workspace_id` | integer | Yes | Workspace to create task in |
| `title` | string | Yes | Short task title |
| `description` | string | No | Full task brief |
| `skill_key` | string | Yes | Must be an enabled skill (see `/v1/skills`) |

**Response 201:**
```json
{
  "task_id": 24,
  "title": "Write SEO article on AI marketing tools",
  "status": "queued",
  "skill_key": "mkt_seo_content",
  "workspace_id": 2,
  "created_at": "2026-06-25T05:30:00.000Z",
  "_links": {
    "self":   "/v1/tasks/24",
    "route":  "/v1/tasks/24/route",
    "run":    "/v1/tasks/24/run",
    "status": "/v1/tasks/24/status"
  }
}
```

**Error 404:** `skill_not_found` — skill_key doesn't exist or is disabled  
**Error 400:** `missing_field` — required field absent

---

### `GET /v1/tasks/:id`

Get full task details including integration links.

**Response 200:**
```json
{
  "task_id": 24,
  "title": "Write SEO article on AI marketing tools",
  "description": "...",
  "status": "running",
  "workspace_id": 2,
  "plane_issue_id": "c0a760a8-...",
  "plane_issue_url": "http://54.167.31.169:8083/claude-skills/projects/WS0002/issues/.../",
  "github_pr_number": 5,
  "github_pr_url": "https://github.com/1Touch-dev/claude-skill-agent/pull/5",
  "slack_thread_ts": "1750000000.000100",
  "created_at": "2026-06-25T05:30:00.000Z",
  "updated_at": "2026-06-25T05:30:05.000Z"
}
```

---

### `GET /v1/tasks/:id/status`

Lightweight status poll (smaller payload, good for polling loops).

**Response 200:**
```json
{
  "task_id": 24,
  "status": "running",
  "synced_to_plane": true,
  "github_linked": false,
  "slack_linked": true
}
```

**Status values:** `queued` → `running` → `completed` | `failed` | `approved`

---

### `POST /v1/tasks/:id/route`

Recommend an agent without persisting. Use to preview routing before committing.

**Body:**
```json
{
  "workspace_id": 2,
  "skill_key": "mkt_seo_content",
  "min_autonomy": 0,
  "risk_tier": 0
}
```

**Response 200:**
```json
{
  "task_id": 24,
  "agent_id": 2,
  "agent_name": "Globex Agent",
  "autonomy_level": 3,
  "recommendation": "auto"
}
```

**Error 404:** `no_agent_found` — no agent in workspace supports this skill

---

### `POST /v1/tasks/:id/run`

Route the task to an agent, create an orchestration run, and fire background Plane sync + Slack notification.

**Body:** Same as `/route`

**Response 201:**
```json
{
  "task_id": 24,
  "run_id": 26,
  "agent_id": 2,
  "agent_name": "Globex Agent",
  "skill_key": "mkt_seo_content",
  "status": "pending",
  "message": "Task routed and run created. Plane sync and Slack notify firing in background.",
  "_links": {
    "task":   "/v1/tasks/24",
    "status": "/v1/tasks/24/status"
  }
}
```

---

## Error reference

| HTTP | Error code | Meaning |
|------|-----------|---------|
| 400 | `missing_field` | Required field absent in body |
| 401 | `unauthorized` | Missing or invalid API key |
| 404 | `skill_not_found` | skill_key not found or disabled |
| 404 | `task_not_found` | task id does not exist |
| 404 | `no_agent_found` | No agent in workspace matches skill + autonomy |
| 500 | `internal_error` | Server error (details in `details` field) |

---

## Complete curl example

```bash
BASE="http://54.167.31.169:3000/v1"
KEY="your-api-key"

# 1. List skills
curl -s -H "Authorization: Bearer $KEY" "$BASE/skills" | jq '.skills[].key'

# 2. Create a task
TASK=$(curl -s -X POST "$BASE/tasks" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": 2,
    "title": "SEO article: AI tools for agencies",
    "description": "Target keyword: AI marketing tools. 1,000 words.",
    "skill_key": "mkt_seo_content"
  }')
TASK_ID=$(echo $TASK | jq '.task_id')

# 3. Run (route + Plane + Slack)
curl -s -X POST "$BASE/tasks/$TASK_ID/run" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id": 2, "skill_key": "mkt_seo_content"}' | jq .

# 4. Poll status
curl -s -H "Authorization: Bearer $KEY" "$BASE/tasks/$TASK_ID/status" | jq .
```

---

## Marketplace integration notes

### Zapier (via Zap or Zapier MCP)
- Trigger: any Zapier trigger (new email, new Asana task, CRM event, etc.)
- Action: HTTP POST to `$BASE/tasks` with workspace_id + title + skill_key
- Follow-up action: GET `$BASE/tasks/:id/status` to check completion

### Make (Integromat)
- Use HTTP module: POST `/v1/tasks`, then GET `/v1/tasks/:id/status` in a polling loop

### Asana / Monday.com
- On task creation in Asana/Monday, call POST `/v1/tasks` with the item title + chosen skill
- Store returned `task_id` in a custom field on the Asana/Monday item

### Python snippet
```python
import requests

BASE = "http://54.167.31.169:3000/v1"
HEADERS = {"Authorization": "Bearer your-key", "Content-Type": "application/json"}

# Create + run in one flow
task = requests.post(f"{BASE}/tasks", json={
    "workspace_id": 2,
    "title": "Write landing page copy for AI agency tool",
    "skill_key": "mkt_landing_copy"
}, headers=HEADERS).json()

run = requests.post(f"{BASE}/tasks/{task['task_id']}/run", json={
    "workspace_id": 2, "skill_key": "mkt_landing_copy"
}, headers=HEADERS).json()

print(f"Run created: {run['run_id']} | Agent: {run['agent_name']}")
```

---

## Environment variables

| Variable | Default | Notes |
|----------|---------|-------|
| `API_KEYS` | `` (empty) | Comma-separated bearer tokens for /v1 auth |
| `REQUIRE_AUTH` | `false` | Set `true` in production |

---

## Files

| File | Purpose |
|------|---------|
| `backend/src/routes/agent-api.js` | All /v1 route handlers |
| `backend/src/app.js` | Mounts /v1 before /api |
| `scripts/test-agent-api.sh` | 10-point test suite |
| `docs/agent-api.md` | This file |
