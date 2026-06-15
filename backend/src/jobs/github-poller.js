'use strict';

/**
 * GitHub Poller — periodic background job that polls GitHub API for PR and
 * issue changes, then feeds them through the same processGitHubEvent() handler
 * that the live webhook receiver uses.  This is an interim workaround for
 * deployments where repo-admin access isn't available to register a real
 * GitHub webhook.
 *
 * Controlled by env vars:
 *   GITHUB_POLL_ENABLED        true | false (default: false)
 *   GITHUB_POLL_INTERVAL_SEC   seconds between polls (default: 120)
 *   GITHUB_DEFAULT_REPO        "owner/repo" — repo to poll
 *   GITHUB_TOKEN               PAT with `repo` (or public `public_repo`) scope
 *
 * Strategy:
 *   1. On each tick, fetch the last 100 PRs and last 100 issues sorted by
 *      `updated` descending from the GitHub API.
 *   2. Compare each item against the poller_cursors row; skip anything whose
 *      id ≤ last_seen_id AND updated_at ≤ last_seen_at.
 *   3. Build a synthetic webhook payload and call processGitHubEvent() with
 *      source='poll'. The ON CONFLICT DO NOTHING on integration_events
 *      prevents duplicate entries.
 *   4. Advance the cursor to the newest item seen.
 *
 * When a real webhook is registered later, simply set GITHUB_POLL_ENABLED=false
 * and restart — no code changes required.
 */

const { pool } = require('../lib/db');
const github = require('../services/github');
const { processGitHubEvent } = require('../routes/webhooks');

const q = (text, params = []) => pool.query(text, params).then(r => r.rows);

const INTERVAL_SEC = parseInt(process.env.GITHUB_POLL_INTERVAL_SEC || '120', 10);
const ENABLED = (process.env.GITHUB_POLL_ENABLED || 'false').toLowerCase() === 'true';

/* ── Cursor helpers ── */

async function getCursor(resource) {
  const rows = await q(
    `INSERT INTO poller_cursors(resource) VALUES ($1)
     ON CONFLICT (resource) DO NOTHING`,
    [resource]
  );
  const [row] = await q('SELECT * FROM poller_cursors WHERE resource=$1', [resource]);
  return row;
}

async function advanceCursor(resource, newId, newAt) {
  await q(
    `UPDATE poller_cursors SET last_seen_id=$1, last_seen_at=$2, updated_at=now()
     WHERE resource=$3`,
    [newId, newAt, resource]
  );
}

/* ── Item helpers ── */

function itemIsNewer(item, cursor) {
  if (item.id > cursor.last_seen_id) return true;
  if (item.id === cursor.last_seen_id) return false;
  // id is smaller (older numbering) but updated_at is newer — happens for edited items
  const itemTs = new Date(item.updated_at).getTime();
  const cursorTs = new Date(cursor.last_seen_at).getTime();
  return itemTs > cursorTs;
}

function mapPrState(pr) {
  if (pr.state === 'open') return { action: pr.draft ? 'converted_to_draft' : 'opened', state: 'open' };
  if (pr.merged_at) return { action: 'closed', state: 'closed', merged: true };
  return { action: 'closed', state: 'closed', merged: false };
}

function mapIssueState(issue) {
  return issue.state === 'open' ? { action: 'opened' } : { action: 'closed' };
}

function buildPrPayload(pr) {
  const { action, merged } = mapPrState(pr);
  return {
    action,
    pull_request: {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      state: pr.state,
      merged: merged ?? Boolean(pr.merged_at),
      merged_at: pr.merged_at,
      html_url: pr.html_url,
      head: { ref: pr.head?.ref || '' },
    },
  };
}

function buildIssuePayload(issue) {
  const { action } = mapIssueState(issue);
  return {
    action,
    issue: {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state,
      html_url: issue.html_url,
    },
  };
}

/* ── Polling logic ── */

async function pollPRs(repo) {
  const cursor = await getCursor('github:prs');
  const result = await github.listPullRequests(repo, { state: 'all', per_page: 100, sort: 'updated', direction: 'desc' });

  if (!result.ok || !Array.isArray(result.data)) {
    console.warn('[github-poller] listPullRequests failed:', result.error);
    return;
  }

  const prs = result.data;
  let maxId = Number(cursor.last_seen_id);
  let maxAt = cursor.last_seen_at;

  for (const pr of prs) {
    if (!itemIsNewer(pr, cursor)) continue;

    const payload = buildPrPayload(pr);
    const deliveryId = `poll:pr:${pr.id}:${pr.updated_at}`;

    try {
      await processGitHubEvent('pull_request', payload, deliveryId, 'poll');
      console.log(`[github-poller] processed PR #${pr.number} action=${payload.action}`);
    } catch (e) {
      console.error(`[github-poller] error processing PR #${pr.number}:`, e.message);
    }

    if (pr.id > maxId) { maxId = pr.id; maxAt = pr.updated_at; }
  }

  if (maxId > Number(cursor.last_seen_id)) {
    await advanceCursor('github:prs', maxId, maxAt);
  }
}

async function pollIssues(repo) {
  const cursor = await getCursor('github:issues');
  const result = await github.listIssues(repo, { state: 'all', per_page: 100, sort: 'updated', direction: 'desc' });

  if (!result.ok || !Array.isArray(result.data)) {
    console.warn('[github-poller] listIssues failed:', result.error);
    return;
  }

  // GitHub issues API includes PRs — filter them out (they have a pull_request key)
  const issues = result.data.filter(i => !i.pull_request);
  let maxId = Number(cursor.last_seen_id);
  let maxAt = cursor.last_seen_at;

  for (const issue of issues) {
    if (!itemIsNewer(issue, cursor)) continue;

    const payload = buildIssuePayload(issue);
    const deliveryId = `poll:issue:${issue.id}:${issue.updated_at}`;

    try {
      await processGitHubEvent('issues', payload, deliveryId, 'poll');
      console.log(`[github-poller] processed Issue #${issue.number} action=${payload.action}`);
    } catch (e) {
      console.error(`[github-poller] error processing Issue #${issue.number}:`, e.message);
    }

    if (issue.id > maxId) { maxId = issue.id; maxAt = issue.updated_at; }
  }

  if (maxId > Number(cursor.last_seen_id)) {
    await advanceCursor('github:issues', maxId, maxAt);
  }
}

async function tick() {
  const repo = github.cfg.defaultRepo;
  if (!repo) {
    console.warn('[github-poller] GITHUB_DEFAULT_REPO not set — skipping tick');
    return;
  }
  if (!github.isEnabled()) {
    console.warn('[github-poller] GITHUB_TOKEN not set — skipping tick');
    return;
  }

  try {
    await pollPRs(repo);
    await pollIssues(repo);
  } catch (e) {
    console.error('[github-poller] unexpected error in tick:', e.message);
  }
}

let _timer = null;

function start() {
  if (!ENABLED) {
    console.log('[github-poller] disabled (GITHUB_POLL_ENABLED != true)');
    return;
  }
  console.log(`[github-poller] starting — repo=${github.cfg.defaultRepo} interval=${INTERVAL_SEC}s`);
  // Run once immediately, then on interval
  tick();
  _timer = setInterval(tick, INTERVAL_SEC * 1000);
  if (_timer.unref) _timer.unref(); // don't block process exit
}

function stop() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { start, stop, tick };
