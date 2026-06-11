'use strict';

/**
 * PM Bridge routes — /api/pm/*
 *
 * These endpoints let the control plane sync entities with Plane CE.
 *
 *  POST /api/pm/ping                          Health-check Plane connectivity
 *  POST /api/pm/workspaces/:id/sync           Create / ensure Plane project for workspace
 *  GET  /api/pm/workspaces/:id/status         Get Plane sync status for workspace
 *  POST /api/pm/tasks/:id/sync                Push task_intake to Plane work item
 *  GET  /api/pm/tasks/:id/status              Get Plane issue for task
 *  GET  /api/pm/projects                      List all Plane projects
 */

const express = require('express');
const { pool } = require('../lib/db');
const plane = require('../services/pm-bridge');

const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

/* ---- helpers ---- */

function slugify(str) {
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10) || 'WS';
}

function priorityFromRisk(riskTier) {
  const map = { 0: 'low', 1: 'medium', 2: 'high', 3: 'urgent' };
  return map[Math.min(riskTier || 0, 3)] || 'medium';
}

/* ---- routes ---- */

// Health-check Plane connectivity
router.post('/pm/ping', async (_req, res) => {
  if (!plane.isEnabled()) {
    return res.status(503).json({
      ok: false,
      plane_enabled: false,
      message: 'Plane not configured. Set PLANE_API_URL, PLANE_API_TOKEN, PLANE_WORKSPACE_SLUG in .env',
    });
  }
  const result = await plane.ping();
  if (!result.ok) {
    return res.status(502).json({ ok: false, plane_enabled: true, error: result.error, status: result.status });
  }
  res.json({ ok: true, plane_enabled: true, workspace: result.data });
});

// Sync workspace → Plane project
router.post('/pm/workspaces/:id/sync', async (req, res) => {
  const workspaceId = parseInt(req.params.id, 10);

  // Load workspace from our DB
  const rows = await q('SELECT * FROM workspaces WHERE id=$1', [workspaceId]);
  if (!rows.length) return res.status(404).json({ error: 'workspace_not_found' });
  const ws = rows[0];

  // Already synced?
  if (ws.plane_project_id) {
    const check = await plane.getProject(ws.plane_project_id);
    if (check.ok) {
      return res.json({
        synced: true,
        already_existed: true,
        plane_project_id: ws.plane_project_id,
        plane_project: check.data,
      });
    }
    // Project was deleted in Plane — fall through to recreate
  }

  if (!plane.isEnabled()) {
    return res.status(503).json({ error: 'plane_not_configured' });
  }

  // Build identifier: WS + workspace id padded e.g. WS0042
  const identifier = `WS${String(workspaceId).padStart(4, '0')}`;
  const projectName = ws.name || `Workspace ${workspaceId}`;

  const result = await plane.createProject({
    name: projectName,
    identifier,
    description: `Control plane workspace ID ${workspaceId}. Auto-created by pm-bridge.`,
    network: 'secret',
  });

  // 409 = project name already taken — find it by identifier instead
  if (!result.ok && result.status === 409) {
    const listResult = await plane.listProjects();
    if (listResult.ok) {
      const existing = (listResult.data.results || listResult.data || [])
        .find(p => p.identifier === identifier);
      if (existing) {
        await q('UPDATE workspaces SET plane_project_id=$1, plane_project_identifier=$2 WHERE id=$3',
          [existing.id, identifier, workspaceId]);
        return res.json({
          synced: true,
          already_existed: true,
          plane_project_id: existing.id,
          plane_project: existing,
        });
      }
    }
    return res.status(409).json({ error: 'plane_project_name_conflict', details: result.error });
  }

  if (!result.ok) {
    return res.status(502).json({ error: 'plane_project_create_failed', details: result.error, plane_status: result.status });
  }

  // Persist Plane project ID into our workspaces table
  await q(
    'UPDATE workspaces SET plane_project_id=$1, plane_project_identifier=$2 WHERE id=$3',
    [result.data.id, identifier, workspaceId]
  );

  res.status(201).json({
    synced: true,
    already_existed: false,
    plane_project_id: result.data.id,
    plane_project: result.data,
  });
});

// Get Plane sync status for workspace
router.get('/pm/workspaces/:id/status', async (req, res) => {
  const workspaceId = parseInt(req.params.id, 10);
  const rows = await q('SELECT id, name, plane_project_id, plane_project_identifier FROM workspaces WHERE id=$1', [workspaceId]);
  if (!rows.length) return res.status(404).json({ error: 'workspace_not_found' });
  const ws = rows[0];

  if (!ws.plane_project_id) {
    return res.json({ synced: false, workspace_id: workspaceId, plane_project_id: null });
  }

  let planeProject = null;
  if (plane.isEnabled()) {
    const r = await plane.getProject(ws.plane_project_id);
    if (r.ok) planeProject = r.data;
  }

  res.json({
    synced: true,
    workspace_id: workspaceId,
    workspace_name: ws.name,
    plane_project_id: ws.plane_project_id,
    plane_project_identifier: ws.plane_project_identifier,
    plane_project: planeProject,
  });
});

