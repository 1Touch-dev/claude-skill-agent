# Operations Runbook — Claude Skills Platform + Plane CE

**Version:** 1.0 · **Updated:** June 2026  
**Branch:** `feature/plane-pm-integration`  
**Author:** Engineering team

---

## Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Platform admin UI | http://54.167.31.169:3001 | Task intake, routing, agents, approvals |
| Platform API | http://54.167.31.169:3000 | REST API (used internally) |
| Plane CE (PM) | http://54.167.31.169:8083 | Project boards, work items, roadmaps |

---

## 1. Starting the Stack

**One command to start everything:**

```bash
bash scripts/start.sh
```

This will:
1. Create the `plane-net` Docker network if missing
2. Start Plane CE (PostgreSQL, RabbitMQ, Redis, MinIO, API, frontend, proxy)
3. Start the core platform (backend, frontend, PostgreSQL, Redis)
4. Wait for all 4 health checks to turn green
5. Print the live URLs

**Start platform only (no Plane):**
```bash
bash scripts/start.sh --no-plane
```

**Rebuild images then start (after code changes):**
```bash
bash scripts/start.sh --rebuild
```

---

## 2. Stopping the Stack

**Stop everything:**
```bash
bash scripts/stop.sh
```

**Stop Plane only (keep platform running):**
```bash
bash scripts/stop.sh --plane-only
```

**Stop platform only (keep Plane running):**
```bash
bash scripts/stop.sh --platform-only
```

> ⚠️  `--volumes` flag deletes all data permanently. Never use in production without a backup.

---

## 3. Health Check

**Instant dashboard:**
```bash
bash scripts/status.sh
```

Output shows:
- All container statuses
- HTTP checks for Platform API, Platform UI, Plane UI, PM bridge
- Task count and how many are synced to Plane

**Manual checks:**
```bash
# Platform API alive
curl http://54.167.31.169:3000/health/live

# PM bridge connected to Plane
curl -s -X POST http://54.167.31.169:3000/api/pm/ping \
  -H "Authorization: Bearer changeme"

# Run full integration test suite (12 tests)
bash scripts/test-pm-integration.sh http://localhost:3000
```

---

## 4. Day-to-Day Workflow

### Creating a task (from the admin UI)

1. Open http://54.167.31.169:3001 and log in
2. Click **Routing Demo** in the left nav
3. Fill in: Workspace ID, Title, Skill key
4. Click **Create Task** → task appears in the **Recent Tasks** table
5. Click **Route & Apply** on the task row
6. Within 2–3 seconds the **✈ badge** appears in the PM column — that's the Plane work item

### Viewing tasks with PM status

1. Click **Tasks** in the left nav
2. Table shows all tasks with a **PM Status (Plane)** column
3. Tasks synced to Plane show `✈ #N Open in Plane →` (click to open in Plane)
4. Filter by **Synced / Not synced** using the tabs at the top

### Viewing / updating work in Plane

1. Open http://54.167.31.169:8083
2. Log in with `admin@planepmsystem.local` (password in `.env`)
3. Navigate to **Claude Skills Platform** → **Globex Main** project → **Issues**
4. Work items map 1:1 to tasks created through our platform
5. Updating a work item state in Plane (e.g. "In Progress" → "Done") fires a webhook
6. The webhook updates `task_intake.status` in our platform automatically

---

## 5. Credentials

All credentials live in `.env` (gitignored — never commit it).

| What | Env var | Notes |
|------|---------|-------|
| Platform admin token | `ADMIN_TOKEN` | Used as `Authorization: Bearer <token>` |
| Plane admin email | `PLANE_ADMIN_EMAIL` | For Plane UI login |
| Plane admin password | `PLANE_ADMIN_PASSWORD` | For Plane UI login |
| Plane API token | `PLANE_API_TOKEN` | Used by pm-bridge to call Plane API |
| Plane webhook secret | `PLANE_WEBHOOK_SECRET` | Validates incoming Plane webhooks |
| Plane secret key | `PLANE_SECRET_KEY` | Django signing key — rotate if compromised |

### Rotating passwords

**Rotate Plane admin password:**
```bash
# 1. Generate new password
NEW_PASS=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9@#!' | head -c 20)
echo "New password: $NEW_PASS"

# 2. Update in .env
sed -i "s/PLANE_ADMIN_PASSWORD=.*/PLANE_ADMIN_PASSWORD=$NEW_PASS/" .env

# 3. Apply in Django
docker exec claude-skill-agent-api-1 python3 -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','plane.settings.production')
django.setup()
from django.contrib.auth import get_user_model
u = get_user_model().objects.get(email='admin@planepmsystem.local')
u.set_password('$NEW_PASS')
u.save()
print('Done')
"
```

**Rotate Plane secret key:**
```bash
NEW_KEY=$(openssl rand -hex 32)
sed -i "s/PLANE_SECRET_KEY=.*/PLANE_SECRET_KEY=$NEW_KEY/" .env
bash scripts/stop.sh --plane-only
bash scripts/start.sh   # full restart
```

---

## 6. Logs

