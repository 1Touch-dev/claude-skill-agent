# Live Website Demo Script — Word by Word

Read this almost exactly as written while you click through the live site. The flow, examples, and steps below match `System_Explained_End_to_End.md` §14 (Practical end-to-end demo). Every URL, label, and number was verified against the running system.

**Open before you start:**
- Tab 1 — our platform: `http://54.167.31.169:3001`
- Tab 2 — Plane (PM tool): `http://54.167.31.169:8083` (workspace slug: `claude-skills`)
- Optional — terminal for API steps at the end

**The one practical example we use throughout:** an agency just signed a new client. We need an **SEO content plan for Client X**. We run that single task through the whole system — create it, route it to an agent, watch it land in Plane, get a Slack notification, and show the two-way sync. That is the same example used in `System_Explained_End_to_End.md`.

---

## Step 0 — URLs and login

*(You are on the login screen at `http://54.167.31.169:3001`.)*

"This is our platform — Enterprise Claude Skills. It's a single admin-token login, not a username and password."

Do this while you talk:
- Type `changeme` into the **Admin token** field (this is the `ADMIN_TOKEN` value in `.env` — change it before showing to a real client).
- Leave the role as **Admin** (full demo access).
- Click **Continue to control plane**.

"Right now it's an MVP auth scheme — bearer token session. The login screen even says enterprise SSO is planned for production. For internal demos this is enough."

---

## Step 1 — Show the Dashboard

*(You land on the Dashboard / home view.)*

"This is the Executive Dashboard. These numbers are live from Postgres — not hardcoded."

Point at the tiles as you say:

"We have **12 skills**, all active. **12 packages**, **6 suites**, **5 overlays**. Two customers — **Acme Corp** and **Globex Inc**. Two workspaces — **Acme Main** and **Globex Main**. Two agents — **Acme Agent** and **Globex Agent**. **35 tasks** have moved through the system. **4 integrations** connected, all 4 healthy. You can also see runs by state down here — one run has already succeeded."

"So this is the control plane for a multi-tenant AI agent operations platform — customers, workspaces, agents, skills, tasks, and integrations, all in one place."

---

## Step 2 — Show the Skill Catalog

*(Click **Skills** in the top nav.)*

"This is the Skill Registry — every AI capability our agents can perform."

"Each skill has a key, a name, a lifecycle state — enabled, disabled, deprecated — a risk tier, and a credit cost. Pricing packages will eventually be built on these credit costs and risk tiers."

Scroll or point at rows as you say:

"We have general department skills — **PR Summary Bot** (`eng_pr_summary`), **Spec Outline Assistant** (`prod_spec_outline`), **Policy Checker** (`grc_policy_check`), **Runbook Draft** (`ops_runbook`), **CS Response Helper** (`cs_response_helper`)."

"And we built a full marketing suite for agencies — **Campaign Brief Generator** (`mkt_campaign_brief`), **SEO Content Writer** (`mkt_seo_content`), **Ad Copy Writer** (`mkt_ad_copy`), **Email Sequence Writer** (`mkt_email_sequence`), **Landing Page Copy** (`mkt_landing_copy`), **Social Media Post Writer** (`mkt_social_post`), **Competitor Analysis Report** (`mkt_competitor_report`)."

"For our example today we'll use **`mkt_seo_content`** — the SEO Content Writer — because our new client needs an SEO content plan."

---

## Step 3 — Show the Agents

*(Click **Agents** in the top nav.)*

"This is where we manage agent profiles — the actual AI agents that get work assigned."

Point at each row:

"**Acme Agent** — belongs to the **Acme Main** workspace, autonomy level **2**, pooled — meaning it can pick up work automatically."

"**Globex Agent** — belongs to the **Globex Main** workspace, autonomy level **3**, pooled. Globex already has a live Plane project linked, so every task we route in Globex Main lands straight into a real Plane project."

