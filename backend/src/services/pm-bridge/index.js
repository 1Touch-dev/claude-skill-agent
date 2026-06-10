'use strict';

/**
 * PlaneBridge — thin client for Plane CE REST API.
 *
 * All public methods return { ok: true, data } on success or
 * { ok: false, error, status } on failure so callers never need try/catch.
 *
 * Docs: https://developers.plane.so/api-reference/introduction
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const cfg = require('./config');

/* ---------- low-level fetch ---------- */

function planeRequest(method, path, body) {
  return new Promise((resolve) => {
    if (!cfg.enabled) {
      return resolve({ ok: false, error: 'plane_not_configured', status: 0 });
    }

    const fullUrl = `${cfg.apiUrl}/api/v1${path}`;
    let parsed;
    try { parsed = new URL(fullUrl); } catch (e) {
      return resolve({ ok: false, error: `invalid_url:${fullUrl}`, status: 0 });
    }

    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: method.toUpperCase(),
      headers: {
        'X-Api-Key': cfg.apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed_body = null;
        try { parsed_body = JSON.parse(data); } catch (_) { parsed_body = data; }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, data: parsed_body, status: res.statusCode });
        } else {
          resolve({ ok: false, error: parsed_body, status: res.statusCode });
        }
      });
    });

    req.on('error', (e) => resolve({ ok: false, error: e.message, status: 0 }));

    const timer = setTimeout(() => {
      req.destroy();
      resolve({ ok: false, error: 'timeout', status: 0 });
    }, cfg.requestTimeoutMs);

    req.on('close', () => clearTimeout(timer));

    if (payload) req.write(payload);
    req.end();
  });
}

/* ---------- public API ---------- */

/**
 * Health-check: verify Plane API is reachable and API key is valid.
 * Uses the projects list endpoint (APIKeyAuthentication) not the workspace root (DRF APIRootView).
 */
async function ping() {
  const r = await planeRequest('GET', `/workspaces/${cfg.workspaceSlug}/projects/`);
  return r;
}

/**
 * List all projects in the configured workspace.
 */
async function listProjects() {
  return planeRequest('GET', `/workspaces/${cfg.workspaceSlug}/projects/`);
}

/**
 * Create a Plane project for a platform workspace.
 * @param {object} params
 * @param {string} params.name          Display name
 * @param {string} params.identifier    3–10 uppercase chars e.g. "WS001"
 * @param {string} [params.description] Optional description
 * @param {string} [params.network]     "secret"|"public"
 */
async function createProject({ name, identifier, description = '', network }) {
  const body = {
    name,
    identifier: identifier.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
    description,
    network: network === 'public' ? 2 : 0, // 0=secret, 2=public in Plane API
  };
  return planeRequest('POST', `/workspaces/${cfg.workspaceSlug}/projects/`, body);
}

/**
 * Get a project by its Plane project ID.
 */
async function getProject(planeProjectId) {
  return planeRequest('GET', `/workspaces/${cfg.workspaceSlug}/projects/${planeProjectId}/`);
}

/**
 * Create a Work Item (Issue) in a Plane project.
 * @param {string} planeProjectId   Plane project UUID
 * @param {object} params
 * @param {string} params.name        Issue title (required)
 * @param {string} [params.description_html]  Rich text description
 * @param {string} [params.priority]  urgent|high|medium|low|none
 * @param {string} [params.state]     Plane state UUID (optional — uses default)
 * @param {object} [params.meta]      Free-form metadata stored in description
 */
async function createWorkItem(planeProjectId, params) {
  const { name, description_html, priority = 'medium', state, meta } = params;

  // Embed our metadata in description so it round-trips through webhooks
  const metaSection = meta
    ? `\n\n---\n<p><strong>Control Plane Metadata</strong></p><pre>${JSON.stringify(meta, null, 2)}</pre>`
    : '';

  const body = {
    name,
    description_html: (description_html || '') + metaSection,
    priority,
    ...(state ? { state } : {}),
  };
  // Plane stable uses /work-items/ as the canonical endpoint (alias for /issues/)
  return planeRequest('POST', `/workspaces/${cfg.workspaceSlug}/projects/${planeProjectId}/work-items/`, body);
}

/**
 * Update a Work Item's state/priority/name.
 */
async function updateWorkItem(planeProjectId, issueId, updates) {
  return planeRequest('PATCH', `/workspaces/${cfg.workspaceSlug}/projects/${planeProjectId}/work-items/${issueId}/`, updates);
}

/**
 * List Work Items in a project.
 */
async function listWorkItems(planeProjectId) {
  return planeRequest('GET', `/workspaces/${cfg.workspaceSlug}/projects/${planeProjectId}/work-items/`);
}

/**
 * Add a comment to a Work Item.
 */
async function addComment(planeProjectId, issueId, comment) {
  return planeRequest('POST', `/workspaces/${cfg.workspaceSlug}/projects/${planeProjectId}/work-items/${issueId}/comments/`, {
    comment_html: `<p>${comment}</p>`,
  });
}

module.exports = {
  isEnabled: () => cfg.enabled,
  ping,
  listProjects,
  createProject,
  getProject,
  createWorkItem,
  updateWorkItem,
  listWorkItems,
  addComment,
  config: cfg,
};
