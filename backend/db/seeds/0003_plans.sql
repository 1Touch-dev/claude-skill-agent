-- Seed example subscription plans and tiers
INSERT INTO subscription_plans (key, name, base_included_credits, features) VALUES
('starter', 'Starter', 10000, '{"seats":5,"support":"email"}'::jsonb),
('growth', 'Growth', 100000, '{"seats":50,"support":"priority"}'::jsonb),
('enterprise', 'Enterprise', 1000000, '{"seats":1000,"support":"24x7"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO plan_tiers (plan_id, tier_index, credit_band_min, credit_band_max, overage_rate_cents)
SELECT id, 1, 0, 100000, 50 FROM subscription_plans WHERE key='starter'
ON CONFLICT DO NOTHING;

INSERT INTO plan_tiers (plan_id, tier_index, credit_band_min, credit_band_max, overage_rate_cents)
SELECT id, 1, 0, 1000000, 30 FROM subscription_plans WHERE key='growth'
ON CONFLICT DO NOTHING;

INSERT INTO plan_tiers (plan_id, tier_index, credit_band_min, credit_band_max, overage_rate_cents)
SELECT id, 1, 0, NULL, 20 FROM subscription_plans WHERE key='enterprise'
ON CONFLICT DO NOTHING;
