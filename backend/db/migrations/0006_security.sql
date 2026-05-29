-- Security & supply-chain for third-party skills

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trust_level') THEN
    CREATE TYPE trust_level AS ENUM ('untrusted','reviewed','trusted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    CREATE TYPE review_status AS ENUM ('unscanned','scanning','reviewed','rejected');
  END IF;
END
$$;

-- Extend skills with security metadata
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS instruction_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sandbox_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quarantined BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust trust_level DEFAULT 'untrusted',
  ADD COLUMN IF NOT EXISTS review review_status DEFAULT 'unscanned',
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scan_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pinned_commit TEXT;

-- Detailed scan records (history)
CREATE TABLE IF NOT EXISTS security_scans (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  source_id INTEGER REFERENCES skill_sources(id) ON DELETE SET NULL,
  package_id INTEGER REFERENCES skill_packages(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status review_status NOT NULL DEFAULT 'unscanned',
  findings JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_version TEXT,
  reviewer TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_security_scans_skill ON security_scans(skill_id);
CREATE INDEX IF NOT EXISTS idx_security_scans_status ON security_scans(status);

-- Activation guard: unsafe skills must not activate (checked at API level)
