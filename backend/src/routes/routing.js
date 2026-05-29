const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// Naive routing engine: choose an agent in the workspace with allowed_skill_keys matching requested skill_key,
// autonomy_level >= requested autonomy, and (optionally) risk-tier aware (simple threshold).
async function pickAgent({ workspace_id, skill_key, min_autonomy = 0, risk_tier = 0 }) {
  const agents = await q('SELECT * FROM agent_profiles WHERE workspace_id=$1 ORDER BY pooled DESC, autonomy_level DESC', [workspace_id]);
  for (const a of agents) {
    const allowed = Array.isArray(a.allowed_skill_keys) ? a.allowed_skill_keys : [];
    if ((allowed.length === 0 || allowed.includes(skill_key)) && a.autonomy_level >= min_autonomy) {
      // simplistic risk check: require autonomy >= risk_tier
      if (a.autonomy_level >= (risk_tier || 0)) return a;
    }
  }
  return null;
}

// Compute route recommendation (does not persist)
router.post('/route', async (req, res) => {
  const { workspace_id, task_id, skill_key, min_autonomy, risk_tier } = req.body;
  const agent = await pickAgent({ workspace_id, skill_key, min_autonomy, risk_tier });
  if (!agent) return res.status(404).json({ error: 'no_agent_found' });
  res.json({ agent_id: agent.id, agent_name: agent.name });
});

// Apply routing (persist task_route and create orchestration_run stub)
router.post('/route/apply', async (req, res) => {
  const { task_id, workspace_id, skill_key, min_autonomy, risk_tier, manual, reason } = req.body;
  const agent = manual ? null : await pickAgent({ workspace_id, skill_key, min_autonomy, risk_tier });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const route = await client.query(
      'INSERT INTO task_routes(task_id,agent_id,reason,manual) VALUES ($1,$2,$3,COALESCE($4,false)) RETURNING *',
      [task_id, agent ? agent.id : null, reason || (agent ? 'engine:auto' : 'manual'), manual]
    );
    const run = await client.query(
      'INSERT INTO orchestration_runs(task_id,agent_id,skill_key,approval_required,status) VALUES ($1,$2,$3,COALESCE($4,false),\'pending\') RETURNING *',
      [task_id, agent ? agent.id : null, skill_key, false]
    );
    await client.query('COMMIT');
    res.status(201).json({ route: route.rows[0], run: run.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'route_failed', details: String(e) });
  } finally {
    client.release();
  }
});

module.exports = router;
