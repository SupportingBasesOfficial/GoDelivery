-- Seed platform_settings se estiver vazio
INSERT INTO platform_settings (min_tax_fee, platform_percentage, is_active, support_email)
SELECT 5.00, 20.00, true, 'suporte@godelivery.com'
WHERE NOT EXISTS (SELECT 1 FROM platform_settings);
