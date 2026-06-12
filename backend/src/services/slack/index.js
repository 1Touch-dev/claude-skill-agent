'use strict';

/**
 * Slack service — thin wrapper around Slack Web API (no SDK dependency).
 * Uses SLACK_BOT_TOKEN from env. All methods return { ok, data?, error? }.
 * Fails silently (logs + returns ok:false) so callers are never interrupted.
 */

const https = require('https');

const cfg = {
  token: process.env.SLACK_BOT_TOKEN || '',
  defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '',
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
};

function isEnabled() {
  return Boolean(cfg.token);
}

function slackPost(method, body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'slack.com',
      path: `/api/${method}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          const d = JSON.parse(raw);
          resolve(d.ok ? { ok: true, data: d } : { ok: false, error: d.error, data: d });
        } catch (e) {
          resolve({ ok: false, error: 'parse_error', raw });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

/**
 * Verify Slack bot token is valid.
 */
async function testConnection() {
  if (!isEnabled()) return { ok: false, error: 'SLACK_BOT_TOKEN not set' };
  const r = await slackPost('auth.test', {});
  if (r.ok) {
    return { ok: true, team: r.data.team, user: r.data.user, bot_id: r.data.bot_id };
  }
  return { ok: false, error: r.error };
}

/**
 * Post a plain-text or Block Kit message to a channel.
 * @param {string} channel - Channel ID (C...) or #name
 * @param {string} text    - Plain text (fallback + notification text)
 * @param {Array}  [blocks]- Optional Block Kit blocks for rich formatting
 * @returns {{ ok, ts, channel, error? }}
 */
async function postMessage(channel, text, blocks) {
  if (!isEnabled()) return { ok: false, error: 'slack_disabled' };
  const ch = channel || cfg.defaultChannel;
  if (!ch) return { ok: false, error: 'no_channel' };
  const body = { channel: ch, text };
  if (blocks && blocks.length) body.blocks = blocks;
  const r = await slackPost('chat.postMessage', body);
  if (r.ok) return { ok: true, ts: r.data.ts, channel: r.data.channel };
  console.error('[slack] postMessage error:', r.error, 'channel:', ch);
  return { ok: false, error: r.error };
}

/**
 * Post a threaded reply to an existing message.
 */
async function postReply(channel, threadTs, text, blocks) {
  if (!isEnabled()) return { ok: false, error: 'slack_disabled' };
  const ch = channel || cfg.defaultChannel;
  const body = { channel: ch, thread_ts: threadTs, text };
  if (blocks && blocks.length) body.blocks = blocks;
  const r = await slackPost('chat.postMessage', body);
  if (r.ok) return { ok: true, ts: r.data.ts, channel: r.data.channel };
  console.error('[slack] postReply error:', r.error);
  return { ok: false, error: r.error };
}

/**
 * Build a rich Block Kit message for a task routing event.
 * Returns { text, blocks } ready to pass to postMessage.
 */
function buildTaskRoutedMessage({ task, agent, planeIssueUrl, workspaceName }) {
  const priority = ['low', 'medium', 'high', 'urgent'][Math.min(task.risk_tier || 0, 3)];
  const planeLink = planeIssueUrl ? ` | <${planeIssueUrl}|Open in Plane>` : '';
  const agentName = agent ? agent.name : 'Unassigned';
  const text = `New task routed: *${task.title}* → ${agentName}`;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Task Routed', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Task:*\n${task.title}` },
        { type: 'mrkdwn', text: `*Agent:*\n${agentName}` },
        { type: 'mrkdwn', text: `*Priority:*\n${priority}` },
        { type: 'mrkdwn', text: `*Workspace:*\n${workspaceName || `WS${task.workspace_id}`}` },
      ],
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Task #${task.id}${planeLink} | Status: ${task.status || 'queued'}` },
      ],
    },
  ];

  return { text, blocks };
}

/**
 * Build a rich message for task completion / status change.
 */
function buildTaskStatusMessage({ task, newStatus, trigger }) {
  const emoji = { completed: 'white_check_mark', failed: 'x', running: 'arrow_forward', queued: 'hourglass_flowing_sand' }[newStatus] || 'information_source';
  const text = `:${emoji}: Task *${task.title}* → ${newStatus}`;
  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${task.title}*\nStatus changed to *${newStatus}*${trigger ? ` (via ${trigger})` : ''}` },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Task #${task.id}` }],
    },
  ];
  return { text, blocks };
}

module.exports = {
  isEnabled,
  testConnection,
  postMessage,
  postReply,
  buildTaskRoutedMessage,
  buildTaskStatusMessage,
  cfg,
};
