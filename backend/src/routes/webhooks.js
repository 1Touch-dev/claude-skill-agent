'use strict';

/**
 * Plane webhook receiver — /webhooks/plane
 *
 * No auth middleware (Plane sends unsigned or HMAC-signed POST).
 * Registered in Plane: Settings → Webhooks → URL: http://54.167.31.169:3000/webhooks/plane
 *
 * Events handled:
 *   issue.created   → log
 *   issue.updated   → sync status back to task_intake
 *   issue.deleted   → clear plane_issue_id
 *   comment.created → log
 */

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../lib/db');
const cfg = require('../services/pm-bridge/config');

const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

/* Plane issue state label → our task status */
const STATE_MAP = {
  backlog: 'queued',
  unstarted: 'queued',
  started: 'running',
  completed: 'completed',
  cancelled: 'failed',
  duplicate: 'failed',
};

function verifySignature(rawBody, signature) {
  if (!cfg.webhookSecret || !signature) return true; // skip if not configured
  const hmac = crypto.createHmac('sha256', cfg.webhookSecret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Use raw body for signature verification
router.post('/plane', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = req.body;
  const sig = req.headers['x-plane-signature'] || req.headers['x-webhook-secret'] || '';

  if (!verifySignature(rawBody, sig)) {
    return res.status(401).json({ error: 'invalid_signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch (_) {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const { event, data } = payload;
  const issueId = data?.id || data?.issue?.id || null;

  // Store raw event
  await q(
    'INSERT INTO plane_webhook_events(event_type, payload, plane_issue_id) VALUES ($1,$2,$3)',
    [event || 'unknown', payload, issueId]
  );

  // Handle issue state updates
  if ((event === 'issue_updated' || event === 'issue.updated') && issueId) {
    await handleIssueUpdated(issueId, data);
  }

  if ((event === 'issue_deleted' || event === 'issue.deleted') && issueId) {
    await handleIssueDeleted(issueId);
  }

  res.json({ ok: true, event, received_at: new Date().toISOString() });
});

async function handleIssueUpdated(planeIssueId, data) {
  // Find our task by plane_issue_id
  const tasks = await q('SELECT id, status FROM task_intake WHERE plane_issue_id=$1', [planeIssueId]);
  if (!tasks.length) return;

  const task = tasks[0];
  const stateType = data?.state_detail?.type || data?.state?.group || '';
  const newStatus = STATE_MAP[stateType.toLowerCase()] || null;

  if (newStatus && newStatus !== task.status) {
    await q('UPDATE task_intake SET status=$1 WHERE id=$2', [newStatus, task.id]);

    // Record in task_routes as a sync event
    await q(
      `INSERT INTO task_routes(task_id, reason, manual, decided_by)
       VALUES ($1, $2, false, 'plane_webhook')`,
      [task.id, `plane_sync:issue_updated:state=${stateType}→${newStatus}`]
    );
  }

  // Update plane_webhook_events with task link
  await q(
    'UPDATE plane_webhook_events SET task_id=$1 WHERE plane_issue_id=$2 AND task_id IS NULL ORDER BY id DESC',
    [task.id, planeIssueId]
  );
}

async function handleIssueDeleted(planeIssueId) {
  await q('UPDATE task_intake SET plane_issue_id=NULL, plane_issue_sequence_id=NULL WHERE plane_issue_id=$1', [planeIssueId]);
}

module.exports = router;