"See the **Plane Member** dropdown next to each agent? That maps our internal agent to a member inside Plane — so when a task goes to Globex Agent, the Plane card can show the right assignee."

"We'll route our Client X SEO task into **Globex Main** — workspace ID **2** — so **Globex Agent** should pick it up."

---

## Step 4 — Run the live Routing Demo (dry run — who gets the task?)

*(Click **Routing Demo** in the top nav. URL must be `/routing` — not `/routing-demo`.)*

"This page is the best 'wow' moment — it calls real backend logic live, not a mock."

"On the left, the form has **Workspace ID**, **Title**, and **Skill key**. I'll set Workspace ID to **2** — that's Globex Main. Skill key to **`mkt_seo_content`** — SEO Content Writer."

"Before we create the full task, the routing engine works like this: when I click **Route & Apply** on a task, the backend calls `pickAgent` — it pulls all agents for that workspace, checks does this agent's `allowed_skill_keys` include the skill we asked for, and is its autonomy level high enough for this task's risk tier. First match wins."

"It's **not** a big AI model deciding — it's a transparent rule: skill match plus autonomy threshold. Simple on purpose, so it's auditable. When James asked 'what agent is picked' — that's the honest answer: deterministic rules, reason `engine:auto`, not ML."

---

## Step 5 — Create and route a real task, then watch Plane and Slack

*(Stay on **Routing Demo**.)*

"Now let's do the full example — **SEO content plan for Client X**."

Fill in the form exactly:
- **Workspace ID:** `2` (Globex Main)
- **Title:** `SEO content plan for Client X`
- **Skill key:** `mkt_seo_content`

Click **Create Task**.

"Task created. Look at **Recent Tasks** — there it is, status **queued**, PM column still empty — not synced to Plane yet."

Click **Route & Apply** on that new task row.

*(Point to the banner message.)*

"It says: **Task #\<id\> routed to agent Globex Agent. Syncing to Plane…**"

"That one click did three things in the backend:
1. Wrote a row to `task_routes` — who got it and why.
2. Created an `orchestration_runs` record — execution tracking.
3. Fired a background sync — creates a Plane work item and posts a Slack message. The HTTP response doesn't wait for Plane; it's fire-and-forget so the UI stays fast."

Wait ~2 seconds, then refresh the Recent Tasks table (or wait for auto-reload).

"The **✈** badge should appear — that's our task synced to Plane CE. Click it to open the work item."

---

## Step 6 — Show it in Plane (and the two-way sync moment)

*(Switch to Tab 2 — Plane at `http://54.167.31.169:8083`, or click the ✈ badge from Routing Demo / Tasks.)*

"Plane is our self-hosted project management tool — like Jira or Linear, but we run it ourselves on this server. Community Edition, free, separate database from our platform."

"Here's the card our platform just created — title **SEO content plan for Client X**, correct priority from risk tier, assigned to Globex Agent's mapped Plane member if configured."

"Scroll the description — you'll see a metadata block at the bottom: control-plane task ID, workspace ID, run ID, skill key. That's how Plane always knows which of our tasks this card belongs to."

**The two-way sync moment** — do this live if you can:

"Now watch the two-way part. I'll drag this card from **Backlog** to **In Progress** right here in Plane…"

*(Drag the card on the Kanban board.)*

"Plane sends a webhook to our backend at `/webhooks/plane`. We map Plane's state to our status — backlog/unstarted becomes `queued`, started becomes `running`, completed becomes `completed`."

*(Switch back to Tab 1 — **Tasks** page, click **↻ Refresh**.)*

"Back on our Tasks page — status updated to **running** automatically. And in Slack, a threaded reply was posted on the original notification announcing the change. Plane and Slack are live views into the same task — our platform `task_intake` table is the source of truth."

---

## Step 7 — Tasks page (integration badges)

*(Click **Tasks** in the top nav if not already there.)*

"Subtitle says: **✈ badge = synced to Plane CE. ⑂ = GitHub PR linked. # = Slack thread.**"

