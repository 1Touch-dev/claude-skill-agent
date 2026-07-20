# System Explained, Start to End

**Purpose of this document:** a single read that gets a new teammate to 100% understanding of what this project is, what it does, how every piece works, and how they all connect — the platform, Plane, GitHub, Slack, Zapier MCP, the Agent API, workflows, and the database underneath all of it. Written to be read top to bottom with no other context required. It also includes a practical, click-by-click demo script at the end that you can use to show the live system to anyone.

Last updated: Jul 20, 2026. Verified directly against the running code and live containers on the EC2 box before writing.

---

## 1. What is this, in one paragraph

This is an **AI agent operations platform** for agencies and businesses. A client or team submits a task in plain language ("write SEO content for client X"). The platform picks the right AI "agent" for that task based on rules (skill match, autonomy level, risk tier), creates a tracked task record, mirrors that task into a project-management tool (Plane) so humans can see and manage it visually, and posts a notification into Slack so the team is alerted in real time. Everything is logged, auditable, and multi-tenant (multiple customers, each with their own workspaces, credits, and agents). On top of that base, the platform also exposes a public API (`/v1`) so external tools (Zapier, Asana, Monday, custom marketplace integrations) can create and run tasks against it, and it has direct access to 9,000+ external apps via Zapier's MCP server (so an agent's output can, for example, automatically post to Slack, create an Asana task, or send a Gmail — not just live inside our own UI).

In short: **it is the operating system for a team of AI agents that a business runs**, with a PM tool, chat notifications, and thousands of app integrations all wired into one control plane.

---

## 2. Why it exists / the business problem

