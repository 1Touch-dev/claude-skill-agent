# Enterprise Claude Skills Platform

A multi-tenant **AI control plane** for governing Claude Skills, agents, department suites, industry overlays, licensing, metering, and audit across enterprise workspaces.

> **Status:** v1 foundation — demoable locally, not yet production-ready.  
> See [docs/HANDBOOK_GAP_ANALYSIS.md](docs/HANDBOOK_GAP_ANALYSIS.md) for full requirement coverage.

---

## What This Is

This is **not** a task manager or a prompt library. It is an enterprise AI work orchestration platform that lets organizations:

- Register and govern **Claude Skills** as licensed product units
- Bundle skills into **department suites** and **industry overlays**
- Assign skills to **AI agents** with defined permissions and autonomy
- Control access by **workspace**, **customer**, **entitlement**, and **risk tier**
- **Meter usage** through skill credits and subscription tiers
- Enforce **security review**, **quarantine**, and **audit logging**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Frontend | React 17 (admin UI) |
| Database | PostgreSQL 13+ |
| Cache / Queue | Redis + BullMQ (deps present, workers not yet operational) |
| Container | Docker Compose (optional) |

---

## Project Structure

```
Cloude-Skills-agents/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express app (exported for tests)
│   │   ├── index.js            # Server entry point
│   │   ├── routes/             # API route modules
│   │   └── lib/                # DB pool, metering
│   ├── db/migrations/          # PostgreSQL schema (0002–0007)
│   ├── scripts/migrate.js      # Migration runner
│   └── tests/                  # Jest + Supertest
├── frontend/
│   ├── src/
│   │   ├── pages/              # Admin list/report pages
│   │   ├── components/         # Nav, Header, AdminGuard
│   │   └── lib/api.js          # API client
│   └── public/index.html
├── docs/                       # Setup, architecture, gap analysis
├── memory/                     # Project context, progress, decisions
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## Quick Start (Native — Windows / macOS / Linux)

### Prerequisites

- Node.js 18+
- PostgreSQL 13+ (running locally)
- Redis 6+ (optional for now)

### 1. Environment

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Edit `.env` — set your Postgres port if not default (`PGPORT=5434` on some Windows installs).

### 2. Database

```bash
# Create database (once)
psql -U postgres -c "CREATE DATABASE enterprise_skills;"

# Run migrations + demo seed
cd backend
npm install
npm run migrate
```

### 3. Backend (port 3000)

```bash
cd backend
npm run dev
# → Backend running on port 3000
```

### 4. Frontend (port 3001)

```bash
cd frontend
npm install
npm start
# → http://localhost:3001
```

**Login:** use `ADMIN_TOKEN` from `.env` (default: `changeme`)

### Health Check

```
GET http://localhost:3000/health/live
→ { "status": "ok", "live": true }
```

---

## Quick Start (Docker)

```bash
cp .env.example .env
# On EC2: set PUBLIC_API_URL and PUBLIC_UI_URL to your instance public IP/DNS
docker compose up --build
```

- **Local:** API http://localhost:3000 — Admin UI http://localhost:3001  
- **EC2 / remote:** open `http://<public-ip>:3001` — the UI calls `http://<public-ip>:3000` (set `PUBLIC_API_URL` in `.env` or rely on auto hostname detection). Ensure security group allows inbound **3000** and **3001**.

---

## Implemented Modules

| Module | Backend API | Admin UI | Status |
|--------|------------|----------|--------|
| Skill Registry | ✅ | ✅ | Working |
| Skill Packages | ✅ | ✅ | Working |
| Department Suites | ✅ | ✅ | Working |
| Industry Overlays | ✅ | ✅ | Working |
| Customers & Workspaces | ✅ | ✅ | Working |
| Entitlements & Licensing | ✅ | ✅ | Working |
| Credit Pools & Metering | ✅ | ✅ | Working |
| Agent Profiles | ✅ | ✅ | Working |
| Skill Runs & Audit | ✅ | ✅ | Working |
| Security (pin/review/quarantine) | ✅ | — | API only |
| Reports & Analytics | ✅ | ✅ | Working |
| Task Intake & Routing | ✅ | — | API only |
| Approvals Queue | — | ⚠️ | UI exists, no API yet |
| Auth / RBAC | — | ⚠️ | Token-only (localStorage) |
| External Integrations | — | — | Not started |
| Background Workers | — | — | Not started |
| Knowledge / Search / RAG | — | — | Not started |

---

## API Overview

All routes are prefixed with `/api` unless noted.

