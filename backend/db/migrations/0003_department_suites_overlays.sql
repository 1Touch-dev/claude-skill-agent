-- Department suites and industry overlays schema

CREATE TABLE IF NOT EXISTS department_suites (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  buyer_persona TEXT[] DEFAULT '{}',
  department_labels TEXT[] DEFAULT '{}',
  included_credits INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS industry_overlays (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  add_on_licensing BOOLEAN NOT NULL DEFAULT true,
  included_credits INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composition (skills/packages included in suites/overlays)
CREATE TABLE IF NOT EXISTS suite_included_skills (
  suite_id INTEGER REFERENCES department_suites(id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (suite_id, skill_id)
);

CREATE TABLE IF NOT EXISTS suite_included_packages (
  suite_id INTEGER REFERENCES department_suites(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES skill_packages(id) ON DELETE CASCADE,
  PRIMARY KEY (suite_id, package_id)
);

CREATE TABLE IF NOT EXISTS overlay_included_skills (
  overlay_id INTEGER REFERENCES industry_overlays(id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (overlay_id, skill_id)
);

CREATE TABLE IF NOT EXISTS overlay_included_packages (
  overlay_id INTEGER REFERENCES industry_overlays(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES skill_packages(id) ON DELETE CASCADE,
  PRIMARY KEY (overlay_id, package_id)
);

-- Overlay-to-suite relationship (overlays layer on top of suites, many-to-many)
CREATE TABLE IF NOT EXISTS overlay_suites (
  overlay_id INTEGER REFERENCES industry_overlays(id) ON DELETE CASCADE,
  suite_id INTEGER REFERENCES department_suites(id) ON DELETE CASCADE,
  PRIMARY KEY (overlay_id, suite_id)
);

-- Activation per workspace and per customer
CREATE TABLE IF NOT EXISTS workspace_suite_activations (
  workspace_id TEXT NOT NULL,
  suite_id INTEGER REFERENCES department_suites(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, suite_id)
);

CREATE TABLE IF NOT EXISTS customer_suite_activations (
  customer_id TEXT NOT NULL,
  suite_id INTEGER REFERENCES department_suites(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, suite_id)
);

CREATE TABLE IF NOT EXISTS workspace_overlay_activations (
  workspace_id TEXT NOT NULL,
  overlay_id INTEGER REFERENCES industry_overlays(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, overlay_id)
);

CREATE TABLE IF NOT EXISTS customer_overlay_activations (
  customer_id TEXT NOT NULL,
  overlay_id INTEGER REFERENCES industry_overlays(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, overlay_id)
);
