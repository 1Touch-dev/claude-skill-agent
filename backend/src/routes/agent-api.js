/**
 * Public Agent API  — /v1
 *
 * Simple REST surface designed for marketplace integrations (Asana, Monday, etc.)
 * and third-party developers.  Separate from the internal /api namespace so it
 * can have its own auth rules and rate-limit headers without touching the admin UI.
 *
 * Endpoints:
 *   GET  /v1/health
 *   GET  /v1/skills
 *   GET  /v1/skills/:key
 *   POST /v1/tasks
 *   GET  /v1/tasks/:id
 *   POST /v1/tasks/:id/route
 *   POST /v1/tasks/:id/run
 *   GET  /v1/tasks/:id/status
 */

const express = require('express');
const { pool } = require('../lib/db');
const plane = require('../services/pm-bridge');
const slack = require('../services/slack');

const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then((r) => r.rows);

// ── Auth middleware (API-key only, separate from admin bearer) ────────────────
const API_KEYS_V1 = String(process.env.API_KEYS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const REQUIRE_AUTH_V1 = String(process.env.REQUIRE_AUTH || 'false').toLowerCase() === 'true';

function agentApiAuth(req, res, next) {
  if (!REQUIRE_AUTH_V1) return next();
  const header = req.headers.authorization || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
  if (!token || !API_KEYS_V1.includes(token)) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid API key. Pass: Authorization: Bearer <API_KEY>',
    });
  }
  return next();
}

// Apply auth to every /v1 route
router.use(agentApiAuth);

// ── Rate-limit header helper (simple, in-memory) ──────────────────────────────
// Not a hard block today — just returns headers for transparency.
const RATE_LIMIT = 200; // requests per 15 min window per key
const windows = new Map();
function rateHint(req, res, next) {
  const key = (req.headers.authorization || 'anon').slice(-8);
  const now = Date.now();
  const win = windows.get(key) || { start: now, count: 0 };
  if (now - win.start > 15 * 60 * 1000) { win.start = now; win.count = 0; }
  win.count += 1;
  windows.set(key, win);
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT - win.count));
  return next();
}
router.use(rateHint);

