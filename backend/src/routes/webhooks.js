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

/* ---------- IP allowlist check ---------- */

function resolveClientIp(req) {
  // X-Forwarded-For: first hop is the real client
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp.trim();
  return req.ip || req.connection.remoteAddress || '';
}

function ipToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  return parts.reduce((acc, p) => {
    const n = parseInt(p, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    return acc === null ? null : (acc * 256 + n);
  }, 0);
}

function isIpAllowed(ip, allowlist) {
  if (!allowlist) return true; // empty = allow all
  for (const entry of allowlist) {
    if (entry.includes('/')) {
      // CIDR match
      const [base, prefixStr] = entry.split('/');
      const prefix = parseInt(prefixStr, 10);
      const baseInt = ipToInt(base);
      const clientInt = ipToInt(ip);
      if (baseInt !== null && clientInt !== null && !isNaN(prefix)) {
        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
        if ((baseInt & mask) >>> 0 === (clientInt & mask) >>> 0) return true;
      }
    } else {
      if (entry === ip) return true;
    }
  }
  return false;
}

function checkWebhookIp(req, res, next) {
  if (!cfg.webhookAllowedIps) return next(); // allowlist unset — allow all
  const ip = resolveClientIp(req);
  if (isIpAllowed(ip, cfg.webhookAllowedIps)) return next();
  console.warn('[webhooks/plane] rejected IP:', ip);
  return res.status(403).json({ error: 'ip_not_allowed' });
}

/* ---------- signature verification ---------- */

function verifySignature(rawBody, signature) {
  if (!cfg.webhookSecret || !signature) return true; // skip if not configured
  const hmac = crypto.createHmac('sha256', cfg.webhookSecret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Use raw body for signature verification
router.post('/plane', checkWebhookIp, express.raw({ type: 'application/json' }), async (req, res) => {
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
