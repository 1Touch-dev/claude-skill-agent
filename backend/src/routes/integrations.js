const express = require('express');
const { pool } = require('../lib/db');
const { testProvider } = require('../lib/connectors');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then((r) => r.rows);

function sanitizeConnection(row) {
  if (!row) return null;
  const vault = row.credential_vault || {};
  const configured =
    Boolean(vault.token || vault.access_token || vault.bot_token || vault.api_key) ||
    (typeof vault === 'object' && Object.keys(vault).length > 0 && vault.token_type);
  return {
    ...row,
    credential_vault: { configured, token_type: vault.token_type || null },
  };
}

router.get('/integrations', async (_req, res) => {
  try {
    const rows = await q('SELECT * FROM integration_connections ORDER BY id DESC');
    res.json(rows.map(sanitizeConnection));
  } catch (e) {
    res.status(500).json({ error: 'failed_to_fetch_connections', details: String(e) });
  }
});

router.get('/integrations/:id', async (req, res) => {
  try {
    const rows = await q('SELECT * FROM integration_connections WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'not_found' });
    res.json(sanitizeConnection(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'failed_to_fetch_connection', details: String(e) });
  }
});

router.post('/integrations', async (req, res) => {
  const { workspace_id, provider, name, endpoint_url, client_id, credential_vault, status, active } =
    req.body;
  try {
    const rows = await q(
      `INSERT INTO integration_connections(workspace_id, provider, name, endpoint_url, client_id, credential_vault, status, active)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, '{}'::jsonb), COALESCE($7, 'disconnected'), COALESCE($8, true)) RETURNING *`,
      [workspace_id, provider, name, endpoint_url, client_id, credential_vault, status, active]
    );
    res.status(201).json(sanitizeConnection(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'failed_to_create_connection', details: String(e) });
  }
});

router.put('/integrations/:id', async (req, res) => {
  const id = req.params.id;
  const p = req.body;
  try {
    const rows = await q(
      `UPDATE integration_connections
       SET workspace_id=COALESCE($1, workspace_id),
           provider=COALESCE($2, provider),
           name=COALESCE($3, name),
           endpoint_url=COALESCE($4, endpoint_url),
           client_id=COALESCE($5, client_id),
           credential_vault=COALESCE($6, credential_vault),
           status=COALESCE($7, status),
           active=COALESCE($8, active),
           updated_at=now()
       WHERE id=$9 RETURNING *`,
      [
        p.workspace_id,
        p.provider,
        p.name,
        p.endpoint_url,
        p.client_id,
        p.credential_vault,
        p.status,
        p.active,
        id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not_found' });
    res.json(sanitizeConnection(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'failed_to_update_connection', details: String(e) });
  }
});

router.post('/integrations/:id/test', async (req, res) => {
  try {
    const rows = await q('SELECT * FROM integration_connections WHERE id=$1', [req.params.id]);
    const conn = rows[0];
    if (!conn) return res.status(404).json({ error: 'not_found' });

    const result = testProvider(conn.provider, conn.credential_vault);
    const newStatus = result.status;

    await q(
      `UPDATE integration_connections SET status=$1, updated_at=now() WHERE id=$2`,
      [newStatus, conn.id]
    );

    res.json({
      integration_id: conn.id,
      provider: conn.provider,
      ...result,
    });
  } catch (e) {
    res.status(500).json({ error: 'integration_test_failed', details: String(e) });
  }
});

router.delete('/integrations/:id', async (req, res) => {
  try {
    await q('DELETE FROM integration_connections WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: 'failed_to_delete_connection', details: String(e) });
  }
});

module.exports = router;
