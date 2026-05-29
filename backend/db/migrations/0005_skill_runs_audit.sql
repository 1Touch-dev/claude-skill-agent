-- Skill runs, audit logs, and usage charges

CREATE TYPE run_state AS ENUM ('queued','started','awaiting_approval','approved','running','succeeded','failed','canceled');

CREATE TABLE IF NOT EXISTS skill_runs (
  id SERIAL PRIMARY KEY,
  task_id TEXT,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  user_id TEXT,
  agent_id TEXT,
  skill_id INTEGER REFERENCES skills(id) ON DELETE SET NULL,
  approvals JSONB NOT NULL DEFAULT '[]'::jsonb,
  tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_hash TEXT,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  risk_tier INTEGER NOT NULL DEFAULT 0,
  state run_state NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_runs_workspace ON skill_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_runs_customer ON skill_runs(customer_id);
CREATE INDEX IF NOT EXISTS idx_skill_runs_skill ON skill_runs(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_runs_state ON skill_runs(state);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES skill_runs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_run ON audit_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_at ON audit_logs(event_at);

-- Usage charges ledger connecting to credit pools
CREATE TABLE IF NOT EXISTS usage_charges (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES skill_runs(id) ON DELETE SET NULL,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  credits INTEGER NOT NULL CHECK (credits >= 0),
  pool_id INTEGER REFERENCES credit_pools(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'skill',
  charged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_usage_charges_workspace ON usage_charges(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_charges_run ON usage_charges(run_id);