### Registry
```
GET/POST/PUT/DELETE  /api/skills
GET/POST/PUT/DELETE  /api/packages
GET/POST/PUT/DELETE  /api/sources
```

### Suites & Overlays
```
GET/POST/PUT/DELETE  /api/suites
GET/POST/PUT/DELETE  /api/overlays
POST                 /api/suites/:id/skills
POST                 /api/overlays/:id/skills
POST                 /api/activation/suites/workspace
POST                 /api/activation/overlays/workspace
```

### Commercial
```
GET/POST             /api/customers
GET/POST             /api/workspaces
GET/POST             /api/plans
GET/POST             /api/subscriptions
GET/POST             /api/entitlements
GET/POST             /api/credit-pools
GET                  /api/activation/workspace/:id
```

### Agents, Tasks & Routing
```
GET/POST/PUT/DELETE  /api/agents
GET/POST/PUT/DELETE  /api/tasks
POST                 /api/route
POST                 /api/route/apply
```

### Runs & Audit
```
GET/POST             /api/runs
POST                 /api/runs/:id/state
POST                 /api/runs/:id/audit
POST                 /api/runs/:id/charge
GET                  /api/runs/:id/audit
```

### Security
```
POST                 /api/security/skills/:id/pin
POST                 /api/security/skills/:id/scan
POST                 /api/security/skills/:id/review
POST                 /api/security/skills/:id/quarantine
GET                  /api/security/skills/:id/activation-check
```

### Reports
```
GET  /api/reports/credits/summary
GET  /api/reports/usage/workspace/:id
GET  /api/reports/adoption
GET  /api/reports/agents/utilization
GET  /api/reports/governance
GET  /api/reports/billing
GET  /api/reports/cross-sell
```

### Health
```
GET  /health/live
GET  /health/ready
```

---

## Admin UI Pages

| Page | Route | Data Source |
|------|-------|-------------|
| Dashboard | `/` | Static welcome |
| Skills | `/skills` | `/api/skills` |
| Packages | `/packages` | `/api/packages` |
| Suites | `/suites` | `/api/suites` |
| Overlays | `/overlays` | `/api/overlays` |
| Customers | `/customers` | `/api/customers` |
| Workspaces | `/workspaces` | `/api/workspaces` |
| Entitlements | `/entitlements` | `/api/entitlements` |
| Credit Pools | `/credit-pools` | `/api/credit-pools` |
| Agents | `/agents` | `/api/agents` |
| Runs | `/runs` | `/api/runs` |
| Approvals | `/approvals` | ⚠️ No API yet |
| Audit Logs | `/audit` | `/api/runs/:id/audit` |
| Reports | `/reports` | `/api/reports/*` |

---

## Database Migrations

| File | Contents |
|------|----------|
| `0002_skill_registry.sql` | Skills, sources, packages, lifecycle enums |
| `0003_department_suites_overlays.sql` | Suites, overlays, overlay-suite mappings |
| `0004_commercial.sql` | Customers, workspaces, plans, subscriptions, entitlements, credit pools |
| `0005_routing.sql` | Agent profiles, task intake, routing tables |
| `0005_skill_runs_audit.sql` | Skill runs, audit logs, usage charges |
| `0006_security.sql` | Security metadata, scan history, trust/review fields |
| `0007_demo_seed.sql` | Demo skills, suites, customers, agents, sample runs |

Run all: `cd backend && npm run migrate`

---

## Testing

```bash
cd backend
npm test
```

Covers: health endpoint, reports routes, governance presence (mocked DB).

---

## Roadmap / Deferred

See [docs/DEFERRED_ITEMS.md](docs/DEFERRED_ITEMS.md) and [docs/HANDBOOK_GAP_ANALYSIS.md](docs/HANDBOOK_GAP_ANALYSIS.md).

**Next priorities:**
1. Real auth + API RBAC
2. Approvals workflow API + queue
3. Background workers (Redis/BullMQ)
4. External integrations (GitHub, Slack, Asana)
5. Knowledge search + brand voice RAG
6. Reporting charts + CSV export

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/SETUP.md](docs/SETUP.md) | Install and run |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | First-time orientation |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System overview |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Running in production |
| [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) | Pre-release checks |
| [docs/HANDBOOK_GAP_ANALYSIS.md](docs/HANDBOOK_GAP_ANALYSIS.md) | Requirements vs implementation |
| [docs/DEFERRED_ITEMS.md](docs/DEFERRED_ITEMS.md) | Known gaps and next issues |
| [docs/PR_SUMMARY.md](docs/PR_SUMMARY.md) | v1 foundation PR summary |

---

## License

MIT
