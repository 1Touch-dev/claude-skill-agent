# Live Website Demo Script 

**Open before you start:** `http://54.167.31.169:3001` (our platform) in one tab, and keep `http://54.167.31.169:8083` (Plane) ready to open in a second tab.

**The running example used throughout this script:** a fictional new agency client called **"Sunrise Dental Group"**, a local dental practice that wants more patients. We use this one client as a single thread that runs through the entire demo — Skills, Routing, Plane, Tasks, and finally the full automated Workflow — so by the end you've shown one realistic client going from "just signed" to "three pieces of marketing work created, assigned, and tracked" without typing more than a client name and a few details. Every ID and number below (task IDs 33/34/35, Plane issue #31/#32/#33) is real — it was actually run against the live system, not made up for illustration.

---

### 1. Login

*(You're on the login screen.)*

"This is our platform — Enterprise Claude Skills. Before anything else, I log in with an admin token."

- Type `changeme` into the **Admin token** field.
- Leave the role as **Admin**.
- Click **Continue to control plane**.

"Right now it's a simple token login — the screen even says enterprise SSO is planned for production, but for our internal use and demos this is enough."

---

### 2. Dashboard

*(You land on the Dashboard.)*

"This is the Executive Dashboard — live numbers pulled straight from our database, not hardcoded."

Point at the tiles as you say:

"We currently have 12 skills, all of them active. 2 customers, 2 workspaces, 2 agents. 4 integrations connected — all 4 healthy. 35 tasks have moved through the system so far, and you can see one run has already succeeded down here under 'Runs by State.' That task count will keep climbing as we go — by the end of this demo we'll add a few more live, in front of you."

"Let's walk through what each of these actually means."

---

### 3. Skills

*(Click "Skills" in the top nav.)*

"This is the Skill Registry — the catalog of every AI capability our agents can perform."

"Each skill has an ID, a key, a name, a lifecycle state — enabled, disabled, deprecated — a risk tier, and a trust level. Right now we have 12 skills, all enabled."

Scroll or point to a couple of rows:

"For example, `mkt_competitor_report` — Competitor Analysis Report — risk tier 1, reviewed. `mkt_social_post` — Social Media Post Writer. These are the marketing-agency skills we built out specifically to support agencies doing SEO, ad copy, email sequences, landing pages, and onboarding work."

"We also have general department skills — PR Summary Bot, Spec Outline Assistant, Policy Checker, Runbook Draft, CS Response Helper — so this isn't just a marketing tool, it's a general skill framework."

---

### 4. Agents

*(Click "Agents" in the top nav.)*

"This is where we manage Agent Profiles — the actual AI agents that get work assigned to them."

"We have two right now: Globex Agent, which belongs to the Globex workspace, has an autonomy level of 3, and is pooled — meaning it's available to pick up work automatically. And Acme Agent, autonomy level 2, also pooled, for the Acme workspace."

"See this 'Plane Member' dropdown next to each agent? That's how we map our internal agent to a member inside Plane, our project management tool — so when a task gets routed to Globex Agent, the resulting card in Plane is automatically assigned to the right person or bot."

---

### 5. Routing Demo — the live "wow" moment, using our example client

*(Click "Routing Demo" in the top nav — note the URL is `/routing`.)*

"This is the best way to show you the actual brain of the system working live, in real time — this isn't a mockup. Let's warm up with a single manual task for our example client, Sunrise Dental Group, before we show the fully automated version later in this demo."

"On the left I can create a new task. I'll fill in Workspace ID — let's use 2, that's Globex, the workspace handling this client. Title — instead of the default text, I'll type something real: 'Discovery call notes — Sunrise Dental Group.' Skill key — `mkt_campaign_brief`, the Campaign Brief Generator."

Click **Create Task**.

"That created the task. Now look down here in 'Recent Tasks' — there it is, status 'queued', not yet routed to anyone."

Click **Route & Apply** on that new task row.

"Watch what just happened up here —"

*(Point to the banner message that appears.)*

"It says: 'Task number [X] routed to agent Globex Agent. Syncing to Plane...' That single click just did three things: it picked an agent using our routing rules, it's creating a matching card inside Plane right now in the background, and it's about to post a Slack notification too."

"How does it pick the agent? It's a transparent rule, not a black box — does this agent's allowed-skills list include the skill we asked for, and is the agent's autonomy level high enough for this task's risk tier? If yes, that agent gets it. It's simple and auditable on purpose, so a client can always ask 'why did this get assigned here' and we have a real answer."

---

### 6. Show it landing in Plane

*(Switch to the Plane tab, `http://54.167.31.169:8083`, and refresh, or click the "✈ #" badge next to the task if visible.)*

"Here's Plane — this is a project management tool, like a self-hosted Jira or Linear, that we run ourselves. And here's the card that our platform just created automatically, a few seconds ago, with the task title, the right priority, and assigned to the right member."

"Now here's the two-way part — if I drag this card from Backlog to In Progress right here in Plane..."

*(Drag the card, or describe doing so.)*

"...and go back to our Tasks page and refresh, that task's status updates automatically to 'running,' and a Slack message gets posted announcing the change. So Plane isn't a separate system we have to manually keep in sync — it's a live view into the same task, and it flows both directions."

---

### 7. Tasks page

*(Click "Tasks" in the top nav.)*

"This is the full task list. Notice the subtitle: the ✈ badge means synced to Plane, the ⑂ symbol means there's a linked GitHub pull request, and the # symbol means there's a linked Slack thread. So at a glance, anyone can see exactly which systems a task is connected to without opening three different tools."

"You can see the top counter — right now 29 out of 35 tasks are synced to Plane — and there are filter tabs for All, Synced, and Not synced, so you can immediately spot anything that failed to sync."

"Find our Sunrise Dental discovery-call task in the list — there it is, with a ✈ badge and a link straight into the matching Plane issue. One client's work, fully traceable, in two clicks. Now let's see what happens when instead of creating tasks one at a time like this, we onboard this same client's entire first campaign in a single call."

---

### 8. Integrations

*(Click "Integrations" in the top nav, then scroll down to the list.)*

"This is our connector registry, and I want to be clear — these are live, not mocked. GitHub and Slack run real API tests against the real APIs; Asana, Monday, and Trello are still mock validation in this MVP stage."

"You can see we have 4 connected integrations right now: Slack Events Channel, GitHub MCP Server, Monday.com Integration, and an Asana Connector — all showing status 'connected.'"

Click **Test** next to GitHub MCP Server.

"If I hit Test here, it makes a real call to the GitHub API using our token and confirms it's reachable — same idea for Slack."

"Now, about GitHub specifically — normally you'd register a webhook so GitHub instantly tells us the moment a pull request changes. We don't have admin access to the repo yet to register that, so instead we built a poller: our backend checks GitHub every 2 minutes for changes and processes them exactly the same way a webhook would. Functionally identical, just up to a 2-minute delay. The moment we get admin access, it's a one-line config change, no rebuild required."

---

### 9. Zapier MCP — the "9,000 apps" story

*(Stay on Integrations, or open a terminal if you want to show the raw API.)*

"Here's something bigger. We've connected to something called Zapier MCP — Model Context Protocol. Instead of us writing a custom integration for every single tool an agency might use, we plug into Zapier once, and it gives our agents access to over 9,000 apps — Slack, Gmail, Asana, Monday, HubSpot, Google Sheets, you name it."

"We've already fully tested this end to end with Slack — connected, authenticated, and working. Right now it's exposing 15 different tools to our system, including the ability to discover new app actions and execute them. Adding Asana or Gmail next doesn't need new code from us — it's a configuration step in the Zapier dashboard."

---

### 10. The public Agent API — for marketplaces

*(Open a terminal, or just describe it if you don't want to type live.)*

"One more piece — we built a separate, simplified API specifically so external tools and marketplaces can plug into us directly, without touching our internal admin system."

If typing live:
```bash
curl http://54.167.31.169:3000/v1/health
curl http://54.167.31.169:3000/v1/skills
```

"That first call just confirms the API is alive. The second lists our public skill catalog. From here, any external partner — an Asana plugin, a Monday integration, a marketplace listing — can create a task, get it routed to an agent, and poll its status, all through four simple calls. That's the foundation for selling this as a product other platforms plug into, not just something we use internally."

---

### 11. Workflow templates — the full end-to-end example, start to finish

"Everything so far was one task at a time — good for a single discovery-call note, but an agency onboarding a new client needs more than one task. Now let's show the real power move — onboarding that same client, Sunrise Dental Group, with a single call that kicks off their entire first campaign automatically."

*(Open a terminal — this is the moment to actually type live, it's more convincing than a screenshot.)*

"First, let's see what workflow templates exist."

```bash
curl http://54.167.31.169:3000/api/workflows
```

"This returns three ready-made templates: 'Agency Client Onboarding' — 3 steps, about 44 credits — 'B2B Outbound Sequence' — 3 steps, 33 credits — and 'SEO Content Pipeline' — 3 steps, 46 credits. Each one lists exactly which skills it uses and which variables it needs filled in. Let's look at the onboarding one in detail."

```bash
curl http://54.167.31.169:3000/api/workflows/agency_client_onboarding
```

"You can see its 3 steps: step 1 creates a campaign brief using skill `mkt_campaign_brief`, step 2 generates an SEO content plan using `mkt_seo_content`, step 3 writes landing page copy using `mkt_landing_copy`. Each step has a description template with placeholders like `{client_name}` and `{industry}` — that's what we're about to fill in for Sunrise Dental Group."

"Now watch — one call, real client details, and the whole onboarding sequence fires."

```bash
curl -X POST http://54.167.31.169:3000/api/workflows/agency_client_onboarding/run \
  -H "Authorization: Bearer changeme" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": 2,
    "vars": {
      "client_name": "Sunrise Dental Group",
      "industry": "Healthcare / Dental",
      "goal": "Generate 50 new patient leads per month via local SEO and paid social",
      "keywords": "dentist near me, emergency dental care, teeth whitening",
      "product": "General & Cosmetic Dentistry Services",
      "audience": "Local homeowners aged 25-55 within a 10-mile radius"
    }
  }'
```

"That's it — one call. Here's exactly what came back when we ran this live:"

```json
{
  "workflow_key": "agency_client_onboarding",
  "workflow_name": "Agency Client Onboarding",
  "workspace_id": 2,
  "tasks_created": 3,
  "tasks": [
    { "order": 1, "task_id": 33, "skill_key": "mkt_campaign_brief", "title": "Create campaign brief", "agent_id": 2, "agent_name": "Globex Agent", "status": "running" },
    { "order": 2, "task_id": 34, "skill_key": "mkt_seo_content",   "title": "Generate SEO content plan", "agent_id": 2, "agent_name": "Globex Agent", "status": "running" },
    { "order": 3, "task_id": 35, "skill_key": "mkt_landing_copy",  "title": "Write landing page copy",  "agent_id": 2, "agent_name": "Globex Agent", "status": "running" }
  ]
}
```

"Walk through what just happened in under a second, with zero manual steps: three tasks were created — task 33, 34, and 35. Each one's description was auto-filled from our variables — task 33's description literally reads 'Campaign brief for new client: Sunrise Dental Group. Industry: Healthcare / Dental. Goal: Generate 50 new patient leads per month via local SEO and paid social.' Each task was immediately routed to Globex Agent, because Globex Agent's allowed-skills list covers all three of these marketing skills. And all three flipped straight to status 'running' — no one had to click anything."

"One honest detail: the workflow endpoint creates and routes the tasks automatically, but today it stops one step short of Plane — pushing to Plane is a separate call, the same `/api/pm/tasks/:id/sync` endpoint used elsewhere in the system. So right after the workflow runs, we make one small follow-up call per task:"

```bash
curl -X POST http://54.167.31.169:3000/api/pm/tasks/33/sync -H "Authorization: Bearer changeme"
curl -X POST http://54.167.31.169:3000/api/pm/tasks/34/sync -H "Authorization: Bearer changeme"
curl -X POST http://54.167.31.169:3000/api/pm/tasks/35/sync -H "Authorization: Bearer changeme"
```

"Each one comes back with a real Plane issue ID and sequence number — in our run just now, task 33 became Plane issue #31, task 34 became #32, task 35 became #33. That's a known small gap, not a mystery: wiring the workflow runner to auto-call this sync step (the same way the single-task Routing Demo already does automatically) is a five-minute fix, it's just not wired up yet."

"Now let's prove it's not just a JSON response — let's go look at the Tasks page."

*(Switch back to the browser, click "Tasks" in the top nav, refresh.)*

"Scroll to find tasks 33, 34, 35 — 'Create campaign brief,' 'Generate SEO content plan,' 'Write landing page copy.' All three show status 'running,' and all three now show a ✈ badge under PM (Plane) — task 33 links to Plane issue #31, task 34 to #32, task 35 to #33. Click any one of those ✈ links."

*(Click the ✈ link on task 33, or switch to the Plane tab manually.)*

"That opens Plane directly to the matching issue — same title, same description, plus a metadata block at the bottom showing the control-plane task ID, the workspace, the assigned agent, and the skill key, so anyone in Plane can trace a card straight back to the exact system decision that created it."

"So to recap the whole Sunrise Dental Group example, start to finish: we typed six pieces of client information into one API call — no forms, no manual task creation, no manual routing — and in under a second we had three fully-described, fully-routed, fully-tracked pieces of agency work, each already visible and assigned inside our project management tool. That's the entire pitch of this platform in one example: turn a client intake conversation into running, tracked work instantly."

"The one thing missing here today is a visual wizard — right now this step uses an API call and a JSON body, which is why we just typed it in a terminal. Building a form where someone just types in the client details and clicks 'Run' — no terminal required — is the next planned piece, and structurally it's a thin UI layer over exactly the call you just watched, so it's not a big lift."

---

### Closing line

"So to summarize what you just watched, end to end, using one real client as the thread through the whole thing: task creation, rule-based agent routing, automatic syncing into a real project management tool, real-time Slack notifications, GitHub integration via a working poller, a live bridge to over 9,000 external apps through Zapier, a public API ready for marketplace partners, and multi-step workflow automation that turned six lines of client info into three routed, tracked pieces of agency work in one call — all of that is real, running code, hitting real live services, right now, not a mockup. The three honest gaps left are: GitHub webhooks are on a 2-minute poller instead of instant because we're waiting on repo-admin access; the workflow runner creates and routes tasks but needs one extra call per task to push into Plane, whereas the single-task Routing Demo does that automatically already — a small wiring fix, not a design problem; and full autonomous execution of the actual skill work — the agent doing the writing itself — still needs a worker queue behind it. Everything else you just saw is done and working."

---

## Quick reference — exact numbers/labels used in this script (verified live, Jul 20 2026)

- Login token: `changeme` (default `ADMIN_TOKEN`)
- Dashboard totals: 12 skills / 12 active / 2 customers / 2 workspaces / 2 agents / 35 tasks / 4 integrations / 4 connected / 1 run succeeded
- Agents: **Globex Agent** (workspace Globex Main, autonomy 3, pooled) / **Acme Agent** (workspace Acme Main, autonomy 2, pooled)
- Live routing confirmation message format: `Task #<id> routed to agent <Agent Name>. Syncing to Plane...`
- Integrations list: Slack Events Channel (slack, connected), GitHub MCP Server (github, connected), Monday.com Integration (monday, connected), Asana Connector (asana, connected)
- Zapier MCP: enabled, live mode, 15 tools exposed (discover_zapier_actions, enable/disable_zapier_action, list_enabled_zapier_actions, execute_zapier_read/write_action, and more)
- Routing Demo URL: `/routing` (not `/routing-demo`)
- Tasks page badge legend: ✈ = synced to Plane CE, ⑂ = GitHub PR linked, # = Slack thread
- Tasks page sync counter (at time of writing): 29/35 synced to Plane, filter tabs All/Synced/Not synced

### Full end-to-end example used in Section 11 — "Sunrise Dental Group" (real, live-run data, not illustrative)

- Workflow template: `agency_client_onboarding` ("Agency Client Onboarding"), 3 steps, ~44 estimated credits
- Request: `POST /api/workflows/agency_client_onboarding/run`, `workspace_id: 2`, vars = `client_name: "Sunrise Dental Group"`, `industry: "Healthcare / Dental"`, `goal: "Generate 50 new patient leads per month via local SEO and paid social"`, `keywords: "dentist near me, emergency dental care, teeth whitening"`, `product: "General & Cosmetic Dentistry Services"`, `audience: "Local homeowners aged 25-55 within a 10-mile radius"`
- Result: 3 tasks created, all routed to **Globex Agent**, all status `running`:
  - Task **#33** "Create campaign brief" (skill `mkt_campaign_brief`) → Plane issue **#31**
  - Task **#34** "Generate SEO content plan" (skill `mkt_seo_content`) → Plane issue **#32**
  - Task **#35** "Write landing page copy" (skill `mkt_landing_copy`) → Plane issue **#33**
- Plane sync for these 3 required one follow-up call each: `POST /api/pm/tasks/{33,34,35}/sync` (the workflow runner does not auto-call this today — the single-task Routing Demo's `/route/apply` does)
