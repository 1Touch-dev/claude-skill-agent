-- Migration 0012: GitHub Poller support
-- Adds unique constraint on integration_events(provider, external_id) for ON CONFLICT dedup,
-- and a poller_cursors table to track the last-seen GitHub item per resource.

-- Unique constraint so the poller can do ON CONFLICT (provider, external_id) DO NOTHING
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_integration_events_provider_ext_id'
  ) THEN
    ALTER TABLE integration_events
      ADD CONSTRAINT uq_integration_events_provider_ext_id
      UNIQUE (provider, external_id);
  END IF;
END$$;

-- Poller cursor table: one row per resource (e.g. "github:prs", "github:issues")
-- Stores the last seen item number / updated_at so the poller can skip already-processed items.
CREATE TABLE IF NOT EXISTS poller_cursors (
  id           SERIAL PRIMARY KEY,
  resource     TEXT        NOT NULL UNIQUE,  -- e.g. 'github:prs', 'github:issues'
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01',
  last_seen_id BIGINT      NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
