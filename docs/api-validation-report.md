# API Validation Report — MVP Acceptance (June 3, 2026)

**Branch:** `feature/mvp-completion-june-3`  
**Environment:** EC2 Docker — API `http://54.167.31.169:3000`, UI `http://54.167.31.169:3001`  
**Script:** `scripts/api-validate.sh`  
**Auth:** Bearer `ADMIN_TOKEN` + `x-user-role` header

## Summary

| Result | Count |
|--------|-------|
| PASS | 27 |
| FAIL | 0 |

All frontend-connected MVP endpoints responded successfully during acceptance testing.

---

## Endpoint Matrix

| Endpoint | Frontend Page | Status | Tested | Result |
|----------|---------------|--------|--------|--------|
| GET /health/live | — (ops) | Live | Yes | PASS |
| GET /api/dashboard/summary | Dashboard | Connected | Yes | PASS |
| GET /api/skills | Skills | Connected | Yes | PASS |
| GET /api/packages | Packages | Connected | Yes | PASS |
| GET /api/suites | Suites | Connected | Yes | PASS |
| GET /api/overlays | Overlays | Connected | Yes | PASS |
| GET /api/customers | Customers | Connected | Yes | PASS |
| GET /api/workspaces | Workspaces | Connected | Yes | PASS |
| GET /api/entitlements | Entitlements | Connected | Yes | PASS |
| GET /api/credit-pools | Credit Pools | Connected | Yes | PASS |
| GET /api/agents | Agents | Connected | Yes | PASS |
| GET /api/runs | Runs | Connected | Yes | PASS |
| GET /api/approvals | Approvals | Connected | Yes | PASS |
| POST /api/approvals/:id/decide | Approvals | Connected | Yes | PASS |
| GET /api/integrations | Integrations | Connected | Yes | PASS |
| GET /api/integrations/:id | Integrations | Connected | Yes | PASS |
| POST /api/integrations | Integrations | Connected | Yes | PASS |
| PUT /api/integrations/:id | Integrations (API only) | Connected | Yes | PASS |
| DELETE /api/integrations/:id | Integrations | Connected | Yes | PASS |
| POST /api/integrations/:id/test | Integrations | Connected | Yes | PASS |
| GET /api/tasks | Routing Demo | Connected | Yes | PASS |
| POST /api/tasks | Routing Demo | Connected | Yes | PASS |
| POST /api/route | Routing Demo | Connected | Yes | PASS |
| POST /api/route/apply | Routing Demo | Connected | Yes | PASS |
| GET /api/runs/:id/audit | Audit Logs | Connected | Yes | PASS |
| GET /api/reports/governance | Reports | Connected | Yes | PASS |
| GET /api/reports/adoption | Reports | Connected | Yes | PASS |
| GET /api/reports/credits/summary | Reports | Connected | Yes | PASS |

## Credential Sanitization

Integration list/detail responses expose `credential_vault.configured` and `token_type` only — raw tokens are not returned. Verified on GET `/api/integrations` and POST create response.

## Automated Backend Tests

```
npm test -- --runInBand → 7/7 suites, 10/10 tests PASS
```

## Notes

- `POST /api/route` requires a `skill_key` allowed on an agent in the target workspace (demo default: `mkt_campaign_brief` for workspace 2).
- `PUT /api/integrations/:id` has no edit form in the UI; API is ready for a future sprint.

---

*Generated during MVP acceptance sprint — June 3, 2026*
