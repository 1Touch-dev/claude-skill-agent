-- Migration 0008: Integrations and Approvals tables

CREATE TABLE IF NOT EXISTS integration_connections (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'asana', 'monday', 'github', 'slack', 'trello'
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  client_id TEXT,
  credential_vault JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'error', 'disconnected'
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_workspace ON integration_connections(workspace_id);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id INTEGER REFERENCES integration_connections(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'task.created', 'task.updated', 'story.created', 'item.created'
  target_url TEXT NOT NULL,
  secret TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_integration ON webhook_subscriptions(integration_id);

CREATE TABLE IF NOT EXISTS approval_gates (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES skill_runs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  sla_deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  owners TEXT[] NOT NULL DEFAULT '{}',
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_gates_run ON approval_gates(run_id);
CREATE INDEX IF NOT EXISTS idx_approval_gates_status ON approval_gates(status);

-- Seed active integrations for Asana, Monday, GitHub, Slack, Trello
INSERT INTO integration_connections(workspace_id, provider, name, endpoint_url, client_id, credential_vault, status, active)
VALUES 
  (2, 'asana', 'Asana Connector', 'https://mcp.asana.com/v2/mcp', 'client_asana_prod', '{"token_type": "Bearer", "scopes": ["tasks", "webhooks"]}'::jsonb, 'connected', true),
  (2, 'monday', 'Monday.com Integration', 'https://developer.monday.com/api-reference/', 'client_monday_prod', '{"token_type": "OAuth2", "scopes": ["items", "updates"]}'::jsonb, 'connected', true),
  (2, 'github', 'GitHub MCP Server', 'https://api.githubcopilot.com/mcp/', 'client_github_prod', '{"token_type": "PersonalAccessToken", "scopes": ["repo", "issues"]}'::jsonb, 'connected', true),
  (2, 'slack', 'Slack Events Channel', 'https://api.slack.com/events-api', 'client_slack_prod', '{"token_type": "BotToken", "scopes": ["chat:write", "channels:history"]}'::jsonb, 'connected', true)
ON CONFLICT DO NOTHING;

-- Seed pending and decided approvals to make the UI look rich out of the box!
-- We link it to our seeded skill_runs (id = 1)
INSERT INTO approval_gates(run_id, status, owners, decided_by, decided_at, reason)
VALUES
  (1, 'approved', '{"compliance-officer@company.com", "ops-lead@company.com"}', 'compliance-officer@company.com', now() - INTERVAL '1 hour', 'Vetted and verified sandboxed script parameters.');
