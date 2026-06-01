const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// List all active connections and MCP integrations
router.get('/integrations', async (_req, res) => {
  try {
    const rows = await q('SELECT * FROM integration_connections ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'failed_to_fetch_connections', details: String(e) });
  }
});

// Create a new connector connection (vault credentials)
router.post('/integrations', async (req, res) => {
  const { workspace_id, provider, name, endpoint_url, client_id, credential_vault, status, active } = req.body;
  try {
    const rows = await q(
      `INSERT INTO integration_connections(workspace_id, provider, name, endpoint_url, client_id, credential_vault, status, active)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, '{}'::jsonb), COALESCE($7, 'connected'), COALESCE($8, true)) RETURNING *`,
      [workspace_id, provider, name, endpoint_url, client_id, credential_vault, status, active]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'failed_to_create_connection', details: String(e) });
  }
});

// Delete or unlink a connection
router.delete('/integrations/:id', async (req, res) => {
  try {
    await q('DELETE FROM integration_connections WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: 'failed_to_delete_connection', details: String(e) });
  }
});

module.exports = router;
