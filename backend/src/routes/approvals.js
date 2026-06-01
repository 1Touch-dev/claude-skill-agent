const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// List all approvals
router.get('/approvals', async (_req, res) => {
  try {
    const rows = await q(
      `SELECT g.*, r.task_id, r.state AS run_state, s.name AS skill_name
       FROM approval_gates g
       JOIN skill_runs r ON g.run_id = r.id
       JOIN skills s ON r.skill_id = s.id
       ORDER BY g.id DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'failed_to_fetch_approvals', details: String(e) });
  }
});

// Decide an approval gate (grant or reject)
router.post('/approvals/:id/decide', async (req, res) => {
  const id = req.params.id;
  const { decision, decided_by, reason } = req.body; // decision: 'approved', 'rejected'
  
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'invalid_decision', message: 'Decision must be approved or rejected' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Update the approval gate status
    const gateRes = await client.query(
      `UPDATE approval_gates 
       SET status=$1, decided_by=$2, decided_at=now(), reason=$3 
       WHERE id=$4 RETURNING *`,
      [decision, decided_by || 'operator', reason, id]
    );
    const gate = gateRes.rows[0];
    if (!gate) {
      throw new Error('Approval gate not found');
    }

    // 2. Map and update the corresponding skill run state
    const targetState = decision === 'approved' ? 'approved' : 'failed';
    const runRes = await client.query(
      `UPDATE skill_runs SET state=$1, updated_at=now() WHERE id=$2 RETURNING *`,
      [targetState, gate.run_id]
    );

    // 3. Log to audit ledger
    const logEvent = decision === 'approved' ? 'approval_granted' : 'approval_denied';
    await client.query(
      `INSERT INTO audit_logs(run_id, event_type, actor, data) 
       VALUES ($1, $2, $3, $4)`,
      [gate.run_id, logEvent, decided_by || 'operator', JSON.stringify({ reason })]
    );

    await client.query('COMMIT');
    res.json({ approval: gate, run: runRes.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'decision_failed', details: String(e) });
  } finally {
    client.release();
  }
});

module.exports = router;
