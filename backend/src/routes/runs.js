const express = require('express');
const crypto = require('crypto');
const { pool } = require('../lib/db');
const { chargeCredits } = require('../lib/metering');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// Create a new skill run (queued)
router.post('/runs', async (req, res) => {
  const { task_id, workspace_id, customer_id, user_id, agent_id, skill_id, risk_tier, approvals, tool_calls, state } = req.body;
  const rows = await q(
    `INSERT INTO skill_runs(task_id,workspace_id,customer_id,user_id,agent_id,skill_id,risk_tier,approvals,tool_calls,state)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,0),COALESCE($8,'[]'::jsonb),COALESCE($9,'[]'::jsonb),COALESCE($10,'queued')) RETURNING *`,
    [task_id, workspace_id, customer_id, user_id, agent_id, skill_id, risk_tier, approvals, tool_calls, state]
  );
  const run = rows[0];
  await q(`INSERT INTO audit_logs(run_id,event_type,actor,data) VALUES ($1,'run_created',$2,$3)`, [run.id, agent_id || null, { created: true }]);
  res.status(201).json(run);
});

// Update run state and timestamps
router.post('/runs/:id/state', async (req, res) => {
  const id = req.params.id; const { state } = req.body;
  let tsUpdate = '';
  if (state === 'started' || state === 'running') tsUpdate = ', started_at=COALESCE(started_at, now())';
  if (state === 'succeeded') tsUpdate = ', completed_at=now()';
  if (state === 'failed') tsUpdate = ', failed_at=now()';
  const rows = await q(`UPDATE skill_runs SET state=$1${tsUpdate}, updated_at=now() WHERE id=$2 RETURNING *`, [state, id]);
  await q(`INSERT INTO audit_logs(run_id,event_type,data) VALUES ($1,'state_changed',$2)`, [id, { state }]);
  res.json(rows[0] || null);
});

// Append audit log entry
router.post('/runs/:id/audit', async (req, res) => {
  const id = req.params.id; const { event_type, actor, data } = req.body;
  const rows = await q(`INSERT INTO audit_logs(run_id,event_type,actor,data) VALUES ($1,$2,$3,COALESCE($4,'{}'::jsonb)) RETURNING *`, [id, event_type, actor, data]);
  res.status(201).json(rows[0]);
});

// Record outputs and compute output hash
router.post('/runs/:id/output', async (req, res) => {
  const id = req.params.id; const { output } = req.body;
  const hash = crypto.createHash('sha256').update(JSON.stringify(output)).digest('hex');
  const rows = await q(`UPDATE skill_runs SET output_hash=$1, updated_at=now() WHERE id=$2 RETURNING *`, [hash, id]);
  await q(`INSERT INTO audit_logs(run_id,event_type,data) VALUES ($1,'output_recorded',$2)`, [id, { output_hash: hash }]);
  res.json({ run: rows[0], output_hash: hash });
});

// Charge credits for a run (and update pool tallies)
router.post('/runs/:id/charge', async (req, res) => {
  const id = parseInt(req.params.id, 10); const { workspace_id, customer_id, credits, metadata } = req.body;
  try {
    const charge = await chargeCredits({ workspace_id, customer_id, run_id: id, credits, metadata });
    await q(`INSERT INTO audit_logs(run_id,event_type,data) VALUES ($1,'credits_charged',$2)`, [id, { credits }]);
    res.status(201).json(charge);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Query runs by workspace/customer
router.get('/runs', async (req, res) => {
  const { workspace_id, customer_id, state, skill_id } = req.query;
  const where = [];
  const params = [];
  if (workspace_id) { params.push(workspace_id); where.push(`workspace_id=$${params.length}`); }
  if (customer_id) { params.push(customer_id); where.push(`customer_id=$${params.length}`); }
  if (state) { params.push(state); where.push(`state=$${params.length}`); }
  if (skill_id) { params.push(skill_id); where.push(`skill_id=$${params.length}`); }
  const sql = `SELECT * FROM skill_runs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT 200`;
  res.json(await q(sql, params));
});

// Fetch audit trail for a run
router.get('/runs/:id/audit', async (req, res) => {
  const id = req.params.id;
  const logs = await q(`SELECT * FROM audit_logs WHERE run_id=$1 ORDER BY event_at ASC`, [id]);
  res.json(logs);
});

module.exports = router;
