-- Seed initial department suites
INSERT INTO department_suites (key, name, buyer_persona, department_labels, included_credits, metadata) VALUES
('marketing-and-growth','Marketing and Growth', '{"Marketing"}', '{"Marketing","Growth"}', 0, '{}'::jsonb),
('sales-and-revenue','Sales and Revenue', '{"Sales"}', '{"Sales","Revenue"}', 0, '{}'::jsonb),
('customer-service-and-customer-success','Customer Service and Customer Success', '{"Support"}', '{"Customer Service","Customer Success"}', 0, '{}'::jsonb),
('hr','HR', '{"HR"}', '{"HR"}', 0, '{}'::jsonb),
('it','IT', '{"IT"}', '{"IT"}', 0, '{}'::jsonb),
('engineering-and-product-development','Engineering and Product Development', '{"Engineering"}', '{"Engineering","Product Development"}', 0, '{}'::jsonb),
('product-management','Product Management', '{"Product"}', '{"Product Management"}', 0, '{}'::jsonb),
('design-and-creative-studio','Design and Creative Studio', '{"Design"}', '{"Design","Creative"}', 0, '{}'::jsonb),
('finance-and-accounting','Finance and Accounting', '{"Finance"}', '{"Finance","Accounting"}', 0, '{}'::jsonb),
('operations-and-pmo','Operations and PMO', '{"Operations"}', '{"Operations","PMO"}', 0, '{}'::jsonb),\
('data-analytics-and-business-intelligence','Data, Analytics, and Business Intelligence', '{"Analytics"}', '{"Data","Analytics","BI"}', 0, '{}'::jsonb),
('legal-compliance-and-risk','Legal, Compliance, and Risk', '{"Legal"}', '{"Legal","Compliance","Risk"}', 0, '{}'::jsonb),
('procurement-and-supply-chain','Procurement and Supply Chain', '{"Procurement"}', '{"Procurement","Supply Chain"}', 0, '{}'::jsonb),
('security-and-grc','Security and GRC', '{"Security"}', '{"Security","GRC"}', 0, '{}'::jsonb),
('executive-strategy','Executive Strategy', '{"Executive"}', '{"Executive Strategy"}', 0, '{}'::jsonb),
('product-marketing','Product Marketing', '{"Product Marketing"}', '{"Product Marketing"}', 0, '{}'::jsonb),
('quality-regulatory-and-business-assurance','Quality, Regulatory, and Business Assurance', '{"Quality"}', '{"Quality","Regulatory","Business Assurance"}', 0, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