"Top right shows something like **29/35 synced to Plane** — filter tabs **All**, **Synced**, **Not synced** let you spot anything that failed to sync."

Find your **SEO content plan for Client X** row:

"There's our task — status **running**, **✈** link into Plane. If a dev later opens a GitHub PR with `task-\<id\>` in the title, the **⑂ PR #N** badge appears here after the poller runs. If Slack threaded, you'd see **# Slack thread**."

"One glance tells you which external systems this task is connected to — no need to open three tools."

---

## Step 8 — Show GitHub integration (poller, not yet real-time webhook)

*(Click **Integrations** in the top nav.)*

"This is our connector registry. GitHub and Slack run **real** API tests — not mocked. Asana, Monday, Trello are still mock validation in this MVP stage."

"You see four connected integrations: **Slack Events Channel**, **GitHub MCP Server**, **Monday.com Integration**, **Asana Connector** — all status **connected**."

Click **Test** next to **GitHub MCP Server**.

"That hits the real GitHub API with our token and confirms it's reachable."

"About GitHub events — the ideal path is a native webhook: GitHub → `http://54.167.31.169:3000/webhooks/github` on every PR/issue change. That needs **repo admin access**, which we're still waiting on from James."

"So today we run an **EC2 GitHub Poller** — checks GitHub every **2 minutes**, builds the same payload shape a webhook would send, and feeds it into the **exact same** `processGitHubEvent` function. Deduplication is at the database layer — `integration_events` has a unique constraint on provider plus external ID."

"If there's a PR open that mentions `task-31` in the title or branch, after the next poll tick you'll see the **⑂ PR #N** badge on that task. Functionally identical to a webhook — just up to a 2-minute delay. When we get admin access: register the webhook, set `GITHUB_POLL_ENABLED=false`, restart. One config flip, no rebuild."

---

## Step 9 — Show Zapier MCP (9,000 apps)

*(Stay on **Integrations**, scroll to Zapier MCP if shown, or describe from terminal.)*

"We connected **Zapier MCP** — Model Context Protocol. Instead of writing a custom integration for every app an agency uses, we plug into Zapier once and get **9,000+ apps**."

"It's live and enabled. Slack is fully OAuth'd and tested end-to-end. Adding Asana, Monday, Gmail, or HubSpot is enabling them in the Zapier dashboard — no new backend code."

"If you want to show the raw API:"

```bash
curl http://54.167.31.169:3000/api/mcp/status -H "Authorization: Bearer changeme"
curl http://54.167.31.169:3000/api/mcp/tools -H "Authorization: Bearer changeme"
```

"Write actions use `execute_zapier_write_action` with `selected_api`, `action`, `params`, and a required `output` string — we documented the exact shape in `docs/zapier-mcp.md` after trial and error against the real server."

---

## Step 10 — Show the public Agent API (marketplace story)

*(Open a terminal.)*

"This is separate from the admin UI API — it's what a marketplace partner, Asana plugin, or Monday integration would call."

```bash
curl http://54.167.31.169:3000/v1/health
curl http://54.167.31.169:3000/v1/skills
```

"First call — API is alive. Second — public skill catalog."

"Full partner flow in four calls: **create task** (`POST /v1/tasks`), **route** (`POST /v1/tasks/:id/route`), **run** (`POST /v1/tasks/:id/run` — same Plane sync and Slack notify as the UI), **poll status** (`GET /v1/tasks/:id/status`). External tools never touch our internal `/api` admin routes."

"Reference: `docs/agent-api.md`. Test script: `scripts/test-agent-api.sh`."

---

## Step 11 — Show a Workflow Template (multi-step automation)

*(Terminal.)*

"One task at a time is what we just did for Client X. Agencies often need a **sequence** — onboarding a client means brief, SEO plan, and landing copy in one go."

```bash
curl http://54.167.31.169:3000/api/workflows -H "Authorization: Bearer changeme"
```

