# Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker (recommended for compose + Plane CE)

## Platform (control plane)

### Environment

```bash
cp .env.example .env
# Edit PUBLIC_API_URL, PUBLIC_UI_URL for your host
```

### Docker (recommended)

```bash
git checkout feature/plane-pm-integration
docker compose up -d --build
docker compose exec backend npm run migrate
```

- UI: http://localhost:3001  
- API: http://localhost:3000  

### Native

```bash
cp frontend/.env.example frontend/.env
cd backend && npm install && npm run migrate && npm start
cd frontend && npm install && npm start
```

## Plane CE (optional PM layer)

Requires branch `feature/plane-pm-integration`.

```bash
# One-time: shared Docker network
docker network create plane-net

# Start Plane (API, web, worker, RabbitMQ, Postgres, MinIO, proxy on :8083)
docker compose -f docker-compose-plane.yml up -d

# Wait ~60s, then bootstrap
bash scripts/plane-setup.sh
```

Copy printed values into `.env`:

```env
PLANE_API_URL=http://plane-proxy:80
PLANE_API_TOKEN=<from setup script>
PLANE_WORKSPACE_SLUG=claude-skills
PLANE_WEBHOOK_SECRET=<from Plane Settings → Webhooks after registration>
```

Restart backend and test:

```bash
docker compose up -d --build backend
bash scripts/test-pm-integration.sh http://localhost:3000
```

Register webhook in Plane UI: **Settings → Webhooks** → `http://<your-host>:3000/webhooks/plane` (Work items events).

Full reference: [plane-integration.md](plane-integration.md)

## EC2 ports

Open inbound: **3000** (API), **3001** (UI), **8083** (Plane UI/API proxy).
