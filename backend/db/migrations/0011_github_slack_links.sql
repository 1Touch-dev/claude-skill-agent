-- Migration 0011: GitHub and Slack link columns on task_intake + integration_events log

-- GitHub links on individual tasks
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS github_repo          TEXT;
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS github_issue_number  INTEGER;
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS github_pr_number     INTEGER;
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS github_issue_url     TEXT;
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS github_pr_url        TEXT;

-- Slack links on individual tasks
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS slack_channel_id  TEXT;
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS slack_thread_ts   TEXT;
ALTER TABLE task_intake ADD COLUMN IF NOT EXISTS slack_message_ts  TEXT;

-- Canonical integration event log (provider-agnostic, all GitHub/Slack/Plane events)
CREATE TABLE IF NOT EXISTS integration_events (
  id            SERIAL PRIMARY KEY,
  provider      TEXT        NOT NULL,                  -- 'github', 'slack', 'plane'
  event_type    TEXT        NOT NULL,                  -- 'pr.opened', 'message.sent', etc.
  external_id   TEXT,                                  -- provider's event/delivery ID
  task_id       INTEGER     REFERENCES task_intake(id) ON DELETE SET NULL,
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT        NOT NULL DEFAULT 'ok',     -- 'ok' | 'error' | 'skipped'
  error_message TEXT,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_events_task     ON integration_events(task_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_provider ON integration_events(provider, event_type);
CREATE INDEX IF NOT EXISTS idx_integration_events_ext_id   ON integration_events(provider, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_intake_github_issue    ON task_intake(github_issue_number) WHERE github_issue_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_intake_slack_thread    ON task_intake(slack_thread_ts)     WHERE slack_thread_ts     IS NOT NULL;