```bash
# Platform backend
docker compose logs --tail=50 -f backend

# Plane API
docker compose -f docker-compose-plane.yml logs --tail=50 -f api

# Plane worker (task processing)
docker compose -f docker-compose-plane.yml logs --tail=50 -f plane-worker

# All platform logs
docker compose logs --tail=50 -f

# All Plane logs
docker compose -f docker-compose-plane.yml logs --tail=50 -f
```

---

## 7. Troubleshooting

### PM badge not appearing after routing

The Plane issue is created fire-and-forget. Wait 2–3 seconds and click **↻ Refresh** on the Tasks page.

If still missing:
```bash
# Check pm-bridge can reach Plane
curl -s -X POST http://localhost:3000/api/pm/ping \
  -H "Authorization: Bearer changeme"

# Manually trigger sync for workspace 2
curl -s -X POST http://localhost:3000/api/pm/projects \
  -H "Authorization: Bearer changeme" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id": 2}'
```

### Plane UI not loading (502)

Plane API (gunicorn) takes ~25s to start after a restart. Wait and retry. Check:
```bash
docker compose -f docker-compose-plane.yml logs api --tail=20
```
Look for `[INFO] Booting worker with pid` — that confirms gunicorn is ready.

### Backend can't reach Plane (EAI_AGAIN plane-proxy)

The backend must be on the `plane-net` Docker network. Fix:
```bash
bash scripts/stop.sh
bash scripts/start.sh  # start.sh uses both compose files together
```

### Webhook not firing

1. Check Plane UI → Settings → Webhooks — confirm webhook is active
2. Verify `PLANE_WEBHOOK_SECRET` in `.env` matches what's registered in Plane
3. Check backend logs for incoming webhook requests:
   ```bash
   docker compose logs backend --tail=50 | grep -i webhook
   ```

### Webhook returns 403 ip_not_allowed

`PLANE_WEBHOOK_ALLOWED_IPS` is set and the inbound IP is not in the list.

Fix options:
- Add Plane's egress IP to the list: `PLANE_WEBHOOK_ALLOWED_IPS=127.0.0.1,54.167.31.169,172.18.0.0/16`
- Clear the var to allow all (dev): `PLANE_WEBHOOK_ALLOWED_IPS=` (empty value)
- Check the rejected IP in backend logs: `docker compose logs backend | grep "rejected IP"`

Restart backend after changing `.env`:
```bash
docker compose up -d --no-deps --force-recreate backend
```

### Plane work item has no assignee after routing

The agent's Plane member mapping may not be set. To map an agent:

**Via the Agents page (UI):**
1. Open http://54.167.31.169:3001 → **Agents** in the left nav
2. The **Plane Member** column shows a dropdown of Plane workspace members
3. Select the desired member for each agent and click **Save**

**Via API:**
```bash
# 1. List Plane members
curl -s http://localhost:3000/api/pm/members \
  -H "Authorization: Bearer changeme" | python3 -m json.tool

# 2. Map globex-agent (id=2) to a member UUID
curl -s -X PUT http://localhost:3000/api/agents/2/plane-member \
  -H "Authorization: Bearer changeme" \
  -H "Content-Type: application/json" \
  -d '{"plane_member_id":"<uuid-from-step-1>","plane_member_email":"admin@planepmsystem.local"}'

# 3. Verify
curl -s http://localhost:3000/api/agents/2/plane-member \
  -H "Authorization: Bearer changeme"
```

**Via SQL (emergency):**
```bash
docker exec -it claude-skill-agent-backend-db-1 psql -U postgres enterprise_skills \
  -c "UPDATE agent_profiles SET plane_member_id='<uuid>' WHERE id=2;"
```

After mapping, the next task routed to that agent will be auto-assigned in Plane.

### Containers down after EC2 reboot

All containers have `restart: unless-stopped` — they auto-restart. If they don't:
```bash
bash scripts/start.sh
```

---

## 8. Architecture Summary

```
Our platform (governance)         Plane CE (PM layer)
:3001 UI  :3000 API               :8083 UI/API
     │         │                         │
     │         ├── pm-bridge REST ──────▶ projects, work-items
     │         └── /webhooks/plane ◀───── work item events
```

**Platform owns:** skills, agents, approvals, routing, credits, audit, task governance  
**Plane owns:** project boards, work items, sprints, roadmaps, GitHub/Slack integrations

If Plane is down, the platform continues normally — only PM-specific endpoints return 503.

---

## 9. Useful One-Liners

```bash
# How many tasks are synced to Plane?
bash scripts/status.sh | grep "Synced to Plane"

# List all containers and their uptime
docker compose -f docker-compose.yml -f docker-compose-plane.yml ps

# Tail all logs in one stream
docker compose -f docker-compose.yml -f docker-compose-plane.yml logs -f

# Force-recreate the backend (after a code change without --rebuild)
docker compose up -d --no-deps --force-recreate backend

# Open a Django shell on Plane
docker exec -it claude-skill-agent-api-1 python3 -c \
  "import django,os; os.environ['DJANGO_SETTINGS_MODULE']='plane.settings.production'; django.setup(); import code; code.interact(local=locals())"
```
