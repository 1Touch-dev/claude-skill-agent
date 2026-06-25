/**
 * MCP routes — /api/mcp
 *
 * Exposes Zapier MCP tool listing and execution to the admin UI and
 * internal agent orchestration.  Restricted to admin/operator roles.
 */

const express = require('express');
const zapier = require('../services/zapier-mcp');
const { pool } = require('../lib/db');

const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then((r) => r.rows);

// ── GET /api/mcp/status ───────────────────────────────────────────────────────
// Quick status: is Zapier MCP configured and connected?
router.get('/mcp/status', async (_req, res) => {
  try {
    const result = await zapier.testConnection();
    res.json({
      enabled: zapier.isEnabled(),
      ...result,
    });
  } catch (e) {
    res.status(500).json({ error: 'mcp_status_error', details: String(e) });
  }
});

// ── GET /api/mcp/tools ────────────────────────────────────────────────────────
// List all enabled Zapier tools/actions.
router.get('/mcp/tools', async (_req, res) => {
  if (!zapier.isEnabled()) {
    return res.json({
      enabled: false,
      message: 'Zapier MCP not enabled. Set ZAPIER_MCP_ENABLED=true and ZAPIER_MCP_TOKEN in .env',
      tools: [],
    });
  }
  try {
    const tools = await zapier.listTools();
    res.json({ enabled: true, tool_count: tools.length, tools });
  } catch (e) {
    res.status(500).json({ error: 'mcp_list_tools_error', details: String(e) });
  }
});

// ── POST /api/mcp/execute ─────────────────────────────────────────────────────
// Execute a Zapier tool (action).
// Body: { tool_name, params, task_id? }
// Logs to integration_events for audit trail.
router.post('/mcp/execute', async (req, res) => {
  const { tool_name, params, task_id } = req.body || {};
  if (!tool_name) {
    return res.status(400).json({ error: 'missing_field', field: 'tool_name' });
  }
  if (!zapier.isEnabled()) {
    return res.status(503).json({
      error: 'zapier_mcp_disabled',
      message: 'Set ZAPIER_MCP_ENABLED=true and ZAPIER_MCP_TOKEN in .env',
    });
  }

  try {
    const result = await zapier.executeTool(tool_name, params || {});

    // Log to integration_events for audit
    try {
      const deliveryId = `mcp-${Date.now()}`;
      await q(
        `INSERT INTO integration_events(provider, event_type, external_id, payload, task_id)
         VALUES ('zapier_mcp', $1, $2, $3, $4)
         ON CONFLICT (provider, external_id) DO NOTHING`,
        [tool_name, deliveryId, JSON.stringify({ tool_name, params, result }), task_id || null],
      );
    } catch (_) { /* audit log non-fatal */ }

    if (result.ok) {
      res.json({ ok: true, tool_name, data: result.data });
    } else {
      res.status(502).json({ ok: false, tool_name, error: result.error });
    }
  } catch (e) {
    res.status(500).json({ error: 'mcp_execute_error', details: String(e) });
  }
});

module.exports = router;
