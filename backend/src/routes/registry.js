const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (text, params = []) => pool.query(text, params).then(r => r.rows);

// Sources CRUD
router.get('/sources', async (_req, res) => res.json(await q('SELECT * FROM skill_sources ORDER BY id DESC')));
router.post('/sources', async (req, res) => {
  const { name, url, type, trust, pinned_ref, review } = req.body;
  const rows = await q(
    'INSERT INTO skill_sources(name,url,type,trust,pinned_ref,review) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [name, url, type, trust, pinned_ref, review]
  );
  res.status(201).json(rows[0]);
});
router.put('/sources/:id', async (req, res) => {
  const p = req.body, id = req.params.id;
  const rows = await q(
    'UPDATE skill_sources SET name=COALESCE($1,name), url=COALESCE($2,url), type=COALESCE($3,type), trust=COALESCE($4,trust), pinned_ref=COALESCE($5,pinned_ref), review=COALESCE($6,review) WHERE id=$7 RETURNING *',
    [p.name, p.url, p.type, p.trust, p.pinned_ref, p.review, id]
  );
  res.json(rows[0] || null);
});
router.delete('/sources/:id', async (req, res) => { await q('DELETE FROM skill_sources WHERE id=$1', [req.params.id]); res.status(204).end(); });

// Skills CRUD
router.get('/skills', async (_req, res) => res.json(await q('SELECT * FROM skills ORDER BY id DESC')));
router.post('/skills', async (req, res) => {
  const { key, name, source_id, lifecycle, department_tags, industry_tags, risk_tier, credit_cost, required_approvals, allowed_tools, metadata } = req.body;
  const rows = await q(
    'INSERT INTO skills(key,name,source_id,lifecycle,department_tags,industry_tags,risk_tier,credit_cost,required_approvals,allowed_tools,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
    [key, name, source_id, lifecycle, department_tags, industry_tags, risk_tier, credit_cost, required_approvals, allowed_tools, metadata]
  );
  res.status(201).json(rows[0]);
});
router.put('/skills/:id', async (req, res) => {
  const p = req.body, id = req.params.id;
  const rows = await q(
    'UPDATE skills SET key=COALESCE($1,key), name=COALESCE($2,name), source_id=COALESCE($3,source_id), lifecycle=COALESCE($4,lifecycle), department_tags=COALESCE($5,department_tags), industry_tags=COALESCE($6,industry_tags), risk_tier=COALESCE($7,risk_tier), credit_cost=COALESCE($8,credit_cost), required_approvals=COALESCE($9,required_approvals), allowed_tools=COALESCE($10,allowed_tools), metadata=COALESCE($11,metadata) WHERE id=$12 RETURNING *',
    [p.key, p.name, p.source_id, p.lifecycle, p.department_tags, p.industry_tags, p.risk_tier, p.credit_cost, p.required_approvals, p.allowed_tools, p.metadata, id]
  );
  res.json(rows[0] || null);
});
router.delete('/skills/:id', async (req, res) => { await q('DELETE FROM skills WHERE id=$1', [req.params.id]); res.status(204).end(); });

// Packages CRUD
router.get('/packages', async (_req, res) => res.json(await q('SELECT * FROM skill_packages ORDER BY id DESC')));
router.post('/packages', async (req, res) => {
  const { skill_id, version, registry, integrity_hash } = req.body;
  const rows = await q(
    'INSERT INTO skill_packages(skill_id,version,registry,integrity_hash) VALUES ($1,$2,$3,$4) RETURNING *',
    [skill_id, version, registry, integrity_hash]
  );
  res.status(201).json(rows[0]);
});
router.put('/packages/:id', async (req, res) => {
  const p = req.body, id = req.params.id;
  const rows = await q(
    'UPDATE skill_packages SET skill_id=COALESCE($1,skill_id), version=COALESCE($2,version), registry=COALESCE($3,registry), integrity_hash=COALESCE($4,integrity_hash) WHERE id=$5 RETURNING *',
    [p.skill_id, p.version, p.registry, p.integrity_hash, id]
  );
  res.json(rows[0] || null);
});
router.delete('/packages/:id', async (req, res) => { await q('DELETE FROM skill_packages WHERE id=$1', [req.params.id]); res.status(204).end(); });

module.exports = router;
