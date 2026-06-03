const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then((r) => r.rows);

router.get('/dashboard/summary', async (_req, res) => {
  try {
    const [
      skills,
      activeSkills,
      packages,
      suites,
      overlays,
      customers,
      workspaces,
      agents,
      runs,
      pendingApprovals,
      integrations,
      connectedIntegrations,
      tasks,
    ] = await Promise.all([
      q('SELECT COUNT(*)::int AS count FROM skills'),
      q("SELECT COUNT(*)::int AS count FROM skills WHERE lifecycle = 'enabled'"),
      q('SELECT COUNT(*)::int AS count FROM skill_packages'),
      q('SELECT COUNT(*)::int AS count FROM department_suites'),
      q('SELECT COUNT(*)::int AS count FROM industry_overlays'),
      q('SELECT COUNT(*)::int AS count FROM customers'),
      q('SELECT COUNT(*)::int AS count FROM workspaces'),
      q('SELECT COUNT(*)::int AS count FROM agent_profiles'),
      q('SELECT COUNT(*)::int AS count FROM skill_runs'),
      q("SELECT COUNT(*)::int AS count FROM approval_gates WHERE status = 'pending'"),
      q('SELECT COUNT(*)::int AS count FROM integration_connections'),
      q("SELECT COUNT(*)::int AS count FROM integration_connections WHERE status = 'connected' AND active = true"),
      q('SELECT COUNT(*)::int AS count FROM task_intake'),
    ]);

    const runsByState = await q(
      `SELECT state, COUNT(*)::int AS count FROM skill_runs GROUP BY state ORDER BY count DESC`
    );
    const skillsByLifecycle = await q(
      `SELECT lifecycle, COUNT(*)::int AS count FROM skills GROUP BY lifecycle ORDER BY count DESC`
    );

    res.json({
      totals: {
        skills: skills[0]?.count ?? 0,
        active_skills: activeSkills[0]?.count ?? 0,
        packages: packages[0]?.count ?? 0,
        suites: suites[0]?.count ?? 0,
        overlays: overlays[0]?.count ?? 0,
        customers: customers[0]?.count ?? 0,
        workspaces: workspaces[0]?.count ?? 0,
        agents: agents[0]?.count ?? 0,
        runs: runs[0]?.count ?? 0,
        pending_approvals: pendingApprovals[0]?.count ?? 0,
        integrations: integrations[0]?.count ?? 0,
        connected_integrations: connectedIntegrations[0]?.count ?? 0,
        tasks: tasks[0]?.count ?? 0,
      },
      runs_by_state: runsByState,
      skills_by_lifecycle: skillsByLifecycle,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: 'dashboard_summary_failed', details: String(e) });
  }
});

module.exports = router;
