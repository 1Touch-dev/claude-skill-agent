-- Migration 0013: Agency skills batch (Jun 25, 2026)
-- Adds 6 agency-focused marketing skills, links to Marketing Suite,
-- and extends agent allowed_skill_keys.
-- Fully idempotent (ON CONFLICT / WHERE NOT EXISTS guards).

-- ── 1. Insert skills ──────────────────────────────────────────────────────────
WITH src AS (SELECT id FROM skill_sources WHERE name = 'Marketing Skills')
INSERT INTO skills(key, name, source_id, lifecycle, department_tags, industry_tags, risk_tier, credit_cost, required_approvals, allowed_tools, metadata, trust, review)
SELECT x.key, x.name, src.id, 'enabled'::lifecycle_state,
       ARRAY['marketing'], ARRAY['saas','retail','agency'],
       x.risk, x.cost, 0, '[]'::jsonb,
       jsonb_build_object('description', x.description, 'example_prompt', x.example_prompt, 'category', 'agency'),
       'reviewed'::trust_level, 'reviewed'::review_status
FROM src,
(VALUES
  ('mkt_seo_content',       'SEO Content Writer',        1, 12, 'Generates SEO-optimised blog posts and articles from a keyword brief.',   'Write a 1,000-word SEO article targeting the keyword "AI marketing tools for agencies".'),
  ('mkt_ad_copy',           'Ad Copy Generator',         1, 10, 'Creates high-converting ad copy for Google, Meta and LinkedIn campaigns.', 'Write 3 Google Ads headlines and descriptions for a B2B SaaS targeting marketing directors.'),
  ('mkt_email_sequence',    'Email Sequence Builder',    1, 15, 'Builds personalised email nurture or cold-outreach sequences.',             'Write a 5-email cold outreach sequence for a digital marketing agency pitching SEO services.'),
  ('mkt_landing_copy',      'Landing Page Copy Generator', 1, 14, 'Writes full landing page copy including hero, benefits, CTA and FAQs.', 'Write landing page copy for an AI automation platform targeting small marketing agencies.'),
  ('mkt_social_post',       'Social Media Post Writer',  1, 8,  'Generates platform-native social posts for LinkedIn, Twitter/X and Instagram.', 'Write 5 LinkedIn posts for a marketing agency announcing a new AI content service.'),
  ('mkt_competitor_report', 'Competitor Analysis Report',1, 18, 'Produces a structured competitor analysis comparing up to 5 competitors.', 'Analyse the top 5 AI marketing tools for agencies: feature comparison, pricing, positioning.')
) AS x(key, name, risk, cost, description, example_prompt)
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE key = x.key);

-- ── 2. Insert skill_packages v1.0.0 for each new skill ───────────────────────
INSERT INTO skill_packages(skill_id, version, registry, integrity_hash)
SELECT s.id, '1.0.0', 'npm', 'sha256:agency-v1'
FROM skills s
WHERE s.key IN (
  'mkt_seo_content', 'mkt_ad_copy', 'mkt_email_sequence',
  'mkt_landing_copy', 'mkt_social_post', 'mkt_competitor_report'
)
AND NOT EXISTS (
  SELECT 1 FROM skill_packages p WHERE p.skill_id = s.id AND p.version = '1.0.0'
);

-- ── 3. Link all new skills to Marketing Suite ─────────────────────────────────
INSERT INTO suite_included_skills(suite_id, skill_id)
SELECT ds.id, s.id
FROM department_suites ds, skills s
WHERE ds.name = 'Marketing Suite'
AND s.key IN (
  'mkt_seo_content', 'mkt_ad_copy', 'mkt_email_sequence',
  'mkt_landing_copy', 'mkt_social_post', 'mkt_competitor_report'
)
AND NOT EXISTS (
  SELECT 1 FROM suite_included_skills si WHERE si.suite_id = ds.id AND si.skill_id = s.id
);

-- ── 4. Extend agent allowed_skill_keys ───────────────────────────────────────
-- Acme Agent: add all 6 new skills
UPDATE agent_profiles
SET allowed_skill_keys = array(
  SELECT DISTINCT unnest(
    allowed_skill_keys ||
    ARRAY['mkt_seo_content','mkt_ad_copy','mkt_email_sequence','mkt_landing_copy','mkt_social_post','mkt_competitor_report']
  )
)
WHERE name = 'Acme Agent';

-- Globex Agent: add all 6 new skills
UPDATE agent_profiles
SET allowed_skill_keys = array(
  SELECT DISTINCT unnest(
    allowed_skill_keys ||
    ARRAY['mkt_seo_content','mkt_ad_copy','mkt_email_sequence','mkt_landing_copy','mkt_social_post','mkt_competitor_report']
  )
)
WHERE name = 'Globex Agent';
