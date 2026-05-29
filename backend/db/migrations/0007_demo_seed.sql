-- Demo seed data (idempotent via ON CONFLICT or WHERE NOT EXISTS guards)

-- Seed skill sources
INSERT INTO skill_sources(name,url,type,trust,pinned_ref,review)
SELECT x.name, x.url, x.type::source_type, x.trust::trust_level, x.pinned_ref, x.review::review_status
FROM (
  VALUES
    ('Marketing Skills','https://git.example.com/skills/marketing.git','git','reviewed','abcdef1','reviewed'),
    ('Engineering Skills','https://git.example.com/skills/engineering.git','git','reviewed','abcdef2','reviewed'),
    ('Product Skills','https://git.example.com/skills/product.git','git','reviewed','abcdef3','reviewed'),
    ('Security Skills','https://git.example.com/skills/security.git','git','trusted','deadbeef','reviewed'),
    ('Ops Skills','https://git.example.com/skills/ops.git','git','reviewed','abcd999','reviewed'),
    ('Customer Success Skills','https://git.example.com/skills/cs.git','git','reviewed','abcd888','reviewed')
) AS x(name,url,type,trust,pinned_ref,review)
WHERE NOT EXISTS (SELECT 1 FROM skill_sources s WHERE s.name=x.name);

-- Helper to get source id by name
-- Skills per department with minimal metadata
WITH src AS (
  SELECT name, id FROM skill_sources
)
INSERT INTO skills(key,name,source_id,lifecycle,department_tags,industry_tags,risk_tier,credit_cost,required_approvals,allowed_tools,metadata,trust,review)
SELECT x.key, x.name, s.id, 'enabled'::lifecycle_state, x.dept, x.ind, x.risk, x.cost, x.approvals, '[]'::jsonb, '{}'::jsonb, x.trust::trust_level, x.review::review_status
FROM (
  VALUES
    ('mkt_campaign_brief','Campaign Brief Generator','Marketing Skills',ARRAY['marketing'],ARRAY['saas','retail'],1,10,0,'reviewed','reviewed'),
    ('eng_pr_summary','PR Summary Bot','Engineering Skills',ARRAY['engineering'],ARRAY['saas'],1,8,0,'reviewed','reviewed'),
    ('prod_spec_outline','Spec Outline Assistant','Product Skills',ARRAY['product'],ARRAY['saas'],1,12,0,'reviewed','reviewed'),
    ('grc_policy_check','Policy Checker','Security Skills',ARRAY['security','grc'],ARRAY['saas','finserv','healthcare'],3,20,1,'trusted','reviewed'),
    ('ops_runbook','Runbook Draft','Ops Skills',ARRAY['operations'],ARRAY['saas'],1,6,0,'reviewed','reviewed'),
    ('cs_response_helper','CS Response Helper','Customer Success Skills',ARRAY['customer_success'],ARRAY['saas','retail'],1,5,0,'reviewed','reviewed')
) AS x(key,name,src_name,dept,ind,risk,cost,approvals,trust,review)
JOIN src s ON s.name=x.src_name
WHERE NOT EXISTS (SELECT 1 FROM skills k WHERE k.key=x.key);

-- Packages (version 1.0.0)
INSERT INTO skill_packages(skill_id,version,registry,integrity_hash)
SELECT id,'1.0.0','npm','sha256:demo'
FROM skills k
WHERE NOT EXISTS (SELECT 1 FROM skill_packages p WHERE p.skill_id=k.id AND p.version='1.0.0');

-- Department suites
INSERT INTO department_suites(key,name,buyer_persona,department_labels,included_credits)
SELECT x.key,x.name,x.persona,x.labels,x.credits FROM (
  VALUES
    ('suite_marketing','Marketing Suite',ARRAY['VP Marketing'],ARRAY['marketing'],500),
    ('suite_engineering','Engineering Suite',ARRAY['VP Engineering'],ARRAY['engineering'],500),
    ('suite_product','Product Suite',ARRAY['CPO'],ARRAY['product'],400),
    ('suite_security_grc','Security & GRC Suite',ARRAY['CISO','GRC Lead'],ARRAY['security','grc'],600),
    ('suite_ops','Operations Suite',ARRAY['COO'],ARRAY['operations'],400),
    ('suite_cs','Customer Success Suite',ARRAY['Head of CS'],ARRAY['customer_success'],400)
) AS x(key,name,persona,labels,credits)
WHERE NOT EXISTS (SELECT 1 FROM department_suites d WHERE d.key=x.key);

-- Industry overlays
INSERT INTO industry_overlays(key,name,add_on_licensing,included_credits)
SELECT x.key,x.name,true,x.credits FROM (
  VALUES
    ('overlay_tech_saas','Technology & SaaS',200),
    ('overlay_retail','Retail & E-commerce',200),
    ('overlay_health','Healthcare & Life Sciences',300),
    ('overlay_finserv','Financial Services',300),
    ('overlay_cre','Commercial Real Estate',200)
) AS x(key,name,credits)
WHERE NOT EXISTS (SELECT 1 FROM industry_overlays o WHERE o.key=x.key);

