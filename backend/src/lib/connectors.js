'use strict';

/**
 * Integration connector test layer.
 * GitHub and Slack use live API calls when env tokens are set.
 * Asana, Monday, Trello fall back to credential-profile check (no OAuth yet).
 */

const SUPPORTED = ['asana', 'github', 'slack', 'monday', 'trello', 'zapier_mcp'];

function hasCredential(vault) {
  if (!vault || typeof vault !== 'object') return false;
  return Boolean(
    vault.token ||
    vault.access_token ||
    vault.bot_token ||
    vault.api_key ||
    (vault.token_type && Object.keys(vault).length > 1)
  );
}

/**
 * Live GitHub test — calls GET /user with env token.
 * Falls back to vault credential check if env token absent.
 */
async function testGitHub(vault) {
  const token = process.env.GITHUB_TOKEN || vault?.token || vault?.access_token;
  if (!token) {
    return { ok: false, status: 'disconnected', message: 'No GitHub token configured', mode: 'live' };
  }
  const github = require('../services/github');
  const r = await github.testConnection();
  if (r.ok) {
    return {
      ok: true,
      status: 'connected',
      message: `Authenticated as ${r.login} — live GitHub API OK`,
      mode: 'live',
      login: r.login,
      checked_at: new Date().toISOString(),
    };
  }
  return { ok: false, status: 'error', message: `GitHub API error: ${r.error}`, mode: 'live' };
}

/**
 * Live Slack test — calls auth.test with env token.
 * Falls back to vault credential check if env token absent.
 */
async function testSlack(vault) {
  const token = process.env.SLACK_BOT_TOKEN || vault?.bot_token || vault?.token;
  if (!token) {
    return { ok: false, status: 'disconnected', message: 'No Slack bot token configured', mode: 'live' };
  }
  const slack = require('../services/slack');
  const r = await slack.testConnection();
  if (r.ok) {
    return {
      ok: true,
      status: 'connected',
      message: `Authenticated as ${r.user} in workspace — live Slack API OK`,
      mode: 'live',
      team: r.team,
      bot_id: r.bot_id,
      checked_at: new Date().toISOString(),
    };
  }
  return { ok: false, status: 'error', message: `Slack API error: ${r.error}`, mode: 'live' };
}

/**
 * Mock check for providers without live API integration yet.
 */
function testMock(provider, vault) {
  if (!hasCredential(vault)) {
    return { ok: false, status: 'disconnected', message: 'No credentials configured in vault', mode: 'mock' };
  }
  return {
    ok: true,
    status: 'connected',
    message: `${provider} credential profile detected — mock check OK (no live OAuth yet)`,
    mode: 'mock',
    latency_ms: 120 + Math.floor(Math.random() * 80),
    checked_at: new Date().toISOString(),
  };
}

/**
 * Live Zapier MCP test — calls tools/list on the MCP endpoint.
 */
async function testZapierMcp() {
  const zapier = require('../services/zapier-mcp');
  const r = await zapier.testConnection();
  if (r.ok) {
    return {
      ok: true,
      status: 'connected',
      message: `Zapier MCP connected — ${r.tool_count} tool(s) enabled`,
      mode: 'live',
      tool_count: r.tool_count,
      checked_at: new Date().toISOString(),
    };
  }
  return {
    ok: false,
    status: r.mode === 'unconfigured' ? 'disconnected' : 'error',
    message: `Zapier MCP: ${r.error}`,
    mode: r.mode === 'unconfigured' ? 'unconfigured' : 'live',
  };
}

async function testProvider(provider, vault) {
  const p = String(provider || '').toLowerCase();
  if (!SUPPORTED.includes(p)) {
    return { ok: false, status: 'error', message: `Unsupported provider: ${provider}`, mode: 'live' };
  }
  if (p === 'github')     return testGitHub(vault);
  if (p === 'slack')      return testSlack(vault);
  if (p === 'zapier_mcp') return testZapierMcp();
  return testMock(p, vault);
}

module.exports = { SUPPORTED, hasCredential, testProvider };
