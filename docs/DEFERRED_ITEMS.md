# Deferred Items / Next Issues

## Identity & platform
- Real authentication & RBAC for Admin UI
- Background workers for approvals SLA escalation
- Automated security scanner integration
- Rich charts and CSV export for reports
- E2E flows with seeded browsers and CI containers
- Rate limiting and API keys for external callers

## Integrations (post–June 12 MVP)
- GitHub repo webhook registration — **blocked on repo admin** (James)
- ~~Slack Event Subscriptions URL~~ — ✅ done Jun 12 (`app_mention`, app reinstalled)
- OAuth flows for GitHub App and Slack (replace PAT/bot token)
- Tasks UI badges for GitHub PR and Slack thread links
- Central `integration-sync` orchestrator module
- Inbound Slack slash commands / message handling
- Asana, Monday, Trello live connectors
- HTTPS + domain for production webhook hardening (P2-11)

## Merge & ops
- Merge `feature/platform-github-slack` → `main` (James approval)
- Plane DB + MinIO backup rotation

See [memory/12th_June.md](../memory/12th_June.md) for current sprint status.
