const express = require('express');
const { pool } = require('../lib/db');
const plane = require('../services/pm-bridge');
const slack = require('../services/slack');

const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// Naive routing engine: choose an agent in the workspace with allowed_skill_keys matching requested skill_key,
// autonomy_level >= requested autonomy, and (optionally) risk-tier aware (simple threshold).
async function pickAgent({ workspace_id, skill_key, min_autonomy = 0, risk_tier = 0 }) {
  const agents = await q('SELECT * FROM agent_profiles WHERE workspace_id=$1 ORDER BY pooled DESC, autonomy_level DESC', [workspace_id]);
  for (const a of agents) {
    const allowed = Array.isArray(a.allowed_skill_keys) ? a.allowed_skill_keys : [];
    if ((allowed.length === 0 || allowed.includes(skill_key)) && a.autonomy_level >= min_autonomy) {
      // simplistic risk check: require autonomy >= risk_tier
      if (a.autonomy_level >= (risk_tier || 0)) return a;
    }
  }
  return null;
}

// Compute route recommendation (does not persist)
router.post('/route', async (req, res) => {
  const { workspace_id, task_id, skill_key, min_autonomy, risk_tier } = req.body;
  const agent = await pickAgent({ workspace_id, skill_key, min_autonomy, risk_tier });
  if (!agent) return res.status(404).json({ error: 'no_agent_found' });
  res.json({ agent_id: agent.id, agent_name: agent.name });
});