-- Map overlays to relevant suites (starter packs)
INSERT INTO overlay_suites(overlay_id,suite_id)
SELECT o.id, s.id FROM industry_overlays o, department_suites s
WHERE (
  (o.key='overlay_tech_saas' AND s.key IN ('suite_marketing','suite_engineering','suite_product','suite_ops','suite_cs')) OR
  (o.key='overlay_retail' AND s.key IN ('suite_marketing','suite_cs','suite_ops')) OR
  (o.key='overlay_health' AND s.key IN ('suite_security_grc','suite_ops')) OR
  (o.key='overlay_finserv' AND s.key IN ('suite_security_grc','suite_product')) OR
  (o.key='overlay_cre' AND s.key IN ('suite_marketing','suite_ops'))
) ON CONFLICT DO NOTHING;

-- Demo customers and workspaces
INSERT INTO customers(external_id,name)
SELECT x.external_id, x.name FROM (
  VALUES ('cust_demo_acme','Acme Corp'),('cust_demo_globex','Globex Inc')
) AS x(external_id,name)
WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.external_id=x.external_id);

INSERT INTO workspaces(customer_id,external_id,name)
SELECT c.id, x.external_id, x.name FROM (
  VALUES ('ws_acme_main','Acme Main'),('ws_globex_main','Globex Main')
) AS x(external_id,name)
JOIN customers c ON c.external_id = CASE WHEN x.external_id LIKE 'ws_acme_%' THEN 'cust_demo_acme' ELSE 'cust_demo_globex' END
WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.external_id=x.external_id);

-- Seed entitlements (suite + overlay for each workspace)
INSERT INTO license_entitlements(scope,workspace_id,customer_id,kind,ref_id,included_credits,expires_at,required_approvals)
SELECT 'workspace', w.id, NULL, 'suite', s.id, s.included_credits, NULL, 0
FROM workspaces w
JOIN department_suites s ON s.key IN ('suite_marketing','suite_engineering')
WHERE NOT EXISTS (SELECT 1 FROM license_entitlements e WHERE e.workspace_id=w.id AND e.kind='suite' AND e.ref_id=s.id);

INSERT INTO license_entitlements(scope,workspace_id,customer_id,kind,ref_id,included_credits,expires_at,required_approvals)
SELECT 'workspace', w.id, NULL, 'overlay', o.id, o.included_credits, NULL, 0
FROM workspaces w
JOIN industry_overlays o ON o.key IN ('overlay_tech_saas','overlay_retail')
WHERE NOT EXISTS (SELECT 1 FROM license_entitlements e WHERE e.workspace_id=w.id AND e.kind='overlay' AND e.ref_id=o.id);

-- Agent profiles per workspace
INSERT INTO agent_profiles(workspace_id,name,key,pooled,autonomy_level,allowed_skill_keys,allowed_tools,metadata)
SELECT w.id, 'Acme Agent', 'acme-agent', true, 2, ARRAY['mkt_campaign_brief','eng_pr_summary','prod_spec_outline','ops_runbook','cs_response_helper'], '[]'::jsonb, '{}'::jsonb
FROM workspaces w WHERE w.external_id='ws_acme_main' AND NOT EXISTS (SELECT 1 FROM agent_profiles a WHERE a.key='acme-agent');

INSERT INTO agent_profiles(workspace_id,name,key,pooled,autonomy_level,allowed_skill_keys,allowed_tools,metadata)
SELECT w.id, 'Globex Agent', 'globex-agent', true, 3, ARRAY['mkt_campaign_brief','eng_pr_summary','grc_policy_check','ops_runbook'], '[]'::jsonb, '{}'::jsonb
FROM workspaces w WHERE w.external_id='ws_globex_main' AND NOT EXISTS (SELECT 1 FROM agent_profiles a WHERE a.key='globex-agent');

-- Credit pools for current month
INSERT INTO credit_pools(workspace_id,period_start,period_end,included_credits,consumed_credits,overage_credits)
SELECT w.id, date_trunc('month', now()), (date_trunc('month', now()) + INTERVAL '1 month' - INTERVAL '1 second'), 1000, 0, 0
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM credit_pools p WHERE p.workspace_id=w.id AND p.period_start=date_trunc('month', now())
);

-- Sample run history and usage (small)
WITH ws AS (SELECT id AS workspace_id FROM workspaces),
     sk AS (SELECT id AS skill_id, key FROM skills)
INSERT INTO skill_runs(task_id,workspace_id,user_id,agent_id,skill_id,risk_tier,state,credits_charged,created_at)
SELECT 'demo-task-1', (SELECT id FROM workspaces WHERE external_id='ws_acme_main'), 'user_acme', NULL, (SELECT id FROM skills WHERE key='mkt_campaign_brief'), 1, 'succeeded', 10, now() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM skill_runs r WHERE r.task_id='demo-task-1');

INSERT INTO usage_charges(run_id,workspace_id,customer_id,credits,charged_at,source)
SELECT r.id, r.workspace_id, NULL, 10, now() - INTERVAL '2 days', 'skill'
FROM skill_runs r WHERE r.task_id='demo-task-1'
AND NOT EXISTS (SELECT 1 FROM usage_charges u WHERE u.run_id=r.id);

-- Minimal audit events for governance
INSERT INTO audit_logs(run_id,event_type,data)
SELECT r.id,'approval_required','{}'::jsonb FROM skill_runs r WHERE r.task_id='demo-task-1'
AND NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.run_id=r.id AND a.event_type='approval_required');
INSERT INTO audit_logs(run_id,event_type,data)
SELECT r.id,'approval_granted','{}'::jsonb FROM skill_runs r WHERE r.task_id='demo-task-1'
AND NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.run_id=r.id AND a.event_type='approval_granted');
