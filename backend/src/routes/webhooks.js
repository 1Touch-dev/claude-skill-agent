'use strict';

/**
 * Webhook receivers:
 *   POST /webhooks/plane  — Plane CE events (issue created/updated/deleted)
 *   POST /webhooks/github — GitHub webhook events (PR, push, issues)
 *   POST /webhooks/slack  — Slack Events API (url_verification + future events)
 *
 * Registered:
 *   Plane:  Settings → Webhooks → http://54.167.31.169:3000/webhooks/plane
 *   GitHub: Repo → Settings → Webhooks → http://54.167.31.169:3000/webhooks/github
 *   Slack:  App → Event Subscriptions → http://54.167.31.169:3000/webhooks/slack
 */

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../lib/db');
const cfg = require('../services/pm-bridge/config');
const slack = require('../services/slack');
const github = require('../services/github');

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

    // Notify Slack of status change (fire-and-forget)
    if (slack.isEnabled() && task.slack_channel_id && task.slack_thread_ts) {
      setImmediate(async () => {
        try {
          const { text, blocks } = slack.buildTaskStatusMessage({ task, newStatus, trigger: 'Plane' });
          await slack.postReply(task.slack_channel_id, task.slack_thread_ts, text, blocks);
        } catch (e) {
          console.error('[slack] plane status notify error:', e.message);
        }
      });
    }
  }

  // Update plane_webhook_events with task link (most recent unlinked event first)
  await q(
    `UPDATE plane_webhook_events SET task_id=$1
     WHERE id = (
       SELECT id FROM plane_webhook_events
       WHERE plane_issue_id=$2 AND task_id IS NULL
       ORDER BY id DESC LIMIT 1
     )`,
    [task.id, planeIssueId]
  );
}

async function handleIssueDeleted(planeIssueId) {
  await q('UPDATE task_intake SET plane_issue_id=NULL, plane_issue_sequence_id=NULL WHERE plane_issue_id=$1', [planeIssueId]);
}

/* ═══════════════════════════════════════════════════════════════════
   GitHub webhook — POST /webhooks/github
   Verifies X-Hub-Signature-256 HMAC, then handles PR and issue events.
   Link tasks via branch name pattern `task-{id}` or title tag `[T-{id}]`.
═══════════════════════════════════════════════════════════════════ */

function verifyGitHubSignature(rawBody, sigHeader) {
  const secret = github.cfg.webhookSecret;
  if (!secret) return true; // skip if not configured
  if (!sigHeader) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader));
  } catch (_) {
    return false;
  }
}

