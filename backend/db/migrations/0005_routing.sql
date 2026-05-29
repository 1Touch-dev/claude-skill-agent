-- Agent profiles, task intake, routing and orchestration

CREATE TABLE IF NOT EXISTS agent_profiles (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT UNIQUE,
  pooled BOOLEAN NOT NULL DEFAULT false,
  autonomy_level INTEGER NOT NULL DEFAULT 0,
  allowed_skill_keys TEXT[] NOT NULL DEFAULT '{}',
  allowed_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional explicit skill mapping table if needed later
-- CREATE TABLE agent_allowed_skills (
--   agent_id INTEGER REFERENCES agent_profiles(id) ON DELETE CASCADE,
--   skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
--   PRIMARY KEY (agent_id, skill_id)
-- );

CREATE TABLE IF NOT EXISTS task_intake (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  risk_tier INTEGER DEFAULT 0,
  routing_mode TEXT NOT NULL DEFAULT 'auto', -- 'manual'|'auto'
  status TEXT NOT NULL DEFAULT 'queued',     -- 'queued'|'routed'|'running'|'completed'|'failed'
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_routes (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES task_intake(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agent_profiles(id) ON DELETE SET NULL,
  decided_by TEXT DEFAULT 'engine',
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  manual BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS orchestration_runs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES task_intake(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agent_profiles(id) ON DELETE SET NULL,
  skill_key TEXT,
  approval_required BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  credits_used INTEGER NOT NULL DEFAULT 0,
  log_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
