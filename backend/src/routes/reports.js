const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// Credit consumption by day for last 30 days (optionally filter by workspace)
router.get('/reports/credits/summary', async (req, res) => {
  const { workspace_id } = req.query;
  const params = [];
  let where = `WHERE charged_at >= now() - INTERVAL '30 days'`;
  if (workspace_id) {
    params.push(workspace_id);
    where = `WHERE workspace_id=$${params.length} AND charged_at >= now() - INTERVAL '30 days'`;
  }
  const rows = await q(
    `SELECT date_trunc('day', charged_at) AS day, SUM(credits) AS credits
     FROM usage_charges ${where}
     GROUP BY 1 ORDER BY 1`, params);
  const totals = await q(`SELECT COALESCE(SUM(credits),0) AS total FROM usage_charges ${where}`, params);
  res.json({ by_day: rows, total: totals[0]?.total || 0 });
});

// Per-workspace usage: runs and credits by skill and state
router.get('/reports/usage/workspace/:id', async (req, res) => {
  const id = req.params.id;
  const bySkill = await q(
    `SELECT skill_id, COUNT(*) AS runs, SUM(credits_charged) AS credits
     FROM skill_runs WHERE workspace_id=$1 GROUP BY 1 ORDER BY credits DESC NULLS LAST`, [id]);
  const byState = await q(
    `SELECT state, COUNT(*) AS runs FROM skill_runs WHERE workspace_id=$1 GROUP BY 1 ORDER BY runs DESC`, [id]);
  res.json({ bySkill, byState });
});

// Adoption: active assignments of suites/overlays per workspace and overall counts
router.get('/reports/adoption', async (_req, res) => {
  const suites = await q(`SELECT suite_id, COUNT(*) AS workspaces FROM workspace_suite_assignments WHERE active=true GROUP BY 1 ORDER BY workspaces DESC`);
  const overlays = await q(`SELECT overlay_id, COUNT(*) AS workspaces FROM workspace_overlay_assignments WHERE active=true GROUP BY 1 ORDER BY workspaces DESC`);
  res.json({ suites, overlays });
});

// Agent utilization: runs per agent and success rate
router.get('/reports/agents/utilization', async (req, res) => {
  const { workspace_id } = req.query;
  const params = [];
  let where = '';
  if (workspace_id) { params.push(workspace_id); where = `WHERE workspace_id=$${params.length}`; }
  const byAgent = await q(
    `SELECT agent_id, COUNT(*) AS runs,
            SUM(CASE WHEN state='succeeded' THEN 1 ELSE 0 END) AS succeeded,
            ROUND(100.0 * SUM(CASE WHEN state='succeeded' THEN 1 ELSE 0 END)::numeric / GREATEST(COUNT(*),1),2) AS success_rate
     FROM skill_runs ${where}
     GROUP BY 1 ORDER BY runs DESC`, params);
  res.json({ byAgent });
});

// Governance events: approvals required/granted/denied counts from audit logs
router.get('/reports/governance', async (_req, res) => {
  const reqd = await q(`SELECT COUNT(*)::int AS count FROM audit_logs WHERE event_type='approval_required'`);
  const granted = await q(`SELECT COUNT(*)::int AS count FROM audit_logs WHERE event_type='approval_granted'`);
  const denied = await q(`SELECT COUNT(*)::int AS count FROM audit_logs WHERE event_type='approval_denied'`);
  res.json({
    approval_required: Number(reqd[0]?.count ?? 0),
    approval_granted: Number(granted[0]?.count ?? 0),
    approval_denied: Number(denied[0]?.count ?? 0),
  });
});

// Billing-ready analytics summaries: monthly credits per workspace/customer
router.get('/reports/billing', async (_req, res) => {
  const monthly = await q(
    `SELECT date_trunc('month', charged_at) AS month, workspace_id, customer_id, SUM(credits) AS credits
     FROM usage_charges GROUP BY 1,2,3 ORDER BY 1 DESC, credits DESC`);
  res.json({ monthly });
});

// Cross-sell insights: top overlays adopted per suite, and vice versa
router.get('/reports/cross-sell', async (_req, res) => {
  const overlayToSuite = await q(
    `SELECT os.overlay_id, os.suite_id, COUNT(*) AS cnt
     FROM overlay_suites os
     GROUP BY 1,2 ORDER BY cnt DESC LIMIT 100`);
  const suiteAdoption = await q(
    `SELECT was.suite_id, COUNT(*) AS workspaces
     FROM workspace_suite_assignments was WHERE was.active=true GROUP BY 1 ORDER BY workspaces DESC LIMIT 100`);
  const overlayAdoption = await q(
    `SELECT woa.overlay_id, COUNT(*) AS workspaces
     FROM workspace_overlay_assignments woa WHERE woa.active=true GROUP BY 1 ORDER BY workspaces DESC LIMIT 100`);
  res.json({ overlayToSuite, suiteAdoption, overlayAdoption });
});

module.exports = router;