"Three templates today:
- **`agency_client_onboarding`** — campaign brief → SEO content plan → landing page copy. Variables: `client_name`, `industry`, `goal`, `keywords`, `product`, `audience`.
- **`b2b_outbound_sequence`** — email sequence → ad copy → competitor report.
- **`seo_content_pipeline`** — competitor report → SEO article → social posts."

"One API call with those variables filled in creates every step as a `task_intake` row, routes each to an agent with the same `pickAgent` logic, and creates `orchestration_runs` records — all in one database transaction."

Example (you can run live or just describe):

```bash
curl -X POST http://54.167.31.169:3000/api/workflows/agency_client_onboarding/run \
  -H "Authorization: Bearer changeme" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": 2,
    "vars": {
      "client_name": "Client X",
      "industry": "Healthcare",
      "goal": "50 new leads per month via SEO",
      "keywords": "dentist near me, teeth whitening",
      "product": "Dental services",
      "audience": "Local homeowners 25-55"
    }
  }'
```

"Response lists every created task ID, assigned agent, and status. Refresh **Tasks** in the browser — three new rows appear."

"Honest gap: the workflow runner routes tasks but does **not** auto-sync to Plane yet — the single-task **Route & Apply** path does. Plane sync is `POST /api/pm/tasks/:id/sync` per task until we wire that in. The wizard UI James asked for — type client details in a form, optional per-step approval — is pending (`N10` on the roadmap)."

---

## Closing line (say this at the end)

"Every piece you just saw — routing with transparent rules, Plane two-way sync, Slack notifications, GitHub via a working poller, Zapier bridge to thousands of apps, public `/v1` API, and multi-step workflows — is **real live code** hitting **real services** on this server, not a mockup."

"We walked one practical example end to end: **SEO content plan for Client X** in **Globex Main**, skill **`mkt_seo_content`**, routed to **Globex Agent**, visible in **Plane**, updatable from either side, with Slack in the loop."

"The gaps to be straight about: (1) GitHub webhooks are a 2-minute poller until repo-admin access — same outcome, not instant. (2) Workflow runs need an extra Plane sync call per task today. (3) Autonomous execution — the agent actually writing the content without a human — needs a worker queue (BullMQ); today the platform tracks, routes, and notifies perfectly, but something else still does the skill work."

---

## Quick reference (verified live, Jul 20 2026)

| Item | Value |
|---|---|
| Platform UI | `http://54.167.31.169:3001` |
| Backend API | `http://54.167.31.169:3000` |
| Plane UI | `http://54.167.31.169:8083` / workspace `claude-skills` / project `WS0002` |
| Login token | `changeme` (`ADMIN_TOKEN`) |
| Example workspace | **Globex Main** = workspace ID **2** |
| Example skill | `mkt_seo_content` (SEO Content Writer) |
| Example task title | `SEO content plan for Client X` |
| Expected agent | **Globex Agent** (autonomy 3, pooled) |
| Routing Demo URL | `/routing` |
| Route success message | `Task #<id> routed to agent Globex Agent. Syncing to Plane…` |
| Customers | Acme Corp, Globex Inc |
| Workspaces | Acme Main, Globex Main |
| Dashboard | 12 skills / 2 customers / 2 workspaces / 2 agents / 35 tasks / 4 integrations |
| Tasks page | ✈ Plane, ⑂ GitHub PR, # Slack thread; ~29/35 synced |
| GitHub | Poller every 120s (`GITHUB_POLL_ENABLED=true`) |
| Zapier MCP | Enabled, Slack connected, ~15 tools |
| Workflows | `agency_client_onboarding`, `b2b_outbound_sequence`, `seo_content_pipeline` |

**Full task lifecycle (same as `System_Explained_End_to_End.md` §6):**
1. Create → `task_intake`
2. Route → `task_routes` + `orchestration_runs`
3. Plane sync (auto on `/route/apply`, manual on workflow runs)
4. Slack notify
5. Feedback from Plane webhook / GitHub poller / Slack events
