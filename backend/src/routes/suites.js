const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

async function skillIsSafe(skill_id){
  const rows = await q(`SELECT s.*, ss.pinned_ref FROM skills s LEFT JOIN skill_sources ss ON ss.id=s.source_id WHERE s.id=$1`, [skill_id]);
  const s = rows[0];
  if (!s) return { allowed:false, reasons:['not_found'] };
  const reasons=[];
  if (s.quarantined) reasons.push('quarantined');
  if (s.review !== 'reviewed') reasons.push('unreviewed');
  if (!s.pinned_commit && !s.pinned_ref) reasons.push('unpinned');
  if (!s.instruction_only && s.trust !== 'trusted' && !s.sandbox_required) reasons.push('sandbox_required_not_set');
  return { allowed: reasons.length===0, reasons };
}


// Suites CRUD
router.get('/suites', async (_req, res) => res.json(await q('SELECT * FROM department_suites ORDER BY id DESC')));
router.post('/suites', async (req, res) => {
  const { key, name, buyer_persona, department_labels, included_credits, metadata } = req.body;
  const rows = await q(
    'INSERT INTO department_suites(key,name,buyer_persona,department_labels,included_credits,metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [key, name, buyer_persona, department_labels, included_credits, metadata]
  );
  res.status(201).json(rows[0]);
});
router.put('/suites/:id', async (req, res) => {
  const id = req.params.id; const p = req.body;
  const rows = await q(
    'UPDATE department_suites SET key=COALESCE($1,key), name=COALESCE($2,name), buyer_persona=COALESCE($3,buyer_persona), department_labels=COALESCE($4,department_labels), included_credits=COALESCE($5,included_credits), metadata=COALESCE($6,metadata) WHERE id=$7 RETURNING *',
    [p.key, p.name, p.buyer_persona, p.department_labels, p.included_credits, p.metadata, id]
  );
  res.json(rows[0] || null);
});
router.delete('/suites/:id', async (req, res) => { await q('DELETE FROM department_suites WHERE id=$1', [req.params.id]); res.status(204).end(); });

// Overlays CRUD
router.get('/overlays', async (_req, res) => res.json(await q('SELECT * FROM industry_overlays ORDER BY id DESC')));
router.post('/overlays', async (req, res) => {
  const { key, name, add_on_licensing, included_credits, metadata } = req.body;
  const rows = await q(
    'INSERT INTO industry_overlays(key,name,add_on_licensing,included_credits,metadata) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [key, name, add_on_licensing, included_credits, metadata]
  );
  res.status(201).json(rows[0]);
});
router.put('/overlays/:id', async (req, res) => {
  const id = req.params.id; const p = req.body;
  const rows = await q(
    'UPDATE industry_overlays SET key=COALESCE($1,key), name=COALESCE($2,name), add_on_licensing=COALESCE($3,add_on_licensing), included_credits=COALESCE($4,included_credits), metadata=COALESCE($5,metadata) WHERE id=$6 RETURNING *',
    [p.key, p.name, p.add_on_licensing, p.included_credits, p.metadata, id]
  );
  res.json(rows[0] || null);
});
router.delete('/overlays/:id', async (req, res) => { await q('DELETE FROM industry_overlays WHERE id=$1', [req.params.id]); res.status(204).end(); });

// Composition endpoints (add/remove skills/packages)
router.post('/suites/:id/skills', async (req, res) => {
  const safe = await skillIsSafe(req.body.skill_id);
  if (!safe.allowed) return res.status(400).json({ error: 'skill_not_safe', reasons: safe.reasons });
  const id = req.params.id; const { skill_id } = req.body;
  const rows = await q('INSERT INTO suite_included_skills(suite_id,skill_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *', [id, skill_id]);
  res.status(201).json(rows[0] || { inserted: false });
});
router.post('/suites/:id/packages', async (req, res) => {
  const id = req.params.id; const { package_id } = req.body;
  const rows = await q('INSERT INTO suite_included_packages(suite_id,package_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *', [id, package_id]);
  res.status(201).json(rows[0] || { inserted: false });
});
router.post('/overlays/:id/skills', async (req, res) => {
  const safe = await skillIsSafe(req.body.skill_id);
  if (!safe.allowed) return res.status(400).json({ error: 'skill_not_safe', reasons: safe.reasons });
  const id = req.params.id; const { skill_id } = req.body;
  const rows = await q('INSERT INTO overlay_included_skills(overlay_id,skill_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *', [id, skill_id]);
  res.status(201).json(rows[0] || { inserted: false });
});
router.post('/overlays/:id/packages', async (req, res) => {
  const id = req.params.id; const { package_id } = req.body;
  const rows = await q('INSERT INTO overlay_included_packages(overlay_id,package_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *', [id, package_id]);
  res.status(201).json(rows[0] || { inserted: false });
});

// Overlay-to-suite relationship
router.post('/overlays/:overlay_id/suites', async (req, res) => {
  const overlay_id = req.params.overlay_id; const { suite_id } = req.body;
  const rows = await q('INSERT INTO overlay_suites(overlay_id,suite_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *', [overlay_id, suite_id]);
  res.status(201).json(rows[0] || { inserted: false });
});

// Activation endpoints
router.post('/activation/suites/workspace', async (req, res) => {
  const { workspace_id, suite_id, active, config } = req.body;
  const rows = await q('INSERT INTO workspace_suite_activations(workspace_id,suite_id,active,config) VALUES ($1,$2,COALESCE($3,true),COALESCE($4,\'{}\'::jsonb)) ON CONFLICT (workspace_id,suite_id) DO UPDATE SET active=EXCLUDED.active, config=EXCLUDED.config RETURNING *', [workspace_id, suite_id, active, config]);
  res.status(201).json(rows[0]);
});
router.post('/activation/suites/customer', async (req, res) => {
  const { customer_id, suite_id, active, config } = req.body;
  const rows = await q('INSERT INTO customer_suite_activations(customer_id,suite_id,active,config) VALUES ($1,$2,COALESCE($3,true),COALESCE($4,\'{}\'::jsonb)) ON CONFLICT (customer_id,suite_id) DO UPDATE SET active=EXCLUDED.active, config=EXCLUDED.config RETURNING *', [customer_id, suite_id, active, config]);
  res.status(201).json(rows[0]);
});
router.post('/activation/overlays/workspace', async (req, res) => {
  const { workspace_id, overlay_id, active, config } = req.body;
  const rows = await q('INSERT INTO workspace_overlay_activations(workspace_id,overlay_id,active,config) VALUES ($1,$2,COALESCE($3,true),COALESCE($4,\'{}\'::jsonb)) ON CONFLICT (workspace_id,overlay_id) DO UPDATE SET active=EXCLUDED.active, config=EXCLUDED.config RETURNING *', [workspace_id, overlay_id, active, config]);
  res.status(201).json(rows[0]);
});
router.post('/activation/overlays/customer', async (req, res) => {
  const { customer_id, overlay_id, active, config } = req.body;
  const rows = await q('INSERT INTO customer_overlay_activations(customer_id,overlay_id,active,config) VALUES ($1,$2,COALESCE($3,true),COALESCE($4,\'{}\'::jsonb)) ON CONFLICT (customer_id,overlay_id) DO UPDATE SET active=EXCLUDED.active, config=EXCLUDED.config RETURNING *', [customer_id, overlay_id, active, config]);
  res.status(201).json(rows[0]);
});

module.exports = router;
