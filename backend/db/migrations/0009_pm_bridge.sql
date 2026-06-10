-- PM Bridge: track Plane CE integration state

-- Plane project reference on workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plane_project_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plane_project_identifier TEXT;

-- Plane issue reference on task_intake
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS plane_issue_id TEXT;
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS plane_issue_sequence_id INTEGER;

-- Plane webhook event log
CREATE TABLE IF NOT EXISTS plane_webhook_events (
  id                SERIAL PRIMARY KEY,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  plane_issue_id    TEXT,
  task_id           INTEGER REFERENCES task_intake(id) ON DELETE SET NULL,
  processed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plane_webhook_events_issue ON plane_webhook_events(plane_issue_id);
CREATE INDEX IF NOT EXISTS idx_plane_webhook_events_task  ON plane_webhook_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_intake_plane_issue    ON task_intake(plane_issue_id) WHERE plane_issue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_plane_project   ON workspaces(plane_project_id) WHERE plane_project_id IS NOT NULL;
