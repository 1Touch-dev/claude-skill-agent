const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// Task intake CRUD (simple)
router.get('/tasks', async (_req, res) => res.json(await q('SELECT * FROM task_intake ORDER BY id DESC')));
router.post('/tasks', async (req, res) => {
  const { workspace_id, customer_id, title, description, risk_tier, routing_mode, status, created_by } = req.body;
  const rows = await q('INSERT INTO task_intake(workspace_id,customer_id,title,description,risk_tier,routing_mode,status,created_by) VALUES ($1,$2,$3,$4,COALESCE($5,0),COALESCE($6,\'auto\'),COALESCE($7,\'queued\'),$8) RETURNING *', [workspace_id, customer_id, title, description, risk_tier, routing_mode, status, created_by]);
  res.status(201).json(rows[0]);
});
router.put('/tasks/:id', async (req, res) => {
  const id = req.params.id; const p = req.body;
  const rows = await q('UPDATE task_intake SET title=COALESCE($1,title), description=COALESCE($2,description), risk_tier=COALESCE($3,risk_tier), routing_mode=COALESCE($4,routing_mode), status=COALESCE($5,status) WHERE id=$6 RETURNING *', [p.title, p.description, p.risk_tier, p.routing_mode, p.status, id]);
  res.json(rows[0] || null);
});
router.delete('/tasks/:id', async (req, res) => { await q('DELETE FROM task_intake WHERE id=$1', [req.params.id]); res.status(204).end(); });

module.exports = router;
