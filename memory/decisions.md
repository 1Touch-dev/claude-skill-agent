MANDATORY BEFORE STARTING:

1. Read /memory/project_context.md
2. Read /memory/architecture.md
3. Read /memory/progress.md
4. Read /memory/decisions.md
5. Understand current system state
6. Do NOT break existing architecture
7. Follow the tech stack and module boundaries already established

MANDATORY AFTER COMPLETION:

1. Update /memory/progress.md
2. Update /memory/decisions.md
3. Add what was built
4. Add decisions made
5. Add API/contracts/schema changes
6. Add env/config added or changed
7. Add next recommended issue

---

# Decisions
- Use Node.js and Express for backend due to familiarity and ecosystem support
- Use React for frontend to leverage component-based architecture
- Choose PostgreSQL for its reliability and feature set
- Use Redis and BullMQ for efficient caching and queue management
- Docker Compose for consistent local development environment
\n## [2026-05-26T09:11:24Z] THU-28 Decisions\n- Store tool_calls and approvals as JSONB on skill_runs for fast retrieval.\n- Output stored as SHA-256 hash only to avoid heavy payloads; raw output remains external.\n- Usage charges recorded per run, linked to active credit pool when present; pools accumulate consumed/overage.\n- Minimal cohesive API surface for create/update/audit/charge to keep module boundaries clear.\n
\n## [2026-05-26T10:24:46Z] THU-30 Decisions\n- Store scan history in security_scans and latest summary on skills.\n- Activation blocked when quarantined, unreviewed, or unpinned; scripted skills require sandbox unless trusted.\n- Kept checks server-side for consistent enforcement across UIs.\n
\n## [2026-05-26T10:38:20Z] THU-31 Decisions\n- Kept UI minimal (table-based) and leveraged existing backend endpoints to reduce complexity.\n- Route protection is client-side token only; follow-up to integrate real auth.\n- Approvals list consumes /api/approvals if available; surfaces errors cleanly if endpoint is absent.\n
\n## [2026-05-26T10:46:57Z] THU-32 Decisions\n- Keep aggregation in SQL for performance and exportability.\n- Governance signals read from audit_logs events to avoid tight coupling to approval tables.\n- Cross-sell insights based on overlay_suites + active workspace assignments.\n
\n## [2026-05-26T10:54:11Z] THU-33 Decisions\n- Implemented seeding as an idempotent migration to keep environments consistent.\n- Used ON CONFLICT/WHERE NOT EXISTS guards to allow re-runs safely.\n- Minimal demo run+usage seeded to light up reporting/ledgers without heavy data volume.\n
\n## [2026-05-26T11:06:18Z] THU-34 Decisions\n- Avoided DB-coupled tests; used mocked pool to keep unit/integration portable.\n- Introduced app.js to enable route-level testing without a server.\n- Deferred real auth, escalation workers, and charting to DEFERRED_ITEMS.md.\n

## [2026-05-28] Gap-Assessment Decisions
- Use handbook-aligned status tiers (`Implemented`, `Partial`, `Missing`) for roadmap communication.
- Treat current codebase as a control-plane foundation, not a finished enterprise platform.
- Prioritize next milestones in order: auth/RBAC, approvals workflow, workers/runtime, integrations, then knowledge/search depth.

## [2026-06-01T17:15:00Z] MON-01 Decisions
- Integrate third-party credentials catalog (Asana, Monday.com, GitHub, Slack) inside the database connections layer using a dedicated migration table `integration_connections`.
- Model human-in-the-loop compliance reviews using an `approval_gates` table, exposing `/api/approvals` GET and POST decide API, completely resolving the approvals dashboard queue page.
- Clean up macOS metadata filesystem junk files (`._*`) during executions to avoid cluttering git commits and Jest test runs.
- Commit lockfiles updates following dependency installation to keep baseline locked versions consistent.

## [2026-06-02T12:30:00Z] TUE-02 Decisions
- Deploy the entire application stack using Docker Compose to ensure consistency across staging and production.
- Refactor backend and frontend folders to include production Dockerfiles using lightweight node:18-alpine bases.
- Inject private API tokens securely in docker-compose.yml by utilizing standard compose environment variable placeholders (resolving GITHUB_TOKEN and GH_TOKEN dynamically from the ignored .env file), ensuring secrets are never checked in to git history.
- Map the frontend's api base endpoint to the public IP of the remote AWS EC2 instance, enabling client browsers to contact the backend over the network.