The founder ("the boss"/James) wants agencies (marketing agencies, B2B call centers, etc.) to be able to hand off repetitive knowledge work — content writing, ad copy, SEO plans, competitor research, onboarding sequences — to AI agents instead of humans, while still keeping:
- **Visibility** — someone can see every task, who/what is working on it, and its state, in a normal PM tool (Plane), not a black box.
- **Control** — approvals, risk tiers, credit limits (so an agent can't run away and consume unlimited cost).
- **Distribution** — the ability to sell this as packages/seats/credit bundles to multiple customers (SaaS), and to plug into tools agencies already use (Slack, GitHub, Zapier, eventually Asana/Monday/HubSpot).

## 3. The three "hats" this project wears

1. **A skill registry / catalog** — a database of discrete AI capabilities ("skills") like `mkt_seo_content`, `mkt_ad_copy`, each with a cost in credits, a risk tier, and department/industry tags. Skills are grouped into **packages** and **suites** (department bundles) and can be scoped to **industry overlays**.
2. **A multi-tenant SaaS control plane** — `customers` → `workspaces` → `subscriptions`/`credit_pools`/`entitlements` → `agent_profiles` (the actual AI agents available to that workspace) → `task_intake` (the work items) → `task_routes` + `orchestration_runs` (which agent got which task, and its run history).
3. **An integration hub** — the piece that connects all of the above to the outside world: Plane (PM), Slack (chat), GitHub (dev events), Zapier MCP (9,000+ apps), and a public REST API (`/v1`) for third parties.

---

## 4. The stack, physically

Everything runs on a single EC2 instance (`54.167.31.169`) via Docker Compose. Containers currently running (verified live):

| Container | What it is |
|---|---|
| `backend` | Node/Express API — the brain of this whole project. Port 3000. |
| `frontend` | React admin UI (Vite build). |
| `postgres` | Our own Postgres DB — `enterprise_claude_skills` database. Source of truth for skills, tasks, agents, customers, integration events, etc. |
| `redis` | Cache/session store for our backend. |
| `plane-db`, `plane-redis`, `plane-mq`, `plane-minio` | Plane CE's own datastores (separate Postgres, Redis, RabbitMQ, object storage). |
| `plane-worker`, `plane-beat-worker` | Plane's background job workers. |
| `web`, `admin`, `space`, `live`, `api`, `plane-proxy` | Plane CE's own application containers (its web app, admin panel, live collaboration server, its API, and its reverse proxy). |

Our backend and Plane are **two completely separate applications with two separate databases**, wired together only through:
- Plane's REST API (our backend calls it as a client), and
- Plane's outbound webhooks (Plane calls our `/webhooks/plane` endpoint when issues change).

This separation is deliberate — Plane CE (community edition, self-hosted, free) is used purely as the visual PM front-end; our backend owns all the actual business logic, credits, routing, and multi-tenancy.

---

## 5. The database — what actually gets stored

Our Postgres database (`enterprise_claude_skills`) has grown across 13 migrations. The key tables, grouped by purpose:

**Skill catalog:**
- `skills` — key, name, lifecycle (draft/reviewed/enabled/disabled/deprecated/quarantined), department_tags, industry_tags, risk_tier, credit_cost, required_approvals, allowed_tools (JSON).
- `skill_sources` — where a skill's code came from (git/http/local/registry) and its trust level (untrusted/reviewed/trusted).
- `skill_packages` — versioned bundles of a skill.
- `department_suites` — bundles of skills by department (e.g. "Marketing Suite").
- `industry_overlays` — industry-specific skill scoping.

**Commercial / multi-tenant layer:**
- `customers` — top-level tenant (an agency, a company).
- `workspaces` — a customer can have multiple workspaces (teams/projects). Also holds `plane_project_id` (the linked Plane project, created automatically the first time a task in that workspace is routed).
- `subscription_plans`, `plan_tiers`, `subscriptions` — pricing plan structures (framework exists; not yet wired to Stripe).
- `credit_pools` — per-workspace, per-billing-period credit balance (`included_credits`, `consumed_credits`, `overage_credits`).
- `license_entitlements` — which skills/packages/suites/overlays a workspace or customer is entitled to use.
- `feature_flags` — per-workspace/customer feature toggles.
- `agent_seats` — human user seats tied to a workspace.

**Agents & routing:**
- `agent_profiles` — the actual AI agents (e.g. "Acme Agent", "Globex Agent") with `allowed_skill_keys` (array — empty means "any skill"), `autonomy_level`, `pooled` flag, and `plane_member_id` (so Plane can assign issues to the right "member").
- `task_intake` — the task itself: title, description, workspace_id, risk_tier, routing_mode, plus **integration link columns**: `plane_issue_id`, `plane_issue_sequence_id`, `slack_channel_id`, `slack_message_ts`, and (from migration 0011) GitHub PR/issue link columns.
- `task_routes` — which agent a task was routed to, and why (`reason`, `manual` flag).
- `orchestration_runs` — the actual execution record for a routed task (status: pending/running/succeeded/failed, approval_required flag).

**Integration plumbing:**
- `integration_events` — a log of every inbound webhook/poll event from Plane, GitHub, Slack, or Zapier, with a **unique constraint on `(provider, external_id)`** added in migration 0012 specifically so duplicate events (e.g. the same GitHub PR seen twice by both a webhook and the poller) are silently ignored via `ON CONFLICT DO NOTHING`.
- `poller_cursors` — tracks `last_seen_id` / `last_seen_at` per GitHub resource (`github:prs`, `github:issues`) so the poller (explained in §8) knows where it left off.

Live counts verified today: **12 skills** (all enabled), **12 packages**, **6 suites**, **5 overlays**, **2 customers**, **2 workspaces**, **2 agents**, **31 tasks**, **4 integrations connected** (all 4 healthy).

---

## 6. The full lifecycle of one task — start to end

This is the exact path a task takes through the system, matching the real code (`backend/src/routes/routing.js`):

1. **Creation.** A task is created in `task_intake` — either by a human via the admin UI (`Tasks.jsx` / `POST /api/tasks`), or externally via the public `POST /v1/tasks` API, or as one step of a **workflow template** (§11). Each task belongs to a `workspace_id` and optionally names a `skill_key` (which skill it needs).

2. **Routing.** Someone (or the workflow engine) calls `POST /api/route` (dry-run recommendation) or `POST /api/route/apply` (persists it). The routing logic (`pickAgent`) is intentionally simple today:
   - Pull all `agent_profiles` for that workspace, ordered by `pooled DESC, autonomy_level DESC`.
   - For each agent, check: does its `allowed_skill_keys` list include the requested skill (or is the list empty, meaning "any skill")? Is its `autonomy_level >= min_autonomy` requested? Is its `autonomy_level >= risk_tier` of the task (a crude safety check — higher-risk tasks need higher-autonomy/trust agents)?
   - Return the first agent that passes. If none pass, `404 no_agent_found`.
   - This is **not AI-based matching** — it's a deterministic rule engine. When James asked "is this fully autonomous, what agent is picked" — the honest answer is: it's rule-based determinism (skill key match + autonomy threshold), not an ML decision. That's accurately reflected in the JSON responses (`agent_id`, `agent_name`, `reason: 'engine:auto'`).

3. **Persisting the route.** `route/apply` writes one row to `task_routes` (who got it, why) and one row to `orchestration_runs` (status starts as `'pending'`).

4. **Auto-sync to Plane (fire-and-forget).** Immediately after the DB transaction commits, a `setImmediate()` block runs (so it never blocks the HTTP response):
   - If the workspace has no `plane_project_id` yet, one is created via Plane's API (`POST /workspaces/{slug}/projects/`) using an identifier like `WS0001`, and saved back onto the workspace row. If Plane already has a project with that identifier (409 conflict), the existing one is looked up and reused instead.
   - A **Work Item** (Plane's name for an issue/task) is created inside that project via `POST .../work-items/`, with the task's title/description, a priority mapped from `risk_tier` (0→low, 1→medium, 2→high, 3→urgent), and — if the routed agent has a `plane_member_id` mapped — it's assigned to that Plane "member" so it visually shows whose queue it's in.
   - The task's metadata (control-plane task ID, workspace ID, run ID, skill key, risk tier, routing mode) is embedded directly into the Plane issue description as a JSON block, so if Plane ever sends this issue back to us via webhook, we can always recover which of our tasks it maps to.
   - The resulting Plane issue ID and sequence number are written back onto `task_intake.plane_issue_id` / `plane_issue_sequence_id`.

5. **Slack notification.** Right after the Plane sync (or immediately, standalone, if Plane is disabled), a Slack message is posted (`slack.postMessage`) announcing the task, the agent it was routed to, and a direct link to the Plane issue. The resulting Slack channel ID + message timestamp are saved onto the task row (`slack_channel_id`, `slack_message_ts`) so future updates could thread onto the same message.

6. **Execution / run tracking.** The `orchestration_runs` row is the audit trail of execution. (Actual autonomous execution — an agent literally doing the work end-to-end without a human — is the "worker queue" piece that is still pending; see §14. Today, runs are created and tracked, but the heavy autonomous execution loop via BullMQ workers is not yet built.)

7. **Feedback loop from GitHub/Slack/Plane back into the platform.** If the task is dev-related and linked to a GitHub PR/issue, or if Plane's own webhook fires because someone changed the issue's status in the Plane UI, those events flow back in through `/webhooks/*` (§7–9) and update `task_intake` again — e.g. moving status from `queued` to `running` to `completed` as the linked Plane issue moves through backlog → started → completed.

This is the "hub" model: **our platform is the single source of truth (`task_intake`)**, and Plane/Slack/GitHub are treated as views and notification channels that we push to and pull from, not separate systems of record.

---

## 7. Plane — the PM layer, in detail

**What Plane is:** an open-source (self-hosted, Community Edition/CE) project management tool — think a self-hosted Linear/Jira alternative with Kanban boards, issues, states, priorities, and members. We run our own instance in Docker (`plane-db`, `plane-redis`, `plane-mq`, `plane-minio`, `web`, `admin`, `space`, `live`, `api`, `plane-proxy`), reachable at `http://54.167.31.169:8083`.

**Why Plane and not something commercial:** Plane's *commercial/cloud* edition has native GitHub/Slack integrations built in, but adopting it would mean Plane becomes the hub and our own platform becomes secondary — the opposite of the "platform as the hub" architecture James approved. So we deliberately use Plane CE (free, self-hosted) purely as a **visual front-end for humans to see and manage tasks**, and all the actual GitHub/Slack/routing intelligence lives in our own backend.

**How our backend talks to Plane** (`backend/src/services/pm-bridge/index.js`, a thin REST client, config in `pm-bridge/config.js`):
- Auth: `X-Api-Key` header with a Plane personal API token (`PLANE_API_TOKEN`), scoped to a single workspace (`PLANE_WORKSPACE_SLUG`).
- `ping()` — health check via the projects-list endpoint.
- `createProject({name, identifier, description, network})` — creates a Plane project; `identifier` is a 3–10 char uppercase code like `WS0001`.
- `createWorkItem(planeProjectId, {...})` — creates an issue ("work item" in Plane's newer terminology) with title, HTML description (into which we embed a JSON metadata block — control-plane task ID, workspace ID, run ID, skill key, risk tier — so the link back to our system survives even if Plane's own fields don't carry it), priority, and assignee.
- `updateWorkItem`, `listWorkItems`, `addComment`, `listWorkspaceMembers` — supporting calls used for syncing status changes and looking up which Plane "member" corresponds to which of our agents (`agent_profiles.plane_member_id`).
- Every call returns `{ok:true,data}` or `{ok:false,error,status}` — callers never need try/catch, they just check `.ok`.

**How Plane talks back to us** (`POST /webhooks/plane` in `backend/src/routes/webhooks.js`):
- Plane is configured (Settings → Webhooks) to POST to `http://54.167.31.169:3000/webhooks/plane` whenever an issue changes.
- We verify an HMAC signature (`X-Plane-Signature` or `X-Webhook-Secret` header) against `PLANE_WEBHOOK_SECRET` if one is configured (skipped if not set — dev-friendly default).
- There's also an optional IP allowlist check (`PLANE_WEBHOOK_ALLOWED_IPS`, supports CIDR ranges) — unset by default, meaning "allow all."
- Every raw event is logged to `plane_webhook_events` regardless of type, for audit.
- On `issue_updated`: we look up our `task_intake` row by `plane_issue_id`, map Plane's state group (`backlog/unstarted→queued`, `started→running`, `completed→completed`, `cancelled/duplicate→failed`) to our own status, update `task_intake.status`, log a `task_routes` row tagged `decided_by='plane_webhook'`, and — if the task has a Slack thread — post a threaded reply announcing the status change.
- On `issue_deleted`: we clear the `plane_issue_id`/`plane_issue_sequence_id` link on the task.

This gives a genuine **two-way sync**: change status in our UI → Plane issue updates; drag a card in Plane's Kanban board → our task status updates and Slack gets notified.

---

## 8. GitHub — real webhooks vs. the poller (the interim fix)

**The ideal (native webhook) path** — fully built and ready, just blocked on permissions:
- GitHub → repo Settings → Webhooks → point at `http://54.167.31.169:3000/webhooks/github`, subscribed to `pull_request` and `issues` events.
- **This requires repository admin access**, which we did not have (James's org owns the repo). This is the one item still needing James's action.
- Once registered, GitHub POSTs an event on every PR/issue change, signed with `X-Hub-Signature-256` (HMAC-SHA256 using a shared webhook secret), which we verify with `crypto.timingSafeEqual` before trusting the payload.

**The interim fix we built and shipped — the EC2 GitHub Poller** (`backend/src/jobs/github-poller.js`), because waiting on org-admin access would have stalled the whole GitHub integration indefinitely:
- A background timer inside the `backend` container (started from `backend/src/index.js` via `githubPoller.start()`), gated by `GITHUB_POLL_ENABLED=true` in `.env`.
- Every `GITHUB_POLL_INTERVAL_SEC` (currently 120 seconds), it calls `github.listPullRequests()` and `github.listIssues()` against the GitHub REST API using our existing Personal Access Token (`GITHUB_TOKEN`, which only needs plain `repo`/`public_repo` scope — **no admin or webhook scope required**), fetching the last 100 of each sorted by `updated desc`.
- For each PR/issue, it checks a `poller_cursors` row (one per resource: `github:prs`, `github:issues`) to see if the item is newer than the last one it processed (by numeric ID, with a fallback check on `updated_at` timestamp to catch edits to older items).
- New/changed items are converted into a **synthetic webhook payload** (same shape GitHub itself would send) and fed into `processGitHubEvent(event, payload, deliveryId, 'poll')` — **the exact same function the real webhook route calls** (`processGitHubEvent(event, payload, deliveryId, 'webhook')`). This is the key design point: there is only one code path that interprets GitHub events; only the *trigger* (webhook push vs. poll) differs.
- Deduplication is guaranteed at the DB layer: `integration_events` has a unique constraint on `(provider, external_id)` (migration 0012), and every insert uses `ON CONFLICT DO NOTHING`, so even if the poller re-sees an item it already processed, nothing double-fires.
- **Switching to real webhooks later requires zero code changes** — just get admin access, register the webhook, then set `GITHUB_POLL_ENABLED=false` and restart. That's it.

**What `processGitHubEvent` actually does** (shared logic, `backend/src/routes/webhooks.js`):
1. Extracts our internal `task_id` by scanning the PR/issue title, body, or branch name for patterns like `task-123`, `[T-123]`, `[TASK-123]`, or `T#123`.
2. Maps the GitHub action to a task status: PR opened/reopened → `running`; PR closed+merged → `completed` (closed without merge leaves status untouched); issue opened → `queued`; issue closed → `completed`.
3. Logs the event into `integration_events` (linked to the task if found, or `status='skipped'` if no task match).
4. If a task was matched and the status actually changed: updates `task_intake.status`, records a `task_routes` audit row (`decided_by` = `github_webhook` or `github_poll`), stores the PR/issue number and URL onto the task (`github_pr_number`, `github_pr_url` or `github_issue_number`, `github_issue_url` — these are what power the "⑂ PR #N" badges in the Tasks UI), pushes the state change to the linked Plane issue if one exists, and notifies Slack (as a threaded reply if the task already has a Slack thread, otherwise a new message).

The net effect for a user: **it looks and behaves identically to a real-time webhook**, just with up to a 2-minute delay instead of instant.

---

## 9. Slack — event subscriptions and outbound messages

Two separate things happen with Slack, and it's important to distinguish them:

**A. Inbound — Slack Events API** (`POST /webhooks/slack`):
- This is what the original "Save Changes button not working" bug (that kicked off this whole thread of work) was about — the Slack app's Event Subscriptions page needed a valid HTTPS Request URL pointing at our endpoint before Slack would let you save it.
- Slack's Events API requires answering a `url_verification` challenge on setup (echoing back a `challenge` token) — handled first, before any signature check, since it's just proving the endpoint is reachable.
- All other events are verified with `X-Slack-Signature` + `X-Slack-Request-Timestamp`, using HMAC-SHA256 over `v0:{timestamp}:{rawBody}` keyed by `SLACK_SIGNING_SECRET`, and requests older than 5 minutes are rejected (replay protection).
- Today this endpoint mainly logs events; it's the foundation for future inbound Slack bot commands (e.g. someone typing `/approve task 123` directly in Slack) — listed as a medium-term pending item.

**B. Outbound — posting messages** (`backend/src/services/slack/index.js`, used throughout routing and webhook handlers):
- `postMessage(channel, text, blocks)` — posts a new message (used when a task is first routed, or when there's no existing thread to reply to).
- `postReply(channel, threadTs, text, blocks)` — posts a threaded reply (used for status updates on a task that already has an open thread), so a task's entire lifecycle stays visually grouped in one Slack thread instead of spamming the channel.
- `buildTaskRoutedMessage()` / `buildTaskStatusMessage()` — formatters that build both a plain-text fallback and Slack Block Kit rich blocks (bold task title, agent name, priority, and a clickable link to the Plane issue).
- Every message that's successfully posted has its `channel` + `ts` (timestamp, which doubles as the thread ID) saved back onto `task_intake` (`slack_channel_id`, `slack_message_ts`) so subsequent updates can thread correctly.

---

## 10. Zapier MCP — connecting to 9,000+ external apps

**What MCP is:** "Model Context Protocol," an open standard (originally from Anthropic) for letting an AI agent call external tools through one uniform interface, instead of writing one bespoke integration per app. Zapier hosts an MCP server that exposes a curated set of "tools" you choose (from its catalog of 9,000+ app actions) over a single endpoint.

**Is it free?** Zapier MCP has a free tier — enough to validate the integration (we tested this live before committing to it). It's metered in "Zapier tasks," and **every successful tool call through MCP consumes 2 Zapier tasks** (confirmed during our research and setup).

**How it's wired in** (`backend/src/services/zapier-mcp/index.js`):
- Endpoint: `https://mcp.zapier.com/api/v1/connect` (config'd via `ZAPIER_MCP_ENDPOINT`).
- Auth: `Authorization: Bearer <ZAPIER_MCP_TOKEN>`.
- Protocol: **Streamable HTTP** — you POST a JSON-RPC 2.0 message (`{jsonrpc:'2.0', id, method, params}`) and get a JSON-RPC response back (sometimes wrapped in Server-Sent-Events framing, which our code strips before parsing).
- `testConnection()` and `listTools()` both call the standard MCP method `tools/list`.
- `executeTool(toolName, params)` calls `tools/call` with `{name: toolName, arguments: params}`.
- Gated by `ZAPIER_MCP_ENABLED=true` + a non-empty `ZAPIER_MCP_TOKEN` — both are set live today, with **Slack connected** as the first proven app (Asana, Monday, Gmail, HubSpot etc. are documented as next adds but not yet connected).

**Exposed to our own admin UI/agents** via `backend/src/routes/mcp.js` (mounted at `/api/mcp/*`):
- `GET /api/mcp/status` — is it enabled and reachable.
- `GET /api/mcp/tools` — list whatever tools are currently enabled on the Zapier MCP server.
- `POST /api/mcp/execute` — body `{tool_name, params, task_id?}`, runs the tool and logs the call into `integration_events` (provider `'zapier_mcp'`) for audit, optionally tagged to a task.

**The exact call shape that actually works for a write action** (learned by trial and error against the real Zapier MCP server, important for anyone extending this): Zapier MCP doesn't expose each app action as its own named tool directly callable by name (e.g. there is no tool literally called `slack_send_channel_message`). Instead there's a generic **`execute_zapier_write_action`** tool that takes:
```
{
  selected_api: "SlackAPI",          // which underlying Zapier app connector
  action: "channel_message",        // the specific action key (discovered via a "discover" tool first)
  instructions: "...",               // natural-language instructions for the action
  params: { ... },                   // the actual field values (channel, text, etc.)
  output: "..."                      // REQUIRED: a string describing what you expect back
}
```
The first time you use a new app/action, Zapier may respond with `AUTH NEEDED: <url>` — a one-time OAuth flow you complete manually in the browser (we did this for Slack) before the action becomes callable going forward.

**Why this matters strategically:** this is the answer to James's question about automating workloads and connecting to Asana/Monday/etc. — instead of writing a custom integration for every possible app a client might use, we get thousands of them "for free" as soon as they're enabled in the Zapier MCP dashboard and (for write actions) OAuth'd once.

---

## 11. The public Agent API (`/v1`) — for marketplaces & third parties

This is a deliberately separate, simplified REST surface (`backend/src/routes/agent-api.js`, mounted at `/v1` in `app.js`, **before** the `/api` admin routes so it never inherits the admin session-auth middleware). Built specifically to answer James's ask: *"make a simple to use agent API so we can use in marketplaces, for Asana, Monday, etc."*

- **Auth:** API-key only (`Authorization: Bearer <key>`), keys configured via the `API_KEYS` env var (comma-separated). Auth is only *enforced* if `REQUIRE_AUTH=true` — currently permissive for easier internal testing, ready to lock down for external partners.
- **Rate limiting:** in-memory sliding window (200 requests / 15 min per key), currently exposed as informational `X-RateLimit-Limit` / `X-RateLimit-Remaining` response headers rather than a hard block — a foundation to build on, not yet a hard wall.
- **Endpoints:**
  - `GET /v1/health` — liveness check.
  - `GET /v1/skills` / `GET /v1/skills/:key` — public-safe skill catalog (name, tags, risk tier, credit cost, description/example_prompt/category pulled from the skill's metadata JSON).
  - `POST /v1/tasks` — create a task by `{workspace_id, title, description?, skill_key}`; validates the skill exists and is enabled, returns the new task with `_links` for the next actions to take (self/route/run/status) — HATEOAS-style, so a caller doesn't need to memorize URL shapes.
  - `GET /v1/tasks/:id` — full task detail including any Plane issue URL, GitHub PR info, Slack thread info.
  - `GET /v1/tasks/:id/status` — a lightweight poll-friendly endpoint (just status + linked flags), meant to be hit repeatedly without the overhead of the full task payload.
  - `POST /v1/tasks/:id/route` — dry-run: recommend an agent without persisting anything.
  - `POST /v1/tasks/:id/run` — the "do it" endpoint: persists the route + an `orchestration_runs` row, flips task status to `running`, and fires the same Plane-sync + Slack-notify fire-and-forget pattern used internally.
- Full reference with request/response examples and error codes lives in `docs/agent-api.md`; a 10-point test script is in `scripts/test-agent-api.sh`.

This is the layer a marketplace listing (or a partner's Asana/Monday plugin) would call — they never touch our internal `/api` admin routes or session auth.

---

## 12. Workflow templates — pre-built multi-step automations

Answers James's ask for "*scripts to have automated workflows like agencies, B2B call centers, etc.*" A workflow template is a JSON file (`backend/data/workflows/*.json`) describing an ordered sequence of skill-driven steps, with placeholder variables to be filled in at run time. Three exist today:

- **`agency_client_onboarding.json`** — 3 steps: campaign brief → SEO content plan → landing page copy. Variables: `client_name, industry, goal, keywords, product, audience`.
- **`b2b_outbound_sequence.json`** — 3 steps: cold email sequence → LinkedIn ad copy → competitor analysis. Variables: `target_role, target_company_type, pain_point, solution, offer, cta`.
- **`seo_content_pipeline.json`** — an SEO-focused content pipeline (same pattern).

Served via `backend/src/routes/workflows.js` (mounted at `/api/workflows`):
- `GET /api/workflows` — lists all templates with their step count, skills used, and required template variables.
- `GET /api/workflows/:key` — full template detail.
- `POST /api/workflows/:key/run` — body `{workspace_id, vars: {...}}`. For every step (in order): interpolates `{placeholder}` tokens in the title/description using the supplied `vars` (falls back to leaving the literal `{placeholder}` if a var wasn't supplied — so it's obvious in the UI something is missing), creates a `task_intake` row, routes it to an agent using the exact same `pickAgent` logic as everywhere else, creates an `orchestration_runs` row, and flips it to `running` if an agent was found. All of this happens inside one DB transaction — if anything throws, the whole run rolls back. The response lists every created task with its ID, assigned agent, and status.

**What's still pending on this front** (per James's "wizard" question): there is currently **no UI wizard** — running a workflow today means calling the API directly with a JSON body of variables. Building a form-based wizard (type in client name/industry/etc., see it fill the template, optionally approve each step before it proceeds) is a named pending item (`N10` in the roadmap, §15).

---

## 13. The frontend admin UI

A React (Vite) single-page app (`frontend/src/`), talking to the backend's `/api` routes via a small helper (`frontend/src/lib/api.js`, which auto-prefixes calls with `/api`). Pages (`frontend/src/pages/`):

| Page | Purpose |
|---|---|
| `Login.jsx` | Session auth entry point |
| `Skills.jsx` | Browse the skill catalog |
| `Suites.jsx` / `Overlays.jsx` | Department suites / industry overlays |
| `Packages.jsx` | Skill packages/versions |
| `Customers.jsx` / `Workspaces.jsx` | Tenant management |
| `Entitlements.jsx` / `CreditPools.jsx` | Commercial/licensing views |
| `Agents.jsx` | Manage `agent_profiles` (allowed skills, autonomy level, Plane member mapping) |
| `Tasks.jsx` | The main task list — shows status, and (added this sprint) **integration badges**: a "⑂ PR #N" badge linking to the GitHub PR, and a "# Slack thread" badge linking into the Slack conversation, whenever a task has those links populated |
| `RoutingDemo.jsx` | Interactive demo of `POST /api/route` / `/route/apply` — pick a workspace + skill, see which agent gets picked and why |
| `Integrations.jsx` | Live connection-test panel for every integration (Plane, GitHub, Slack, Zapier MCP) — literally calls each provider's real API and reports pass/fail, not a mock |
| `Approvals.jsx` | Pending approval queue (for skills that require human sign-off before running, per `required_approvals` on the skill) |
| `Runs.jsx` / `Audit.jsx` / `Reports.jsx` | Execution history and reporting |
| `ListView.jsx` | Generic list/table view used across a few of the above |

Navigation is defined in `frontend/src/components/Nav.jsx`, routes in `frontend/src/App.jsx` (e.g. the Routing Demo lives at `/routing`, not `/routing-demo` — a common source of confusion during demos).

---

## 14. Practical end-to-end demo — click-by-click, on the live system

Use this exact script to show the system to anyone from a blank browser. Every URL, credential, and label below is taken directly from the live, running system (verified today).

### Step 0 — URLs and login

- **Our platform (admin UI):** `http://54.167.31.169:3001`
- **Our backend API:** `http://54.167.31.169:3000`
- **Plane (PM tool):** `http://54.167.31.169:8083`, workspace slug `claude-skills`
- **Login to our platform:** it's a single admin-token login (not username/password). On the Login screen:
  - Admin token: `changeme` (the value of `ADMIN_TOKEN` in `.env` — change this before showing it to a real client)
  - Access role: pick **Admin** for the full demo
  - Click **Continue to control plane**

This is intentionally an MVP auth scheme (bearer token session) — the login screen literally says "Enterprise SSO planned for production," so it's fine to mention that plainly if asked.

### Step 1 — Show the Dashboard

Land on the home/dashboard view. Point out the live totals (these are real counts from Postgres, not fake data): 12 skills, 12 packages, 6 suites, 5 overlays, 2 customers (**Acme Corp**, **Globex Inc**), 2 workspaces (**Acme Main**, **Globex Main**), 2 agents (**Acme Agent**, **Globex Agent**), 31 tasks, 4 connected integrations.

### Step 2 — Show the Skill Catalog

Navigate to **Skills**. Show the list of 12 enabled skills — a mix of general department skills (`eng_pr_summary` "PR Summary Bot", `prod_spec_outline` "Spec Outline Assistant", `grc_policy_check` "Policy Checker", `ops_runbook` "Runbook Draft", `cs_response_helper` "CS Response Helper") and the marketing suite added for the agency use case (`mkt_campaign_brief`, `mkt_seo_content`, `mkt_ad_copy`, `mkt_email_sequence`, `mkt_landing_copy`, `mkt_social_post`, `mkt_competitor_report`). Mention each has a credit cost and risk tier — this is what pricing will eventually be built on.

### Step 3 — Show the Agents

Navigate to **Agents**. Point out:
- **Acme Agent** — belongs to Acme Main workspace, autonomy level 2, pooled.
- **Globex Agent** — belongs to Globex Main workspace, autonomy level 3, pooled, and (unlike Acme) already has a live Plane project linked (`plane_project_id` populated) — meaning every task routed in Globex Main will land straight into a real Plane project.

### Step 4 — Run the live Routing Demo

Navigate to **Routing Demo** (URL is `/routing`, not `/routing-demo`). This is the best "wow" moment of the demo because it's calling real backend logic live, not a canned mock:
1. Pick workspace = **Globex Main**.
2. Pick skill = **mkt_seo_content** (SEO Content Writer).
3. Submit the route request. Watch it return **Globex Agent** as the chosen agent, with the reasoning visible (`engine:auto` — skill allowed + autonomy threshold met).
4. Explain out loud: "this isn't a big AI model deciding — it's a transparent rule: does this agent's allowed skill list include this skill, and is its trust/autonomy level high enough for this risk tier. It's simple on purpose, so it's auditable."

### Step 5 — Create and route a real task, then watch it appear in Plane and Slack

1. Navigate to **Tasks** → create a new task, e.g. title "SEO content plan for Client X", workspace = Globex Main, skill = `mkt_seo_content`.
2. Apply routing (`route/apply`). Within a second or two:
   - A new **Plane issue** appears in the Globex Main project at `http://54.167.31.169:8083/claude-skills/` — open Plane in a second tab and refresh to show it landing live, with the correct title, priority, and assignee (Globex Agent's mapped Plane member).
   - A **Slack message** posts into the configured channel announcing the task, the agent, and a clickable link straight into that same Plane issue.
3. Back on the Tasks page, refresh — the task row now shows the ⑂/Plane link badge and, once GitHub/Slack are linked, the corresponding badges too.
4. **The two-way sync moment:** go into Plane, drag that issue's status from "Backlog" to "In Progress" on the Kanban board. Flip back to our Tasks page and refresh — the task's status has updated to `running` automatically, and a threaded Slack reply announcing the status change has been posted. This demonstrates the platform is the source of truth while Plane/Slack are live views, not silos.

### Step 6 — Show GitHub integration (poller, not yet real-time webhook)

Navigate to **Integrations**. Click the live test for GitHub — it hits the real GitHub API with our token and reports success. Explain: "GitHub events (PRs, issues) flow into this same task pipeline today via a background poller that checks GitHub every 2 minutes — because we're waiting on repo-admin access to register an instant webhook. Functionally it's identical, just up to a 2-minute delay instead of instant. The moment we get admin access, it's a one-line config flip, no rebuild needed."

If there's a real PR mentioning `task-31` (or whichever ID) open in the repo, you can literally watch the Tasks page pick up the ⑂ PR badge after the next poll tick.

### Step 7 — Show Zapier MCP (the "we can talk to 9,000 apps" moment)

Navigate to **Integrations** → the Zapier MCP tile. Show its live status = connected. Explain: "This is Zapier's MCP server — instead of us writing a custom integration for every tool an agency uses, we plug into Zapier once and get access to thousands of apps. We've already proven this works end-to-end with Slack (fully OAuth'd and tested); adding Asana, Monday, Gmail, or HubSpot next is just enabling them in the Zapier dashboard, no new backend code."

### Step 8 — Show the public Agent API (the marketplace story)

Open a terminal (or just describe it) and hit:
```bash
curl http://54.167.31.169:3000/v1/health
curl http://54.167.31.169:3000/v1/skills
```
Explain: "This `/v1` API is completely separate from the admin UI's API — it's what a marketplace partner (Asana, Monday, a Zapier app listing) would call directly. Create a task, get a recommended agent, run it, poll its status — four calls, and any external tool now has an AI agent working for them."

### Step 9 — Show a Workflow Template (multi-step automation)

```bash
curl http://54.167.31.169:3000/api/workflows
```
Explain the `agency_client_onboarding` template: one call kicks off 3 chained tasks (campaign brief → SEO content plan → landing page copy), each auto-routed to an agent, each synced to Plane and Slack — a whole client onboarding sequence from a single API call with a few variables filled in (client name, industry, goal, etc.). Mention the pending item: there's no visual wizard for this yet, so today it's an API call with a JSON body; the wizard (type inputs into a form, see it fill in and optionally approve each step) is next.

### Closing line for the demo

"Every piece you just saw — the routing, the Plane sync, the Slack notification, the GitHub poller, the Zapier bridge, the public API — is real, live code hitting real live services right now, not a mockup. The two gaps that remain are: (1) GitHub webhooks are a poller instead of instant, waiting on repo-admin access, and (2) actual autonomous execution of the work itself (an agent literally writing the content) isn't wired to a worker queue yet — today the platform perfectly tracks, routes, and notifies, but a human or a separate process still does the 'skill' work itself."

---

## 15. Current status and what's pending

**Fully working today** (verified live against the running containers):
1. Skill registry, packages, suites, overlays — 12 skills enabled across marketing/content categories.
2. Multi-tenant commercial layer (customers/workspaces/credit pools/entitlements) — schema and APIs exist; **Stripe billing is not wired yet** (subscriptions table exists but nothing charges a card).
3. Rule-based agent routing (`pickAgent`) — deterministic, not ML — used identically by the admin UI, `/v1` API, and workflow runner.
4. Plane CE — full two-way sync (create issue on route, status sync both directions, comments/assignee support).
5. Slack — outbound notifications with threading; inbound Events API endpoint exists (verification + signature checking) but only logs today, no bot commands yet.
6. GitHub — event processing logic complete and shared between the (currently unregistered) native webhook route and the **live, running EC2 poller** (2-minute interval). Poller confirmed via live dashboard/db.
7. Zapier MCP — live and enabled, Slack connector authenticated and working end-to-end; other apps (Asana, Monday, Gmail, HubSpot) documented but not yet connected.
8. Public `/v1` Agent API — fully implemented and tested (10-point test suite passing).
9. Workflow templates — 3 templates implemented, runnable via API, not yet via a UI wizard.
10. UI integration badges on the Tasks page for GitHub/Slack links.

**Blocked on someone else's action:**
- **Native GitHub webhook** — needs org-level repo admin access from James (or whoever owns the GitHub org) to register `Settings → Webhooks`. Everything else about GitHub already works via the poller; this only removes the ~2 minute delay.
- **Stripe/billing platform decision** — James needs to choose Stripe vs. an alternative before pricing packages become real, chargeable plans.
- **Affiliate platform decision** — PartnerStack vs. Rewardful, for the affiliate/GTM motion.
- **First 3 pilot agency clients** — needed to start Go-to-Market phase 1.

**Next planned build items** (immediate/high priority):
- Disable the GitHub poller once the native webhook goes live (one env var flip, no code change).
- Seed real pricing packages into the DB and wire Stripe.
- Add 14+ more skills across sales, customer success, ops, HR, and finance categories (currently concentrated in marketing).
- Connect more Zapier apps (Asana, Monday, Gmail, HubSpot).
- Build a Skill Marketplace UI (ratings/usage stats/category filters) — this is also the mechanism for James's "rank skills per category using stars/testing logs" ask.
- Build the Workflow Wizard UI (form-based variable entry, optional per-step human approval before continuing) — direct answer to James's "wizard" question.
- Multi-agent + RAG per-industry knowledge overlays (pgvector-backed knowledge bases feeding agent context) — the answer to James's "multi-agentic and RAG model for each industry" question; this is a genuinely new R&D item, not yet started.

**Medium-term / deferred:**
- Real worker queues (BullMQ) so `orchestration_runs` actually execute autonomously end-to-end, instead of just being tracked records — this is the honest gap between "the system tracks and routes work" and "the system does the work with zero humans involved."
- Self-improving skill evaluation loops (skills that get scored on output quality and iteratively refined).
- Inbound Slack bot commands (approve/reject a task directly from Slack).
- White-labelling for agencies reselling under their own brand.
- Self-serve multi-workspace onboarding (currently workspaces/customers are provisioned manually/by seed data).
- Public landing + pricing pages for GTM.
- A 5-minute demo video (Loom).

---

## 16. Where to go for more detail

- `Finance Platform Handoff.md` — the dedicated handoff doc for a new owner of this project; has live credentials, first-week checklist, and James's open decisions in one place.
- `README.md` — canonical setup/architecture/install instructions, kept current with each sprint.
- `docs/github_webhooks.md` — the canonical native-webhook reference (what to do the moment repo-admin access is granted).
- `docs/github_poller.md` — poller-specific design and operational notes.
- `docs/agent-api.md` — full `/v1` API reference with examples.
- `docs/zapier-mcp.md` — Zapier MCP setup guide and app recommendations.
- `memory/25th_June.md` (and `24th_June.md`, `15th_June.md`) — dated sprint logs; read these for a chronological view of *why* each decision was made, not just what exists today.

If anything in this document ever looks stale compared to the running code, trust the code — this file was written by reading `app.js`, every route file, the live DB counts, and the running Docker containers directly, but code moves faster than docs.

