# Enterprise Claude Skills Platform — June 10, 2026

**Last updated:** June 10, 2026  
**Author:** Abhishek / engineering

---

## Status: PM Platform Decision

### Background (WhatsApp thread 04/06 – 10/06)

| Date | Event |
|------|-------|
| 04/06 | Abhishek sent James feasibility assessment: Worksuite is viable PM layer candidate; Taskly API unclear; neither replaces our governance platform |
| 08/06 | James opened 3 options: (1) Worksuite — code sent, (2) multi-agentic system builds PM core, (3) test open-source PM tools |
| 09/06 | James sent AppFlowy Instagram post (72K GitHub stars, AGPL-3.0, Dart/Rust, open-source Notion) |
| 10/06 | James sent 5 GitHub repos + Instagram + asked for next steps |

### Worksuite Source Inspection (v6.0.09)

James sent `Worksuite SaaS Project Management.zip` (87MB). Inspected at `/home/ubuntu/claude-skill-agent/`. Key findings:

| Finding | Impact |
|---------|--------|
| Laravel 12, PHP 8.2, Sanctum 4.0 | Cross-stack PHP vs our Node |
| `froiden/laravel-rest-api ^13.0.0` — **already in vendor** | No separate module purchase needed for REST framework |
| 1,701 PHP files, 326 migrations | Very large mature codebase |
| All PM models present (Project, Task, SubTask, TaskComment, etc.) | Full PM domain |
| `Modules/` folder **empty** | Add-on modules sold separately |
| Slack via `SlackSetting.slack_webhook` per company — **built-in** | Basic Slack notifications work |
| Outbound project/task webhooks — **NOT in zip** | Still sold separately |
| routes/api.php has only 1 stub route | REST controllers need building (but low-code with bundled package) |

### The 5 GitHub Repos James Shared (Assessment)

| Repo | Stars | Verdict |
|------|-------|---------|
| neuraparse/taskNebula | 33 | Too small — personal project |
| rasimme/FlowBoard | 73 | AI agent workspaces (interesting concept, not PM) |
| rdsthomas/mission-control | 20 | Toy project |
| Traves-Theberge/Orchestra | 25 | Desktop IDE tool |
| tcarac/taskboard | 14 | Local-only SQLite, MCP server concept |

**None are production-ready. Do not use as PM foundation.**

### AppFlowy (James Instagram post)

- 72K GitHub stars, AGPL-3.0, Dart/Rust
- Notion-like wiki/doc tool, not a traditional PM system
- Wrong stack for integration (Dart/Rust vs Node/React)
- **Pass** — not suitable

### Plane (Not shared by James but strongest open-source candidate)

- **50K stars**, TypeScript + React + Python/Django + PostgreSQL
- Full documented REST API: `X-API-Key` auth
- Webhooks on **every** event
- **Native GitHub + GitLab + Slack integrations** — no add-ons
- AGPL-3.0 (safe if we don't modify source — Strategy A)
- Free, unlimited users, self-hosted via Docker
- PM-only (no HR/CRM bloat)

---

## Recommendation (Updated)

**Recommended Option: Plane (Strategy A)**

Run Plane as a separate Docker service on EC2. Connect via REST API + webhooks from our Node `pm-bridge` service. Never modify Plane source → no AGPL obligation.

**Fallback:** Worksuite (code in hand, paid Extended license needed for SaaS charging, REST controllers buildable with bundled package).

**Option 2 (multi-agentic build):** Use our own AI agents to accelerate building PM tables/routes in-house — fully viable, 8–10 weeks.

---

## Immediate Next Steps

### Week 1–2: Plane Integration Spike

| Task | Notes |
|------|-------|
| Deploy Plane CE on EC2 (Docker Compose) | Separate port e.g. 8080 |
| Scaffold `backend/src/services/pm-bridge/` | Node service |
| Map one workspace → Plane project | `POST /api/v1/workspaces/{slug}/projects/` |
| Map one `task_intake` row → Plane Work Item | Include `run_id` in metadata |
| Receive one Plane webhook → update `task_routes` | Webhook handler in pm-bridge |
| **Report to James** | Go / No-Go for full integration |

### Also in progress

- Sprint 2: Live GitHub connector (from memory/4th_June.md)
- SSO groundwork (deferred from MVP)

---

## Key Files

| Path | Purpose |
|------|---------|
| `docs/pm-platform-feasibility-study.md` | Full updated study with source inspection evidence |
| `Worksuite SaaS Project Management.zip` | Source code James sent (in repo root) |
| `memory/2nd_June.md` | Full original requirements |
| `memory/3rd_June.md` | MVP completion |
| `memory/4th_June.md` | Sprint 2 plan |
| `docs/mvp-known-limitations.md` | MVP PM layer still listed as missing |
