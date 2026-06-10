# Architecture Guide

## Control plane (core)

- **Backend:** Express, routes under `backend/src/routes`
- **DB:** PostgreSQL with migrations in `backend/db/migrations`
- **Frontend:** React admin under `frontend/src`
- **Queues:** Redis/BullMQ (planned; not operational in MVP)
- **Observability:** structured logs; add exporters later

## PM layer (Plane CE) — `feature/plane-pm-integration`

Optional **pm-bridge** connects the control plane to self-hosted **Plane CE** via REST + webhooks. Plane does **not** replace governance (skills, agents, approvals, credits); it is the project-management layer for work items.

```
React Admin UI (:3001)     Express API (:3000)     Plane CE (:8083)
        │                         │                      │
        └──────── REST ───────────┘                      │
                                  ├── pm-bridge ────────▶│ REST (projects, work-items)
                                  └── /webhooks/plane ◀──│ webhooks (work item events)
```

| Component | Location |
|-----------|----------|
| PlaneBridge client | `backend/src/services/pm-bridge/` |
| PM API routes | `backend/src/routes/pm.js` |
| Webhook receiver | `backend/src/routes/webhooks.js` |
| Auto-sync on route | `backend/src/routes/routing.js` |
| Plane Docker stack | `docker-compose-plane.yml` (separate Postgres, RabbitMQ, Redis, MinIO) |
| Shared Docker network | `plane-net` — backend joins it to reach `plane-proxy:80` |

Detail: [plane-integration.md](plane-integration.md)
