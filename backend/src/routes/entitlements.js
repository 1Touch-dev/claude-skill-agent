const express = require('express');
const { pool } = require('../lib/db');
const router = express.Router();
const q = (t, p = []) => pool.query(t, p).then(r => r.rows);

// Customers
router.get('/customers', async (_req, res) => res.json(await q('SELECT * FROM customers ORDER BY id DESC')));
router.post('/customers', async (req, res) => {
  const { external_id, name } = req.body;
  const rows = await q('INSERT INTO customers(external_id,name) VALUES ($1,$2) RETURNING *', [external_id, name]);
  res.status(201).json(rows[0]);
});

// Workspaces
router.get('/workspaces', async (_req, res) => res.json(await q('SELECT * FROM workspaces ORDER BY id DESC')));
router.post('/workspaces', async (req, res) => {
  const { customer_id, external_id, name } = req.body;
  const rows = await q('INSERT INTO workspaces(customer_id,external_id,name) VALUES ($1,$2,$3) RETURNING *', [customer_id, external_id, name]);
  res.status(201).json(rows[0]);
});

// Plans and tiers
router.get('/plans', async (_req, res) => res.json(await q('SELECT * FROM subscription_plans ORDER BY id')));
router.post('/plans', async (req, res) => {
  const { key, name, base_included_credits, features } = req.body;
  const rows = await q('INSERT INTO subscription_plans(key,name,base_included_credits,features) VALUES ($1,$2,$3,$4) RETURNING *', [key, name, base_included_credits, features]);
  res.status(201).json(rows[0]);
});
router.post('/plans/:plan_id/tiers', async (req, res) => {
  const plan_id = req.params.plan_id; const { tier_index, credit_band_min, credit_band_max, overage_rate_cents } = req.body;
  const rows = await q('INSERT INTO plan_tiers(plan_id,tier_index,credit_band_min,credit_band_max,overage_rate_cents) VALUES ($1,$2,$3,$4,$5) RETURNING *', [plan_id, tier_index, credit_band_min, credit_band_max, overage_rate_cents]);
  res.status(201).json(rows[0]);
});

// Subscriptions
router.get('/subscriptions', async (_req, res) => res.json(await q('SELECT * FROM subscriptions ORDER BY id DESC')));
router.post('/subscriptions', async (req, res) => {
  const { customer_id, workspace_id, plan_id, status, starts_at, ends_at } = req.body;
  const rows = await q('INSERT INTO subscriptions(customer_id,workspace_id,plan_id,status,starts_at,ends_at) VALUES ($1,$2,$3,COALESCE($4,\'active\'),COALESCE($5,now()),$6) RETURNING *', [customer_id, workspace_id, plan_id, status, starts_at, ends_at]);
  res.status(201).json(rows[0]);
});

// Feature flags
router.post('/feature-flags', async (req, res) => {
  const { scope, workspace_id, customer_id, flag_key, enabled, config } = req.body;
  const rows = await q('INSERT INTO feature_flags(scope,workspace_id,customer_id,flag_key,enabled,config) VALUES ($1,$2,$3,$4,COALESCE($5,false),COALESCE($6,\'{}\'::jsonb)) ON CONFLICT (scope,workspace_id,customer_id,flag_key) DO UPDATE SET enabled=EXCLUDED.enabled, config=EXCLUDED.config RETURNING *', [scope, workspace_id, customer_id, flag_key, enabled, config]);
  res.status(201).json(rows[0]);
});

// License entitlements
router.get('/entitlements', async (_req, res) => res.json(await q('SELECT * FROM license_entitlements ORDER BY id DESC')));
router.post('/entitlements', async (req, res) => {
  const { scope, workspace_id, customer_id, kind, ref_id, included_credits, expires_at, required_approvals, metadata } = req.body;
  const rows = await q('INSERT INTO license_entitlements(scope,workspace_id,customer_id,kind,ref_id,included_credits,expires_at,required_approvals,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,\'{}\'::jsonb)) RETURNING *', [scope, workspace_id, customer_id, kind, ref_id, included_credits, expires_at, required_approvals, metadata]);
  res.status(201).json(rows[0]);
});

// Credit pools
router.get('/credit-pools', async (_req, res) => res.json(await q('SELECT * FROM credit_pools ORDER BY id DESC')));
router.post('/credit-pools', async (req, res) => {
  const { workspace_id, period_start, period_end, included_credits } = req.body;
  const rows = await q('INSERT INTO credit_pools(workspace_id,period_start,period_end,included_credits) VALUES ($1,$2,$3,$4) RETURNING *', [workspace_id, period_start, period_end, included_credits]);
  res.status(201).json(rows[0]);
});

// Activation checks (workspace-level)
router.get('/activation/workspace/:id', async (req, res) => {
  const id = req.params.id;
  const suites = await q('SELECT * FROM workspace_suite_assignments WHERE workspace_id=$1 AND active=true', [id]);
  const overlays = await q('SELECT * FROM workspace_overlay_assignments WHERE workspace_id=$1 AND active=true', [id]);
  const subs = await q('SELECT * FROM subscriptions WHERE workspace_id=$1 AND status=\'active\'', [id]);
  res.json({ suites, overlays, subscriptions: subs });
});

module.exports = router;
