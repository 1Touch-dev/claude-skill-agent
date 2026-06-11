const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// Agent Profiles CRUD
router.get('/agents', async (_req, res) => res.json(await q('SELECT * FROM agent_profiles ORDER BY id DESC')));
router.post('/agents', async (req, res) => {
  const { workspace_id, name, key, pooled, autonomy_level, allowed_skill_keys, allowed_tools, metadata } = req.body;
  const rows = await q(
    'INSERT INTO agent_profiles(workspace_id,name,key,pooled,autonomy_level,allowed_skill_keys,allowed_tools,metadata) VALUES ($1,$2,$3,COALESCE($4,false),COALESCE($5,0),COALESCE($6,\'{}\'::text[]),COALESCE($7,\'[]\'::jsonb),COALESCE($8,\'{}\'::jsonb)) RETURNING *',
    [workspace_id, name, key, pooled, autonomy_level, allowed_skill_keys, allowed_tools, metadata]
  );
  res.status(201).json(rows[0]);
});
router.put('/agents/:id', async (req, res) => {
  const id = req.params.id; const p = req.body;
  const rows = await q(
    'UPDATE agent_profiles SET workspace_id=COALESCE($1,workspace_id), name=COALESCE($2,name), key=COALESCE($3,key), pooled=COALESCE($4,pooled), autonomy_level=COALESCE($5,autonomy_level), allowed_skill_keys=COALESCE($6,allowed_skill_keys), allowed_tools=COALESCE($7,allowed_tools), metadata=COALESCE($8,metadata) WHERE id=$9 RETURNING *',
    [p.workspace_id, p.name, p.key, p.pooled, p.autonomy_level, p.allowed_skill_keys, p.allowed_tools, p.metadata, id]
  );
  res.json(rows[0] || null);
});
router.delete('/agents/:id', async (req, res) => { await q('DELETE FROM agent_profiles WHERE id=$1', [req.params.id]); res.status(204).end(); });

// Plane member mapping
router.get('/agents/:id/plane-member', async (req, res) => {
  const rows = await q('SELECT id, name, key, plane_member_id, plane_member_email FROM agent_profiles WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'agent_not_found' });
  const a = rows[0];
  res.json({ agent_id: a.id, name: a.name, key: a.key, plane_member_id: a.plane_member_id || null, plane_member_email: a.plane_member_email || null });
});

router.put('/agents/:id/plane-member', async (req, res) => {
  const { plane_member_id, plane_member_email } = req.body;
  if (plane_member_id !== null && typeof plane_member_id !== 'string') {
    return res.status(400).json({ error: 'plane_member_id must be a string UUID or null' });
  }
  const rows = await q(
    'UPDATE agent_profiles SET plane_member_id=$1, plane_member_email=$2 WHERE id=$3 RETURNING id, name, key, plane_member_id, plane_member_email',
    [plane_member_id || null, plane_member_email || null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'agent_not_found' });
  res.json(rows[0]);
});

module.exports = router;
