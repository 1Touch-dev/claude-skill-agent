# MVP Demo Script — 5-Minute Executive Walkthrough

**Presenter:** Platform owner or technical lead  
**Audience:** James / executive stakeholders  
**Environment:** http://54.167.31.169:3001  
**Token:** `changeme` (Admin role)  
**Duration:** ~5 minutes  

---

## Before You Start

- [ ] Confirm UI loads: http://54.167.31.169:3001/login  
- [ ] Confirm API health: http://54.167.31.169:3000/health/live → `{"status":"ok"}`  
- [ ] Browser hard-refresh (Ctrl+Shift+R) if you previously saw localhost errors  
- [ ] Optional: seed a **pending approval** if you want live Approve/Reject buttons  

**Opening line:**  
“This is our Enterprise Claude Skills **control plane** — how we govern AI skills, agents, approvals, and integrations across customers and workspaces. GitHub and Slack are **live** on this branch; we route tasks to Plane and notify Slack automatically.”

---

## Minute 1 — Login and Dashboard

**Actions**

1. Open http://54.167.31.169:3001/login  
2. Show branding panel: multi-tenant control plane messaging.  
3. Enter token `changeme`, role **Admin**, **Continue to control plane**.  
4. Land on **Executive Dashboard**.

**Talking points**

- “Every metric you see is loaded live from our API — not a static mockup.”  
- “We track skills, agents, runs, approvals, integrations, customers, and workspaces in one place.”  
- “This is the executive view operations and leadership will use daily.”

**Expected outcomes**

- Dashboard cards populate (e.g. 6 skills, 2 agents, 2 customers).  
- **Runs by state** and **Skills by lifecycle** panels show data.  
- No red error banners.

---

## Minute 2 — Skills Registry

**Actions**

1. Click **Skills** in the sidebar.  
2. Show the table (keys, lifecycle, risk tier, trust).  
3. Search **Campaign** → filter to **Campaign Brief Generator**.

**Talking points**

- “Skills are licensed product units — registered, governed, and lifecycle-managed.”  
- “Risk tier and review state support security and compliance workflows.”  
- “Marketing’s campaign brief skill is enabled and ready for routing.”

**Expected outcomes**

- `GET /api/skills` succeeds; table shows 6 skills.  
- Search reduces rows to 1 matching skill.

---

## Minute 3 — Integrations + live sync

**Actions**

1. Click **Integrations**.  
2. Point at seeded connectors: Asana, Monday, GitHub, Slack.  
3. Click **Test** on **GitHub** — show `mode: live` in response.  
4. Click **Test** on **Slack** — same.  
5. Optional: open **Routing Demo** → create task → **Route & Apply** → show Slack message in `#server-alerts` and ✈ badge on **Tasks**.

**Talking points**

- “GitHub and Slack use **live** API connections — not mock.”  
- “Route a task → Slack notification + Plane work item in one action.”  
- “GitHub PRs with `task-{id}` in the branch update task status and sync to Plane.”  
- “Asana/Monday/Trello remain registry-only until OAuth phase.”

**Expected outcomes**

- List loads; Test shows message like “MVP mock connection OK”.  
- Credentials column shows **configured**, not raw secrets.

**If asked “Is GitHub connected?”**  
“Registry and health workflow — yes. Live GitHub API sync — next phase.”

---

## Minute 4 — Routing Demo

**Actions**

1. Click **Routing Demo**.  
2. Workspace **2**, title “Executive Demo Campaign Brief”.  
3. Skill key: `mkt_campaign_brief`.  
4. **Create Task** → **Route & Apply** on the new task.  
5. Show **Last Routing Result** (agent name, e.g. Globex Agent).

**Talking points**

- “Work enters as **task intake**, the engine **routes** to the right agent by skill and workspace.”  
- “This creates orchestration and run records — foundation for full worker pipeline later.”  
- “Marketing campaign brief flows to an agent allowed to run that skill.”

**Expected outcomes**

- Task appears in recent list.  
- Route succeeds (no “no agent found” error).  
- Success message visible.

---

## Minute 5 — Audit + Reports (+ optional Approvals)

**Actions**

1. **Runs** — show run states (succeeded, approved, etc.).  
2. **Audit Logs** — enter Run ID `1` or latest run → **Load**.  
3. **Reports** — platform snapshot, lifecycle, governance counts.  
4. *(Optional 30s)* **Approvals** — if pending row exists, **Approve** or show decided history.

**Talking points**

- “Audit is immutable evidence for compliance — who approved what, when.”  
- “Reports give adoption, credits, and governance metrics for leadership.”  
- “Approvals gate high-risk skills before execution.”

**Expected outcomes**

- Audit list shows events.  
- Reports panels populated; no console errors.  

**Closing line:**  
“This MVP demonstrates the **enterprise control plane** — governance, routing, audit, and reporting. Next phases: SSO, live integrations, workers, and full PM/RAG product.”

---

## Demo Exit Checklist

- [ ] Log out (shows session hygiene)  
- [ ] Hand off [user-guide.md](user-guide.md) and [mvp-known-limitations.md](mvp-known-limitations.md)  
- [ ] Offer [mvp-acceptance-report.md](mvp-acceptance-report.md) for technical validation proof  

---

## Troubleshooting (30 seconds)

| Issue | Fix |
|-------|-----|
| “Cannot reach API at localhost” | Hard refresh; use EC2 URL `54.167.31.169`, not localhost. |
| Routing “no agent found” | Use skill `mkt_campaign_brief`, workspace `2`. |
| No pending approvals | Use Approvals list history or seed pending row before demo. |

---

*5-minute executive demo script — Enterprise Claude Skills Platform MVP*
