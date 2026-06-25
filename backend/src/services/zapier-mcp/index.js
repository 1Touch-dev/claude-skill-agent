/**
 * Zapier MCP Service
 *
 * Connects the platform to Zapier MCP, giving agents access to 9,000+ apps
 * (Asana, Monday, Gmail, HubSpot, Slack, Google Sheets, etc.) via a single
 * Streamable HTTP endpoint.
 *
 * Setup:
 *   1. Go to https://mcp.zapier.com → New MCP Server → select "Other" client
 *   2. Add tools (e.g. Asana: Create Task, Gmail: Send Email)
 *   3. Connect tab → Generate token
 *   4. Set ZAPIER_MCP_TOKEN + ZAPIER_MCP_ENABLED=true in .env
 *
 * Zapier MCP endpoint: https://mcp.zapier.com/api/v1/connect
 * Auth: Authorization: Bearer <ZAPIER_MCP_TOKEN>
 * Protocol: Streamable HTTP (JSON-RPC 2.0 over HTTP POST)
 */

const https = require('https');
const http = require('http');

const ZAPIER_MCP_ENDPOINT = process.env.ZAPIER_MCP_ENDPOINT || 'https://mcp.zapier.com/api/v1/connect';
const ZAPIER_MCP_TOKEN    = process.env.ZAPIER_MCP_TOKEN || '';
const ENABLED             = String(process.env.ZAPIER_MCP_ENABLED || 'false').toLowerCase() === 'true';

/** Whether Zapier MCP is configured and enabled */
function isEnabled() {
  return ENABLED && Boolean(ZAPIER_MCP_TOKEN);
}

/**
 * Send a JSON-RPC 2.0 request to the Zapier MCP endpoint.
 * Zapier MCP uses Streamable HTTP: POST a JSON-RPC message, receive JSON-RPC response.
 */
function rpc(method, params = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    });

    const url = new URL(ZAPIER_MCP_ENDPOINT);
    const lib = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + (url.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${ZAPIER_MCP_TOKEN}`,
        'Accept': 'application/json, text/event-stream',
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Zapier may return SSE stream or plain JSON
        // Strip SSE framing if present (lines starting with "data: ")
        const cleaned = data
          .split('\n')
          .filter((l) => l.startsWith('data: '))
          .map((l) => l.slice(6).trim())
          .filter(Boolean)
          .join('');

        const raw = cleaned || data;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) {
            reject(new Error(`Zapier MCP error: ${JSON.stringify(parsed.error)}`));
          } else {
            resolve(parsed.result || parsed);
          }
        } catch (e) {
          // If we can't parse JSON return raw for debugging
          resolve({ raw });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('Zapier MCP request timed out')); });
    req.write(body);
    req.end();
  });
}

/**
 * Test the connection by calling tools/list (MCP standard method).
 * Returns { ok: true, tool_count, tools } or { ok: false, error }.
 */
async function testConnection() {
  if (!ZAPIER_MCP_TOKEN) {
    return { ok: false, mode: 'unconfigured', error: 'ZAPIER_MCP_TOKEN not set' };
  }
  if (!ENABLED) {
    return { ok: false, mode: 'disabled', error: 'ZAPIER_MCP_ENABLED=false' };
  }
  try {
    const result = await rpc('tools/list');
    const tools = Array.isArray(result) ? result : (result.tools || []);
    return { ok: true, mode: 'live', tool_count: tools.length, tools };
  } catch (e) {
    return { ok: false, mode: 'live', error: String(e.message || e) };
  }
}

/**
 * List all enabled Zapier tools (actions).
 * Returns array of { name, description } tool objects.
 */
async function listTools() {
  if (!isEnabled()) return [];
  try {
    const result = await rpc('tools/list');
    return Array.isArray(result) ? result : (result.tools || []);
  } catch (e) {
    console.error('[zapier-mcp] listTools failed:', e.message);
    return [];
  }
}

/**
 * Execute a Zapier tool (action).
 *
 * @param {string} toolName  - The Zapier tool/action name (e.g. "asana_create_task")
 * @param {object} params    - Parameters for the action
 * @returns {{ ok: boolean, data?: any, error?: string }}
 */
async function executeTool(toolName, params = {}) {
  if (!isEnabled()) {
    return { ok: false, error: 'Zapier MCP not enabled or token not set' };
  }
  try {
    const result = await rpc('tools/call', {
      name: toolName,
      arguments: params,
    });
    return { ok: true, data: result };
  } catch (e) {
    console.error(`[zapier-mcp] executeTool(${toolName}) failed:`, e.message);
    return { ok: false, error: String(e.message || e) };
  }
}

module.exports = {
  isEnabled,
  testConnection,
  listTools,
  executeTool,
};