// Sync task_intake → Plane Work Item
router.post('/pm/tasks/:id/sync', async (req, res) => {
  const taskId = parseInt(req.params.id, 10);

  // Load task
  const tasks = await q('SELECT ti.*, ws.plane_project_id, ws.name AS workspace_name FROM task_intake ti LEFT JOIN workspaces ws ON ws.id=ti.workspace_id WHERE ti.id=$1', [taskId]);
  if (!tasks.length) return res.status(404).json({ error: 'task_not_found' });
  const task = tasks[0];

  // Already synced?
  if (task.plane_issue_id) {
    return res.json({
      synced: true,
      already_existed: true,
      plane_issue_id: task.plane_issue_id,
    });
  }

  if (!task.plane_project_id) {
    return res.status(422).json({
      error: 'workspace_not_synced',
      message: `Workspace ${task.workspace_id} has no Plane project. Call POST /api/pm/workspaces/${task.workspace_id}/sync first.`,
    });
  }

  if (!plane.isEnabled()) {
    return res.status(503).json({ error: 'plane_not_configured' });
  }

  // Load latest route for context
  const routes = await q(
    'SELECT tr.*, ap.name AS agent_name, ap.key AS agent_key FROM task_routes tr LEFT JOIN agent_profiles ap ON ap.id=tr.agent_id WHERE tr.task_id=$1 ORDER BY tr.decided_at DESC LIMIT 1',
    [taskId]
  );
  const route = routes[0] || null;

  // Load latest run
  const runs = await q(
    'SELECT * FROM orchestration_runs WHERE task_id=$1 ORDER BY created_at DESC LIMIT 1',
    [taskId]
  );
  const run = runs[0] || null;

  const meta = {
    control_plane_task_id: taskId,
    workspace_id: task.workspace_id,
    customer_id: task.customer_id,
    risk_tier: task.risk_tier,
    routing_mode: task.routing_mode,
    status: task.status,
    agent_key: route ? route.agent_key : null,
    run_id: run ? run.id : null,
    skill_key: run ? run.skill_key : null,
    created_at: task.created_at,
  };

  const result = await plane.createWorkItem(task.plane_project_id, {
    name: task.title,
    description_html: `<p>${task.description || task.title}</p>`,
    priority: priorityFromRisk(task.risk_tier),
    meta,
  });

  if (!result.ok) {
    return res.status(502).json({ error: 'plane_issue_create_failed', details: result.error, plane_status: result.status });
  }

  // Persist Plane issue ID
  await q(
    'UPDATE task_intake SET plane_issue_id=$1, plane_issue_sequence_id=$2 WHERE id=$3',
    [result.data.id, result.data.sequence_id || null, taskId]
  );

  // Add comment with routing info
  if (route) {
    await plane.addComment(task.plane_project_id, result.data.id,
      `Routed to agent: <strong>${route.agent_name || 'unknown'}</strong> (${route.agent_key || 'n/a'}). Reason: ${route.reason || 'engine:auto'}.`
    );
  }

  res.status(201).json({
    synced: true,
    already_existed: false,
    plane_issue_id: result.data.id,
    plane_issue_sequence_id: result.data.sequence_id,
    plane_issue: result.data,
  });
});

// Get Plane issue status for a task
router.get('/pm/tasks/:id/status', async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const rows = await q('SELECT id, title, status, plane_issue_id, plane_issue_sequence_id, workspace_id FROM task_intake WHERE id=$1', [taskId]);
  if (!rows.length) return res.status(404).json({ error: 'task_not_found' });
  const task = rows[0];

  res.json({
    task_id: taskId,
    title: task.title,
    status: task.status,
    plane_issue_id: task.plane_issue_id,
    plane_issue_sequence_id: task.plane_issue_sequence_id,
    synced: !!task.plane_issue_id,
  });
});

// List all Plane projects
router.get('/pm/projects', async (_req, res) => {
  if (!plane.isEnabled()) {
    return res.status(503).json({ error: 'plane_not_configured' });
  }
  const result = await plane.listProjects();
  if (!result.ok) {
    return res.status(502).json({ error: 'plane_list_failed', details: result.error });
  }
  res.json(result.data);
});

// List Plane workspace members (for UI member mapping dropdown)
router.get('/pm/members', async (_req, res) => {
  if (!plane.isEnabled()) {
    return res.status(503).json({ error: 'plane_not_configured' });
  }
  const result = await plane.listWorkspaceMembers();
  if (!result.ok) {
    return res.status(502).json({ error: 'plane_members_failed', details: result.error });
  }
  // Normalize: return array of { id, display_name, email }
  const raw = result.data;
  const members = (Array.isArray(raw) ? raw : (raw.results || [])).map((m) => ({
    id: m.member?.id || m.id,
    display_name: m.member?.display_name || m.display_name || m.member?.email || '',
    email: m.member?.email || m.email || '',
    role: m.role,
  }));
  res.json(members);
});

module.exports = router;
