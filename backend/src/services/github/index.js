'use strict';

/**
 * GitHub service — thin wrapper around GitHub REST API v3.
 * Uses GITHUB_TOKEN (PAT or App token) from env.
 * All methods return { ok, data?, error? }. Fails silently.
 */

const https = require('https');

const cfg = {
  token: process.env.GITHUB_TOKEN || '',
  defaultRepo: process.env.GITHUB_DEFAULT_REPO || '',  // e.g. "org/repo"
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
};

function isEnabled() {
  return Boolean(cfg.token);
}

function githubRequest(method, path, body) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path,
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${cfg.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'globex-platform/1.0',
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          const d = raw.trim() ? JSON.parse(raw) : {};
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          resolve({ ok, status: res.statusCode, data: d, error: ok ? null : (d.message || `HTTP ${res.statusCode}`) });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, error: 'parse_error', raw });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Verify GitHub token is valid and return authenticated user.
 */
async function testConnection() {
  if (!isEnabled()) return { ok: false, error: 'GITHUB_TOKEN not set' };
  const r = await githubRequest('GET', '/user');
  if (r.ok) return { ok: true, login: r.data.login, name: r.data.name };
  return { ok: false, error: r.error };
}

/**
 * Get repo metadata.
 */
async function getRepo(fullName) {
  if (!isEnabled()) return { ok: false, error: 'github_disabled' };
  const repo = fullName || cfg.defaultRepo;
  if (!repo) return { ok: false, error: 'no_repo_configured' };
  const r = await githubRequest('GET', `/repos/${repo}`);
  if (r.ok) return { ok: true, data: { full_name: r.data.full_name, private: r.data.private, html_url: r.data.html_url } };
  return { ok: false, error: r.error };
}

/**
 * Create a GitHub issue linked to a platform task.
 * @param {{ title, body, labels, repo }} opts
 */
async function createIssue({ title, body, labels, repo }) {
  if (!isEnabled()) return { ok: false, error: 'github_disabled' };
  const target = repo || cfg.defaultRepo;
  if (!target) return { ok: false, error: 'no_repo' };
  const r = await githubRequest('POST', `/repos/${target}/issues`, {
    title,
    body: body || '',
    labels: labels || [],
  });
  if (r.ok) {
    return {
      ok: true,
      issue_number: r.data.number,
      issue_url: r.data.html_url,
      node_id: r.data.node_id,
    };
  }
  console.error('[github] createIssue error:', r.error);
  return { ok: false, error: r.error };
}

/**
 * Close a GitHub issue.
 */
async function closeIssue(issueNumber, repo) {
  if (!isEnabled()) return { ok: false, error: 'github_disabled' };
  const target = repo || cfg.defaultRepo;
  const r = await githubRequest('PATCH', `/repos/${target}/issues/${issueNumber}`, { state: 'closed' });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/**
 * List open PRs for a repo (legacy helper — simple version).
 */
async function listPRs(repo) {
  if (!isEnabled()) return { ok: false, error: 'github_disabled' };
  const target = repo || cfg.defaultRepo;
  const r = await githubRequest('GET', `/repos/${target}/pulls?state=open&per_page=20`);
  if (r.ok) return { ok: true, prs: (r.data || []).map(p => ({ number: p.number, title: p.title, html_url: p.html_url, state: p.state })) };
  return { ok: false, error: r.error };
}

/**
 * List pull requests with full query params (used by poller).
 * @param {string} repo  "owner/repo"
 * @param {{ state, per_page, sort, direction }} opts
 */
async function listPullRequests(repo, opts = {}) {
  if (!isEnabled()) return { ok: false, error: 'github_disabled' };
  const target = repo || cfg.defaultRepo;
  if (!target) return { ok: false, error: 'no_repo_configured' };
  const qs = new URLSearchParams({
    state: opts.state || 'all',
    per_page: String(opts.per_page || 100),
    sort: opts.sort || 'updated',
    direction: opts.direction || 'desc',
  }).toString();
  const r = await githubRequest('GET', `/repos/${target}/pulls?${qs}`);
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

/**
 * List issues (and PRs — caller should filter by absence of pull_request key).
 * @param {string} repo  "owner/repo"
 * @param {{ state, per_page, sort, direction }} opts
 */
async function listIssues(repo, opts = {}) {
  if (!isEnabled()) return { ok: false, error: 'github_disabled' };
  const target = repo || cfg.defaultRepo;
  if (!target) return { ok: false, error: 'no_repo_configured' };
  const qs = new URLSearchParams({
    state: opts.state || 'all',
    per_page: String(opts.per_page || 100),
    sort: opts.sort || 'updated',
    direction: opts.direction || 'desc',
  }).toString();
  const r = await githubRequest('GET', `/repos/${target}/issues?${qs}`);
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

/**
 * Add a comment to an existing issue or PR.
 */
async function addComment(issueNumber, body, repo) {
  if (!isEnabled()) return { ok: false, error: 'github_disabled' };
  const target = repo || cfg.defaultRepo;
  const r = await githubRequest('POST', `/repos/${target}/issues/${issueNumber}/comments`, { body });
  return r.ok ? { ok: true, comment_url: r.data.html_url } : { ok: false, error: r.error };
}

module.exports = {
  isEnabled,
  testConnection,
  getRepo,
  createIssue,
  closeIssue,
  listPRs,
  listPullRequests,
  listIssues,
  addComment,
  cfg,
};