// ── Shared helper: pick agent ─────────────────────────────────────────────────
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
// GET /v1/health
// ─────────────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => res.json({ status: 'ok', version: '1', service: 'agent-api' }));

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/skills
// Returns all enabled skills (safe public subset of fields).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/skills', async (_req, res) => {
  try {
    const rows = await q(
      `SELECT key, name, department_tags, industry_tags, risk_tier, credit_cost,
              metadata->>'description'   AS description,
              metadata->>'example_prompt' AS example_prompt,
              metadata->>'category'      AS category
       FROM skills WHERE lifecycle = 'enabled' ORDER BY id`,
    );
    res.json({ skills: rows, total: rows.length });
  } catch (e) {
    res.status(500).json({ error: 'internal_error', details: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/skills/:key
// ─────────────────────────────────────────────────────────────────────────────
router.get('/skills/:key', async (req, res) => {
  try {
    const rows = await q(
      `SELECT key, name, department_tags, industry_tags, risk_tier, credit_cost,
              metadata->>'description'   AS description,
              metadata->>'example_prompt' AS example_prompt,
              metadata->>'category'      AS category,
              lifecycle
       FROM skills WHERE key=$1`,
      [req.params.key],
    );
    if (!rows[0]) return res.status(404).json({ error: 'skill_not_found', key: req.params.key });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'internal_error', details: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tasks
// Body: { workspace_id, title, description?, skill_key }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/tasks', async (req, res) => {
  const { workspace_id, title, description, skill_key } = req.body || {};
  if (!workspace_id) return res.status(400).json({ error: 'missing_field', field: 'workspace_id' });
  if (!title) return res.status(400).json({ error: 'missing_field', field: 'title' });
  if (!skill_key) return res.status(400).json({ error: 'missing_field', field: 'skill_key' });

  // Validate skill exists and is enabled
  const skill = await q("SELECT id, key, name, risk_tier FROM skills WHERE key=$1 AND lifecycle='enabled'", [skill_key]);
  if (!skill[0]) return res.status(404).json({ error: 'skill_not_found', skill_key });

  try {
    const rows = await q(
      `INSERT INTO task_intake(workspace_id, title, description, risk_tier, routing_mode, status, created_by)
       VALUES ($1, $2, $3, $4, 'auto', 'queued', 'agent-api-v1') RETURNING *`,
      [workspace_id, title, description || '', skill[0].risk_tier],
    );
    const task = rows[0];
    res.status(201).json({
      task_id: task.id,
      title: task.title,
      status: task.status,
      skill_key,
      workspace_id: task.workspace_id,
      created_at: task.created_at,
      _links: {
        self: `/v1/tasks/${task.id}`,
        route: `/v1/tasks/${task.id}/route`,
        run: `/v1/tasks/${task.id}/run`,
        status: `/v1/tasks/${task.id}/status`,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'internal_error', details: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/tasks/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/tasks/:id', async (req, res) => {
  try {
    const rows = await q('SELECT * FROM task_intake WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'task_not_found', id: req.params.id });
    const t = rows[0];
    res.json({
      task_id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      workspace_id: t.workspace_id,
      plane_issue_id: t.plane_issue_id || null,
      plane_issue_url: t.plane_issue_id ? `http://54.167.31.169:8083/claude-skills/projects/WS0002/issues/${t.plane_issue_id}/` : null,
      github_pr_number: t.github_pr_number || null,
      github_pr_url: t.github_pr_url || null,
      slack_thread_ts: t.slack_thread_ts || null,
      created_at: t.created_at,
      updated_at: t.updated_at || null,
    });
  } catch (e) {
    res.status(500).json({ error: 'internal_error', details: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/tasks/:id/status  (lightweight poll endpoint)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/tasks/:id/status', async (req, res) => {
  try {
    const rows = await q(
      'SELECT id, status, plane_issue_id, github_pr_number, slack_thread_ts FROM task_intake WHERE id=$1',
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'task_not_found' });
    const t = rows[0];
    res.json({
      task_id: t.id,
      status: t.status,
      synced_to_plane: !!t.plane_issue_id,
      github_linked: !!t.github_pr_number,
      slack_linked: !!t.slack_thread_ts,
    });
  } catch (e) {
    res.status(500).json({ error: 'internal_error', details: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tasks/:id/route
// Body: { workspace_id, skill_key, min_autonomy?, risk_tier? }
// Recommends an agent without persisting.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/tasks/:id/route', async (req, res) => {
  const { workspace_id, skill_key, min_autonomy, risk_tier } = req.body || {};
  if (!workspace_id) return res.status(400).json({ error: 'missing_field', field: 'workspace_id' });
  if (!skill_key) return res.status(400).json({ error: 'missing_field', field: 'skill_key' });

  const rows = await q('SELECT id FROM task_intake WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'task_not_found' });

  const agent = await pickAgent({ workspace_id, skill_key, min_autonomy, risk_tier });
  if (!agent) return res.status(404).json({ error: 'no_agent_found', skill_key, workspace_id });

  res.json({
    task_id: parseInt(req.params.id, 10),
    agent_id: agent.id,
    agent_name: agent.name,
    autonomy_level: agent.autonomy_level,
    recommendation: 'auto',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tasks/:id/run
// Body: { workspace_id, skill_key, min_autonomy?, risk_tier? }
// Persists route + orchestration_run, fires Plane sync + Slack notify.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/tasks/:id/run', async (req, res) => {
  const { workspace_id, skill_key, min_autonomy, risk_tier } = req.body || {};
  if (!workspace_id) return res.status(400).json({ error: 'missing_field', field: 'workspace_id' });
  if (!skill_key) return res.status(400).json({ error: 'missing_field', field: 'skill_key' });

  const taskRows = await q('SELECT * FROM task_intake WHERE id=$1', [req.params.id]);
  if (!taskRows[0]) return res.status(404).json({ error: 'task_not_found' });

  const agent = await pickAgent({ workspace_id, skill_key, min_autonomy, risk_tier });
  if (!agent) return res.status(404).json({ error: 'no_agent_found', skill_key, workspace_id });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO task_routes(task_id, agent_id, reason, manual) VALUES ($1,$2,$3,false)',
      [req.params.id, agent.id, 'agent-api-v1:auto'],
    );
    const run = await client.query(
      `INSERT INTO orchestration_runs(task_id, agent_id, skill_key, approval_required, status)
       VALUES ($1,$2,$3,false,'pending') RETURNING *`,
      [req.params.id, agent.id, skill_key],
    );
    await client.query('UPDATE task_intake SET status=$1 WHERE id=$2', ['running', req.params.id]);
    await client.query('COMMIT');

    const runRow = run.rows[0];

    // Fire-and-forget: Plane sync + Slack notify (same as internal route/apply)
    setImmediate(async () => {
      try {
        if (plane.isEnabled()) {
          const ws = await q('SELECT * FROM workspaces WHERE id=$1', [workspace_id]);
          if (ws[0]) {
            let planeProjectId = ws[0].plane_project_id;
            if (planeProjectId) {
              const wi = await plane.createWorkItem({
                projectId: planeProjectId,
                name: taskRows[0].title,
                description: taskRows[0].description,
                stateId: null,
              });
              if (wi.ok) {
                await q(
                  'UPDATE task_intake SET plane_issue_id=$1, plane_issue_sequence_id=$2 WHERE id=$3',
                  [wi.data.id, wi.data.sequence_id, req.params.id],
                );
              }
            }
          }
        }
      } catch (_) { /* non-fatal */ }

      try {
        if (slack.isEnabled()) {
          const task = (await q('SELECT * FROM task_intake WHERE id=$1', [req.params.id]))[0];
          if (task) {
            const msg = await slack.postMessage(
              process.env.SLACK_DEFAULT_CHANNEL,
              `[Agent API] Task #${task.id} routed to *${agent.name}* (skill: \`${skill_key}\`)`,
            );
            if (msg && msg.ts) {
              await q('UPDATE task_intake SET slack_thread_ts=$1, slack_channel_id=$2 WHERE id=$3',
                [msg.ts, process.env.SLACK_DEFAULT_CHANNEL, req.params.id]);
            }
          }
        }
      } catch (_) { /* non-fatal */ }
    });

    res.status(201).json({
      task_id: parseInt(req.params.id, 10),
      run_id: runRow.id,
      agent_id: agent.id,
      agent_name: agent.name,
      skill_key,
      status: 'pending',
      message: 'Task routed and run created. Plane sync and Slack notify firing in background.',
      _links: {
        task: `/v1/tasks/${req.params.id}`,
        status: `/v1/tasks/${req.params.id}/status`,
      },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'internal_error', details: String(e) });
  } finally {
    client.release();
  }
});

module.exports = router;
