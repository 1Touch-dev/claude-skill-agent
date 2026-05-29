-- Commercial layer schema: customers, workspaces, subscriptions, entitlements, credit pools, assignments, agent seats, feature flags, plan tiers

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  external_id TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  base_included_credits INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS plan_tiers (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE CASCADE,
  tier_index INTEGER NOT NULL,
  credit_band_min INTEGER NOT NULL,
  credit_band_max INTEGER,
  overage_rate_cents INTEGER,
  UNIQUE(plan_id, tier_index)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_active_workspace_unique
  ON subscriptions (workspace_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS credit_pools (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  included_credits INTEGER NOT NULL DEFAULT 0,
  consumed_credits INTEGER NOT NULL DEFAULT 0,
  overage_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('workspace','customer')),
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(scope, workspace_id, customer_id, flag_key)
);

CREATE TYPE entitlement_kind AS ENUM ('skill','package','suite','overlay');
CREATE TABLE IF NOT EXISTS license_entitlements (
  id SERIAL PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('workspace','customer')),
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  kind entitlement_kind NOT NULL,
  ref_id INTEGER NOT NULL,
  included_credits INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  required_approvals INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_suite_assignments (
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  suite_id INTEGER REFERENCES department_suites(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, suite_id)
);

CREATE TABLE IF NOT EXISTS workspace_overlay_assignments (
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  overlay_id INTEGER REFERENCES industry_overlays(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, overlay_id)
);

CREATE TABLE IF NOT EXISTS agent_seats (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  external_user_id TEXT,
  role TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
