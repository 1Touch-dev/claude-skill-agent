# Plane CE Integration — PM Bridge

**Status:** Spike complete — code implemented, tests passing  
**Branch:** `feature/plane-pm-integration`  
**Date:** June 10, 2026

---

## Overview

The **pm-bridge** connects the Enterprise Claude Skills Platform (Node/Express/Postgres) to **Plane CE** (open-source PM, [plane.so](https://plane.so)) via REST API and webhooks.

```
Claude Skills Control Plane          Plane CE
(Node/Express :3000)                 (React/Django :8083)
        │
        ├── POST /api/pm/workspaces/:id/sync ──────────▶ Create Plane Project
        ├── POST /api/pm/tasks/:id/sync ───────────────▶ Create Plane Work Item
        ├── POST /api/route/apply (auto) ──────────────▶ Create Plane Work Item
        │
        └── POST /webhooks/plane ◀────────────────────── Plane Webhook Events
              └── issue_updated → UPDATE task_intake.status
```

---

## File Structure

```
backend/src/
  services/pm-bridge/
    config.js         Reads PLANE_* env vars
    index.js          PlaneBridge REST client (no dependencies)
  routes/
    pm.js             /api/pm/* endpoints
    webhooks.js       /webhooks/plane receiver
backend/db/migrations/
  0009_pm_bridge.sql  Adds plane_* columns + webhook event table
docker-compose-plane.yml   Plane CE Docker stack (port 8083)
scripts/
  plane-setup.sh      Bootstrap Plane and print .env values
  test-pm-integration.sh  E2E test suite (11/12 passing)
docs/
  plane-integration.md  (this file)
```

---

## Quick Start

### 1. Start Plane CE

```bash
# Start Plane alongside existing stack
docker compose -f docker-compose-plane.yml up -d

# Wait ~60s then run the setup script
bash scripts/plane-setup.sh
```

The script will:
- Create the admin user
- Create the workspace
- Generate an API token
- Print the values to add to `.env`

### 2. Configure `.env`

```env
PLANE_API_URL=http://54.167.31.169:8083
PLANE_API_TOKEN=<token from setup script>
PLANE_WORKSPACE_SLUG=claude-skills
PLANE_WEBHOOK_SECRET=<optional — set in Plane Settings → Webhooks>
```

### 3. Restart backend

```bash
docker compose up -d --build backend
```

### 4. Test

```bash
bash scripts/test-pm-integration.sh http://localhost:3000
# Expected: 12/12 pass (with Plane running)
```

---

## API Reference

All `/api/pm/*` endpoints require `Authorization: Bearer <token>` header.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/pm/ping` | Test Plane connectivity |
| `GET`  | `/api/pm/projects` | List all Plane projects |
| `POST` | `/api/pm/workspaces/:id/sync` | Create Plane project for workspace |
| `GET`  | `/api/pm/workspaces/:id/status` | Get Plane sync status for workspace |
| `POST` | `/api/pm/tasks/:id/sync` | Push task to Plane Work Item |
| `GET`  | `/api/pm/tasks/:id/status` | Get Plane issue for task |
| `POST` | `/webhooks/plane` | Receive Plane webhook (no auth — add IP allowlist in prod) |

### Example: Sync workspace

```bash
curl -X POST http://54.167.31.169:3000/api/pm/workspaces/2/sync \
  -H "Authorization: Bearer changeme"
# → { "synced": true, "plane_project_id": "...", "plane_project": { ... } }
```

### Example: Ping

```bash
curl -X POST http://54.167.31.169:3000/api/pm/ping \
  -H "Authorization: Bearer changeme"
# → { "ok": true, "plane_enabled": true, "workspace": { ... } }
# or (not configured):
# → { "ok": false, "plane_enabled": false, "message": "..." }
```

---

## Auto-sync on Route/Apply

When `POST /api/route/apply` creates a route+run, the pm-bridge **automatically**:

1. Ensures the workspace has a Plane project (creates one if absent).
2. Creates a Plane Work Item with the task title, priority (from risk_tier), and metadata JSON containing `control_plane_task_id`, `run_id`, `skill_key`.
3. Persists `plane_issue_id` on `task_intake`.

This runs **fire-and-forget** (`setImmediate`) so routing latency is unaffected if Plane is slow or down.

---

## Webhook Flow

Register in Plane:
**Settings → Webhooks → URL:** `http://54.167.31.169:3000/webhooks/plane`

Events handled:

| Plane event | Our action |
|-------------|-----------|
| `issue_updated` | Map state group → `task_intake.status` (queued/running/completed/failed) |
| `issue_deleted` | Clear `plane_issue_id` from `task_intake` |

All events are stored in `plane_webhook_events` for audit.

---

## Database Changes

```sql
-- workspaces
plane_project_id         TEXT   -- Plane project UUID
plane_project_identifier TEXT   -- e.g. "WS0002"

-- task_intake
plane_issue_id           TEXT   -- Plane issue UUID
plane_issue_sequence_id  INT    -- Human-readable sequence number

-- new table
plane_webhook_events (
  id, event_type, payload JSONB, plane_issue_id, task_id, processed_at
)
```

---

## Entity Mapping

| Our entity | Plane entity | Sync direction |
|-----------|--------------|----------------|
| Workspace | Project | Our → Plane (auto on route/apply) |
| task_intake | Work Item (Issue) | Our → Plane (auto on route/apply) |
| risk_tier | Priority (low/medium/high/urgent) | Our → Plane |
| task.status | State group | Plane → Ours (via webhook) |
| Agent profile | Assignee (future) | Manual mapping |
| Approval gate | Label (future) | Manual |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PLANE_API_URL` | Yes | Base URL e.g. `http://54.167.31.169:8083` |
| `PLANE_API_TOKEN` | Yes | API token from Plane Settings |
| `PLANE_WORKSPACE_SLUG` | Yes | Workspace slug from Plane |
| `PLANE_WEBHOOK_SECRET` | No | HMAC secret for webhook verification |
| `PLANE_TIMEOUT_MS` | No | API request timeout (default 8000ms) |

If `PLANE_API_TOKEN` or `PLANE_WORKSPACE_SLUG` is empty, all pm-bridge calls return `503 plane_not_configured` — **the rest of the platform continues working normally**.

---

## Plane CE — Ports and Services

| Service | Port | Description |
|---------|------|-------------|
| Plane UI | `:8083` | Web interface (via Nginx proxy) |
| Plane API | `:8083/api/v1/` | REST API |
| MinIO console | `:9090` (internal) | File storage |
| Plane Postgres | internal | Separate from our Postgres |
| Plane Redis | internal | Separate from our Redis |

---

## Production Checklist

- [ ] Change `PLANE_SECRET_KEY` in `.env` / `docker-compose-plane.yml`
- [ ] Change default admin password (`PLANE_ADMIN_PASSWORD`)
- [ ] Set `PLANE_WEBHOOK_SECRET` and configure in Plane Settings
- [ ] Add IP/token authentication on `/webhooks/plane`
- [ ] Set up Plane GitHub + Slack integrations via Plane Settings
- [ ] Consider Nginx reverse proxy to unify domains
- [ ] Add Plane services to backup rotation

---

## Testing

```bash
# With Plane running (all 12 tests pass)
bash scripts/test-pm-integration.sh http://localhost:3000

# Without Plane (11/12 pass, 1 skipped — expected)
ADMIN_TOKEN=changeme bash scripts/test-pm-integration.sh http://localhost:3000
```

Test coverage:
- T01: API health
- T02: Plane ping (skip if not configured)
- T03: Graceful 503 when Plane not configured
- T04: Workspace seeding
- T05: Workspace PM status endpoint
- T06: Workspace → Plane project sync
- T07: task_intake creation
- T08: Task PM status before sync
- T09: Task → Plane Work Item sync
- T10: Route/apply auto-sync trigger
- T11: Webhook receiver
- T12: Health after webhook (crash safety)
