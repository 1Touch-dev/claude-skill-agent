CREATE TYPE trust_level AS ENUM ('untrusted','reviewed','trusted');
CREATE TYPE source_type AS ENUM ('git','http','local','registry');
CREATE TYPE review_status AS ENUM ('unscanned','scanning','reviewed','rejected');
CREATE TYPE lifecycle_state AS ENUM ('draft','reviewed','enabled','disabled','deprecated','quarantined');

CREATE TABLE IF NOT EXISTS skill_sources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  type source_type NOT NULL DEFAULT 'git',
  trust trust_level NOT NULL DEFAULT 'untrusted',
  pinned_ref TEXT,
  review review_status NOT NULL DEFAULT 'unscanned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  source_id INTEGER REFERENCES skill_sources(id) ON DELETE SET NULL,
  lifecycle lifecycle_state NOT NULL DEFAULT 'draft',
  department_tags TEXT[] DEFAULT '{}',
  industry_tags TEXT[] DEFAULT '{}',
  risk_tier INTEGER DEFAULT 0,
  credit_cost INTEGER DEFAULT 0,
  required_approvals INTEGER DEFAULT 0,
  allowed_tools JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_packages (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  registry TEXT,
  integrity_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_id, version)
);
