# Message to James — MVP Update (copy/paste)

**Suggested channel:** WhatsApp or email  
**Demo link:** http://54.167.31.169:3001/login (token: `changeme`)

---

Hi James,

Quick update on the **Enterprise Claude Skills Platform** MVP — it’s ready for you to see.

**What it is**  
A multi-tenant **AI control plane** (not a task board). It’s the admin console to govern Claude skills, agents, customer workspaces, approvals, integrations, usage, and audit — how we’d run this at enterprise scale.

**What you can do in the demo today**  
- Sign in (admin/operator/viewer) at http://54.167.31.169:3001/login — token: `changeme`  
- **Dashboard** — live counts: skills, agents, runs, approvals, integrations, customers  
- **Skills & packages** — full registry with search and lifecycle  
- **Suites & overlays** — department and industry bundles  
- **Customers, workspaces, entitlements, credits** — multi-tenant commercial model  
- **Agents & runs** — who executes what, and run history  
- **Approvals** — approve or reject high-risk runs (writes to DB + audit)  
- **Integrations** — registry for Asana, GitHub, Slack, Monday, Trello + test connection  
- **Routing demo** — submit a task (e.g. marketing campaign brief), route to the right agent  
- **Audit logs** — inspect what happened on a run  
- **Reports** — governance, credits, utilization snapshots  

We’ve tested this on EC2 with real APIs (not mock UI numbers), including a live browser walkthrough and automated API checks — **demo-ready**.

**What it does *not* do yet (important for expectations)**  
- No corporate **SSO** (demo login token only)  
- Integrations are **registry + mock “test connection”** — not live OAuth or syncing with Asana/GitHub/Slack yet  
- No **background workers** or full autonomous orchestration (routing is a controlled demo)  
- No end-user **project management app**, **RAG/search**, or **brand voice** layer yet  
- Not production-hardened (observability, compliance exports, etc.)  

Roughly: **~75% of a credible stakeholder MVP**; **~35–40%** of the full enterprise vision in our requirements docs. The gap is intentional — we built the **control plane core** first.

**5-minute demo path for you**  
Login → Dashboard → Skills (search “Campaign”) → Integrations (Test) → Routing Demo → Audit → Reports.  
Script: `docs/mvp-demo-script.md` in the repo.

Happy to walk you through live whenever suits. Full docs are in the repo (`docs/user-guide.md`, `docs/mvp-known-limitations.md`).

Thanks,  
[Your name]