function extractTaskIdFromText(text) {
  const patterns = [
    /\btask[- _](\d+)\b/i,
    /\[T-(\d+)\]/i,
    /\[TASK-(\d+)\]/i,
    /\bT#(\d+)\b/i,
  ];
  for (const re of patterns) {
    const m = re.exec(text || '');
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

router.post('/github', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = req.body;
  const sig = req.headers['x-hub-signature-256'] || '';
  const event = req.headers['x-github-event'] || 'unknown';
  const deliveryId = req.headers['x-github-delivery'] || null;

  if (!verifyGitHubSignature(rawBody, sig || null)) {
    console.warn('[webhooks/github] invalid signature');
    return res.status(401).json({ error: 'invalid_signature' });
  }

  let payload;
  try { payload = JSON.parse(rawBody.toString()); } catch (_) {
    return res.status(400).json({ error: 'invalid_json' });
  }

  res.json({ ok: true, event, received_at: new Date().toISOString() });

  // Handle async in background — never block response
  setImmediate(async () => {
    try {
      await handleGitHubEvent(event, payload, deliveryId);
    } catch (e) {
      console.error('[webhooks/github] handler error:', e.message);
    }
  });
});

async function handleGitHubEvent(event, payload, deliveryId) {
  const pr = payload.pull_request;
  const issue = payload.issue;
  const action = payload.action;

  // Determine task ID from PR title, body, or branch name
  let taskId = null;
  let searchTexts = [];
  if (pr) searchTexts = [pr.title, pr.body, pr.head?.ref];
  else if (issue) searchTexts = [issue.title, issue.body];
  for (const t of searchTexts) {
    taskId = extractTaskIdFromText(t);
    if (taskId) break;
  }

  // Determine new status based on event + action
  let newStatus = null;
  let logEvent = event;
  if (event === 'pull_request') {
    if (action === 'opened' || action === 'reopened') newStatus = 'running';
    if (action === 'closed' && pr?.merged) newStatus = 'completed';
    if (action === 'closed' && !pr?.merged) newStatus = null; // closed without merge — leave as-is
    logEvent = `pr.${action}`;
  } else if (event === 'issues') {
    if (action === 'opened') newStatus = 'queued';
    if (action === 'closed') newStatus = 'completed';
    logEvent = `issue.${action}`;
  }

  // Log to integration_events
  if (taskId) {
    await q(
      `INSERT INTO integration_events(provider, event_type, external_id, task_id, payload)
       VALUES ('github', $1, $2, $3, $4)`,
      [logEvent, deliveryId, taskId, payload]
    );
  } else {
    await q(
      `INSERT INTO integration_events(provider, event_type, external_id, task_id, payload, status)
       VALUES ('github', $1, $2, NULL, $3, 'skipped')`,
      [logEvent, deliveryId, payload]
    );
  }

  if (!taskId || !newStatus) return;

  // Update task status
  const tasks = await q('SELECT * FROM task_intake WHERE id=$1', [taskId]);
  if (!tasks.length) return;
  const task = tasks[0];

  if (newStatus !== task.status) {
    await q('UPDATE task_intake SET status=$1 WHERE id=$2', [newStatus, taskId]);
    await q(
      `INSERT INTO task_routes(task_id, reason, manual, decided_by)
       VALUES ($1, $2, false, 'github_webhook')`,
      [taskId, `github:${logEvent}→${newStatus}`]
    );

    // Update GitHub fields on task
    if (pr) {
      await q(
        `UPDATE task_intake SET github_pr_number=$1, github_pr_url=$2 WHERE id=$3`,
        [pr.number, pr.html_url, taskId]
      );
    } else if (issue) {
      await q(
        `UPDATE task_intake SET github_issue_number=$1, github_issue_url=$2 WHERE id=$3`,
        [issue.number, issue.html_url, taskId]
      );
    }

    // Sync to Plane if task has a plane issue
    if (task.plane_issue_id) {
      try {
        const plane = require('../services/pm-bridge');
        if (plane.isEnabled() && task.workspace_id) {
          const wsRows = await q('SELECT plane_project_id FROM workspaces WHERE id=$1', [task.workspace_id]);
          const planeProjectId = wsRows[0]?.plane_project_id;
          if (planeProjectId) {
            const stateMap = { running: 'started', completed: 'done', queued: 'backlog' };
            await plane.updateIssueState?.(planeProjectId, task.plane_issue_id, stateMap[newStatus]);
          }
        }
      } catch (e) {
        console.error('[webhooks/github] plane sync error:', e.message);
      }
    }

    // Notify Slack (thread reply if task has a thread, else new message)
    if (slack.isEnabled()) {
      try {
        const { text, blocks } = slack.buildTaskStatusMessage({
          task: { ...task, status: newStatus },
          newStatus,
          trigger: `GitHub ${logEvent}`,
        });
        if (task.slack_channel_id && task.slack_thread_ts) {
          await slack.postReply(task.slack_channel_id, task.slack_thread_ts, text, blocks);
        } else {
          await slack.postMessage(null, text, blocks);
        }
      } catch (e) {
        console.error('[webhooks/github] slack notify error:', e.message);
      }
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Slack Events API — POST /webhooks/slack
   Handles URL verification challenge + future message events.
   Verifies X-Slack-Signature HMAC with SLACK_SIGNING_SECRET.
═══════════════════════════════════════════════════════════════════ */

function verifySlackSignature(rawBody, timestamp, sigHeader) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true;
  if (!sigHeader || !timestamp) return false;
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (age > 300) return false; // reject stale requests > 5 min
  const base = `v0:${timestamp}:${rawBody.toString()}`;
  const expected = `v0=${crypto.createHmac('sha256', secret).update(base).digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader));
  } catch (_) {
    return false;
  }
}

router.post('/slack', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = req.body;

  let payload;
  try { payload = JSON.parse(rawBody.toString()); } catch (_) {
    return res.status(400).json({ error: 'invalid_json' });
  }

  // Slack URL verification challenge — no signature check needed (public handshake)
  if (payload.type === 'url_verification') {
    return res.json({ challenge: payload.challenge });
  }

  // All other events require signature verification
  const timestamp = req.headers['x-slack-request-timestamp'] || '';
  const sig = req.headers['x-slack-signature'] || '';
  if (!verifySlackSignature(rawBody, timestamp, sig || null)) {
    console.warn('[webhooks/slack] invalid signature');
    return res.status(401).json({ error: 'invalid_signature' });
  }

  res.json({ ok: true });

  // Future: handle message events, shortcut callbacks, etc.
  setImmediate(async () => {
    try {
      await q(
        `INSERT INTO integration_events(provider, event_type, payload, status)
         VALUES ('slack', $1, $2, 'ok')`,
        [payload.event?.type || payload.type || 'unknown', payload]
      );
    } catch (e) {
      console.error('[webhooks/slack] log error:', e.message);
    }
  });
});
module.exports = router;