// Apply routing (persist task_route and create orchestration_run stub)
router.post('/route/apply', async (req, res) => {
  const { task_id, workspace_id, skill_key, min_autonomy, risk_tier, manual, reason } = req.body;
  const agent = manual ? null : await pickAgent({ workspace_id, skill_key, min_autonomy, risk_tier });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const route = await client.query(
      'INSERT INTO task_routes(task_id,agent_id,reason,manual) VALUES ($1,$2,$3,COALESCE($4,false)) RETURNING *',
      [task_id, agent ? agent.id : null, reason || (agent ? 'engine:auto' : 'manual'), manual]
    );
    const run = await client.query(
      'INSERT INTO orchestration_runs(task_id,agent_id,skill_key,approval_required,status) VALUES ($1,$2,$3,COALESCE($4,false),\'pending\') RETURNING *',
      [task_id, agent ? agent.id : null, skill_key, false]
    );
    await client.query('COMMIT');

    const routeRow = route.rows[0];
    const runRow = run.rows[0];

    // Auto-sync to Plane PM (fire-and-forget — does not block the response)
    setImmediate(async () => {
      try {
        if (!plane.isEnabled() || !task_id) return;

        // Ensure workspace has a Plane project
        const wsRows = await q('SELECT id, name, plane_project_id FROM workspaces WHERE id=$1', [workspace_id]);
        if (!wsRows.length) return;
        const ws = wsRows[0];

        let planeProjectId = ws.plane_project_id;
        if (!planeProjectId) {
          const identifier = `WS${String(workspace_id).padStart(4, '0')}`;
          const cp = await plane.createProject({
            name: ws.name || `Workspace ${workspace_id}`,
            identifier,
            description: `Control plane workspace ID ${workspace_id}. Auto-created by pm-bridge.`,
          });
          if (cp.ok) {
            planeProjectId = cp.data.id;
            await q('UPDATE workspaces SET plane_project_id=$1, plane_project_identifier=$2 WHERE id=$3',
              [planeProjectId, identifier, workspace_id]);
          } else if (cp.status === 409) {
            // Project already exists — look it up
            const list = await plane.listProjects();
            if (list.ok) {
              const existing = (list.data.results || list.data || []).find(p => p.identifier === identifier);
              if (existing) {
                planeProjectId = existing.id;
                await q('UPDATE workspaces SET plane_project_id=$1, plane_project_identifier=$2 WHERE id=$3',
                  [planeProjectId, identifier, workspace_id]);
              }
            }
          }
        }

        if (!planeProjectId) return;

        // Check if task already has a Plane issue
        const taskRows = await q('SELECT * FROM task_intake WHERE id=$1', [task_id]);
        if (!taskRows.length || taskRows[0].plane_issue_id) return;
        const task = taskRows[0];

        const priorityMap = { 0: 'low', 1: 'medium', 2: 'high', 3: 'urgent' };
        const priority = priorityMap[Math.min(task.risk_tier || 0, 3)] || 'medium';

        // Load agent's Plane member mapping (if any)
        let assigneeIds;
        if (agent && agent.id) {
          const agentRows = await q('SELECT plane_member_id FROM agent_profiles WHERE id=$1', [agent.id]);
          const memberId = agentRows[0]?.plane_member_id;
          if (memberId) assigneeIds = [memberId];
        }

        const issueResult = await plane.createWorkItem(planeProjectId, {
          name: task.title,
          description_html: `<p>${task.description || task.title}</p>`,
          priority,
          assigneeIds,
          meta: {
            control_plane_task_id: task_id,
            workspace_id,
            run_id: runRow.id,
            skill_key: skill_key || null,
            risk_tier: task.risk_tier,
            routing_mode: task.routing_mode,
          },
        });

        if (issueResult.ok) {
          await q('UPDATE task_intake SET plane_issue_id=$1, plane_issue_sequence_id=$2 WHERE id=$3',
            [issueResult.data.id, issueResult.data.sequence_id || null, task_id]);
        }

        // Post Slack notification after Plane sync (or without it if Plane disabled)
        if (slack.isEnabled()) {
          try {
            const freshTask = (await q('SELECT * FROM task_intake WHERE id=$1', [task_id]))[0] || task;
            const ws = wsRows[0];
            const planeSeq = issueResult.ok ? issueResult.data.sequence_id : null;
            const planeUrl = issueResult.ok
              ? `http://54.167.31.169:8083/${process.env.PLANE_WORKSPACE_SLUG || 'claude-skills'}/projects/${planeProjectId}/issues/${issueResult.data.id}/`
              : null;
            const { text, blocks } = slack.buildTaskRoutedMessage({
              task: freshTask,
              agent,
              planeIssueUrl: planeUrl,
              workspaceName: ws.name,
            });
            const slackResult = await slack.postMessage(null, text, blocks);
            if (slackResult.ok) {
              await q(
                'UPDATE task_intake SET slack_channel_id=$1, slack_message_ts=$2 WHERE id=$3',
                [slackResult.channel, slackResult.ts, task_id]
              );
            }
          } catch (slackErr) {
            console.error('[slack] routing notify error:', slackErr.message);
          }
        }
      } catch (syncErr) {
        // Plane/Slack sync failure must never crash routing
        console.error('[pm-bridge] auto-sync error:', syncErr.message);
      }
    });

    // Fire Slack-only notification immediately if Plane is disabled
    if (!plane.isEnabled() && slack.isEnabled()) {
      setImmediate(async () => {
        try {
          const taskRows = await q('SELECT * FROM task_intake WHERE id=$1', [task_id]);
          if (!taskRows.length) return;
          const task = taskRows[0];
          const wsRows = await q('SELECT name FROM workspaces WHERE id=$1', [workspace_id]);
          const wsName = wsRows[0]?.name;
          const { text, blocks } = slack.buildTaskRoutedMessage({ task, agent, workspaceName: wsName });
          const slackResult = await slack.postMessage(null, text, blocks);
          if (slackResult.ok) {
            await q('UPDATE task_intake SET slack_channel_id=$1, slack_message_ts=$2 WHERE id=$3',
              [slackResult.channel, slackResult.ts, task_id]);
          }
        } catch (e) {
          console.error('[slack] standalone notify error:', e.message);
        }
      });
    }

    res.status(201).json({ route: routeRow, run: runRow });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'route_failed', details: String(e) });
  } finally {
    client.release();
  }
});

module.exports = router;
