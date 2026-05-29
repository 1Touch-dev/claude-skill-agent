const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// Mark a skill's source/pinning + pure-instruction vs scripted flags
router.post('/security/skills/:id/pin', async (req, res) => {
  const id = req.params.id; const { pinned_commit, instruction_only, sandbox_required } = req.body;
  const rows = await q(`UPDATE skills SET pinned_commit=COALESCE($1,pinned_commit), instruction_only=COALESCE($2,instruction_only), sandbox_required=COALESCE($3,sandbox_required) WHERE id=$4 RETURNING *`, [pinned_commit, instruction_only, sandbox_required, id]);
  res.json(rows[0] || null);
});

// Record scan results (and update review/rejection/quarantine)
router.post('/security/skills/:id/scan', async (req, res) => {
  const id = req.params.id; const { status, findings, tool_version, reviewer, notes, quarantined, trust_score } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const scan = await client.query(
      `INSERT INTO security_scans(skill_id,status,findings,tool_version,reviewer,notes,completed_at)
       VALUES ($1,COALESCE($2,'reviewed'),COALESCE($3,'{}'::jsonb),$4,$5,$6,now()) RETURNING *`,
      [id, status, findings, tool_version, reviewer, notes]
    );
    const s = scan.rows[0];
    const r = await client.query(
      `UPDATE skills SET review=$1, scan_results=COALESCE($2,'{}'::jsonb), last_scan_at=now(), reviewed_by=COALESCE($3,reviewed_by), review_notes=COALESCE($4,review_notes), quarantined=COALESCE($5,quarantined), trust_score=COALESCE($6,trust_score)
       WHERE id=$7 RETURNING *`,
      [status || 'reviewed', findings, reviewer, notes, quarantined, trust_score, id]
    );
    await client.query('COMMIT');
    res.status(201).json({ scan: s, skill: r.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: String(e) });
  } finally {
    client.release();
  }
});

// Review decision and trust level
router.post('/security/skills/:id/review', async (req, res) => {
  const id = req.params.id; const { trust, trust_score, review, review_notes, reviewed_by, quarantined, sandbox_required } = req.body;
  const rows = await q(`UPDATE skills SET trust=COALESCE($1,trust), trust_score=COALESCE($2,trust_score), review=COALESCE($3,review), review_notes=COALESCE($4,review_notes), reviewed_by=COALESCE($5,reviewed_by), quarantined=COALESCE($6,quarantined), sandbox_required=COALESCE($7,sandbox_required) WHERE id=$8 RETURNING *`, [trust, trust_score, review, review_notes, reviewed_by, quarantined, sandbox_required, id]);
  res.json(rows[0] || null);
});

// Quarantine/unquarantine
router.post('/security/skills/:id/quarantine', async (req, res) => {
  const id = req.params.id; const { quarantined, note } = req.body;
  const rows = await q(`UPDATE skills SET quarantined=$1, review_notes=COALESCE(review_notes,'') || CASE WHEN $2 IS NULL THEN '' ELSE E'\n' || $2 END WHERE id=$3 RETURNING *`, [!!quarantined, note, id]);
  res.json(rows[0] || null);
});

// Activation guard: check a skill is safe for activation
router.get('/security/skills/:id/activation-check', async (req, res) => {
  const id = req.params.id;
  const rows = await q(`SELECT s.*, ss.pinned_ref FROM skills s LEFT JOIN skill_sources ss ON ss.id = s.source_id WHERE s.id=$1`, [id]);
  const s = rows[0];
  if (!s) return res.status(404).json({ error: 'not_found' });
  const reasons = [];
  if (s.quarantined) reasons.push('quarantined');
  if (s.review !== 'reviewed') reasons.push('unreviewed');
  if (!s.pinned_commit && !s.pinned_ref) reasons.push('unpinned');
  // If instruction_only is false (scripted), require sandbox unless trusted
  if (!s.instruction_only && s.trust !== 'trusted' && !s.sandbox_required) {
    reasons.push('sandbox_required_not_set');
  }
  const allowed = reasons.length === 0;
  res.json({ allowed, reasons, pinned: s.pinned_commit || s.pinned_ref, sandbox_required: s.sandbox_required, trust: s.trust, review: s.review });
});

module.exports = router;
