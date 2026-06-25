/**
 * Workflow templates — /api/workflows
 *
 * Pre-built multi-step workflows for agencies.
 * Each template defines a sequence of skills to run for a common use case.
 *
 * GET  /api/workflows          — list all templates
 * GET  /api/workflows/:key     — get a single template
 * POST /api/workflows/:key/run — create tasks for all steps, route each, return task IDs
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { pool } = require('../lib/db');

const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then((r) => r.rows);

const WORKFLOWS_DIR = path.join(__dirname, '../../data/workflows');

// Load all workflow templates from disk (synchronous at startup — small files)
function loadTemplates() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs.readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try { return JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8')); }
      catch (_) { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => a.key.localeCompare(b.key));
}

function getTemplate(key) {
  const filePath = path.join(WORKFLOWS_DIR, `${key}.json`);
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (_) { return null; }
}

// ── Agent picker (same logic as routing.js) ───────────────────────────────────
async function pickAgent({ workspace_id, skill_key, min_autonomy = 0, risk_tier = 0 }) {
  const agents = await q(
    'SELECT * FROM agent_profiles WHERE workspace_id=$1 ORDER BY pooled DESC, autonomy_level DESC',
    [workspace_id],
  );
  for (const a of agents) {
    const allowed = Array.isArray(a.allowed_skill_keys) ? a.allowed_skill_keys : [];
    if ((allowed.length === 0 || allowed.includes(skill_key)) && a.autonomy_level >= min_autonomy) {
      if (a.autonomy_level >= (risk_tier || 0)) return a;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workflows
// ─────────────────────────────────────────────────────────────────────────────
router.get('/workflows', (_req, res) => {
  const templates = loadTemplates();
  res.json({
    total: templates.length,
    workflows: templates.map(({ key, name, description, category, estimated_credits, steps, template_vars }) => ({
      key, name, description, category, estimated_credits,
      step_count: steps.length,
      skills_used: steps.map((s) => s.skill_key),
      template_vars: template_vars || [],
    })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workflows/:key
// ─────────────────────────────────────────────────────────────────────────────
router.get('/workflows/:key', (req, res) => {
  const tmpl = getTemplate(req.params.key);
  if (!tmpl) return res.status(404).json({ error: 'workflow_not_found', key: req.params.key });
  res.json(tmpl);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workflows/:key/run
// Body: { workspace_id, vars?: { key: value } }
//
// For each step:
//   1. Create task_intake row with interpolated description
//   2. Auto-route to agent
//   3. Create orchestration_run stub
//   4. Record results
// Returns: { workflow_key, tasks: [{ step, task_id, agent_name, skill_key }] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/workflows/:key/run', async (req, res) => {
  const tmpl = getTemplate(req.params.key);
  if (!tmpl) return res.status(404).json({ error: 'workflow_not_found', key: req.params.key });

  const { workspace_id, vars = {} } = req.body || {};
  if (!workspace_id) return res.status(400).json({ error: 'missing_field', field: 'workspace_id' });

  // Interpolate template variables
  function interpolate(str) {
    return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] || `{${k}}`);
  }

  const results = [];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const step of tmpl.steps.sort((a, b) => a.order - b.order)) {
      // Validate skill exists
      const skillRows = await client.query(
        "SELECT id, risk_tier FROM skills WHERE key=$1 AND lifecycle='enabled'",
        [step.skill_key],
      );
      if (!skillRows.rows[0]) {
        results.push({ order: step.order, skill_key: step.skill_key, error: 'skill_not_found' });
        continue;
      }
      const skill = skillRows.rows[0];

      // Create task
      const title = interpolate(step.title);
      const description = interpolate(step.description_template || step.title);
      const taskRow = await client.query(
        `INSERT INTO task_intake(workspace_id, title, description, risk_tier, routing_mode, status, created_by)
         VALUES ($1,$2,$3,$4,'auto','queued','workflow-runner') RETURNING *`,
        [workspace_id, title, description, skill.risk_tier],
      );
      const task = taskRow.rows[0];

      // Route + create run
      const agent = await pickAgent({ workspace_id, skill_key: step.skill_key });
      if (agent) {
        await client.query(
          'INSERT INTO task_routes(task_id, agent_id, reason, manual) VALUES ($1,$2,$3,false)',
          [task.id, agent.id, `workflow:${tmpl.key}`],
        );
        await client.query(
          `INSERT INTO orchestration_runs(task_id, agent_id, skill_key, approval_required, status)
           VALUES ($1,$2,$3,false,'pending')`,
          [task.id, agent.id, step.skill_key],
        );
        await client.query('UPDATE task_intake SET status=$1 WHERE id=$2', ['running', task.id]);
      }

      results.push({
        order: step.order,
        task_id: task.id,
        skill_key: step.skill_key,
        title,
        agent_id: agent ? agent.id : null,
        agent_name: agent ? agent.name : null,
        status: agent ? 'running' : 'queued',
      });
    }

    await client.query('COMMIT');

    res.status(201).json({
      workflow_key: tmpl.key,
      workflow_name: tmpl.name,
      workspace_id,
      tasks_created: results.filter((r) => r.task_id).length,
      tasks: results,
    });

  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'workflow_run_failed', details: String(e) });
  } finally {
    client.release();
  }
});

module.exports = router;
