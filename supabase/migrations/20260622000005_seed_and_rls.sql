-- Migration: Seed data + Row Level Security Policies (v2)
-- Ordem: última (depende de todas as tabelas anteriores)

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO platform_settings (min_tax_fee, platform_percentage)
VALUES (5.00, 20.00);

-- ============================================================
-- HABILITA RLS EM TODAS AS TABELAS
-- ============================================================
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: platform_settings
-- ============================================================
CREATE POLICY "Admin read platform settings"
ON platform_settings FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admin update platform settings"
ON platform_settings FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- ============================================================
-- RLS: tenants
-- ============================================================
CREATE POLICY "Admin full access tenants"
ON tenants FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Business owner read own tenant"
ON tenants FOR SELECT
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = tenants.id
    )
);

CREATE POLICY "Business owner update own tenant"
ON tenants FOR UPDATE
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = tenants.id
    )
)
WITH CHECK (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = tenants.id
    )
);

-- ============================================================
-- RLS: tenant_settings
-- ============================================================
CREATE POLICY "Business owner full access tenant_settings"
ON tenant_settings FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admin read all tenant_settings"
ON tenant_settings FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- ============================================================
-- RLS: profiles
-- ============================================================
CREATE POLICY "Admin full access profiles"
ON profiles FOR ALL
USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM profiles self WHERE self.id = auth.uid() AND self.role = 'admin')
);

CREATE POLICY "Business owner read tenant profiles"
ON profiles FOR SELECT
USING (
    deleted_at IS NULL
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Business owner insert courier profile"
ON profiles FOR INSERT
WITH CHECK (
    role = 'courier'
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Courier read own profile"
ON profiles FOR SELECT
USING (id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Courier update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================
-- RLS: couriers
-- ============================================================
CREATE POLICY "Business owner full access couriers"
ON couriers FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Courier read own record"
ON couriers FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Courier update own record"
ON couriers FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================
-- RLS: orders
-- ============================================================
CREATE POLICY "Business owner full access orders"
ON orders FOR ALL
USING (
    deleted_at IS NULL
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Courier read assigned orders"
ON orders FOR SELECT
USING (courier_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Courier update assigned orders"
ON orders FOR UPDATE
USING (courier_id = auth.uid())
WITH CHECK (courier_id = auth.uid());

-- ============================================================
-- RLS: order_status_history
-- ============================================================
CREATE POLICY "Business owner read tenant history"
ON order_status_history FOR SELECT
USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_status_history.order_id
    AND o.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND o.deleted_at IS NULL
));

CREATE POLICY "Courier read assigned history"
ON order_status_history FOR SELECT
USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_status_history.order_id
    AND o.courier_id = auth.uid()
    AND o.deleted_at IS NULL
));

CREATE POLICY "Admin read all history"
ON order_status_history FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- ============================================================
-- RLS: courier_locations
-- ============================================================
CREATE POLICY "Business owner read tenant locations"
ON courier_locations FOR SELECT
USING (EXISTS (
    SELECT 1 FROM couriers c
    WHERE c.id = courier_locations.courier_id
    AND c.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
));

CREATE POLICY "Courier read own location"
ON courier_locations FOR SELECT
USING (courier_id = auth.uid());

CREATE POLICY "Courier insert own location"
ON courier_locations FOR INSERT
WITH CHECK (courier_id = auth.uid());

-- ============================================================
-- RLS: payments
-- ============================================================
CREATE POLICY "Admin read all payments"
ON payments FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Business owner read own payments"
ON payments FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- RLS: notifications
-- ============================================================
CREATE POLICY "Users full access own notifications"
ON notifications FOR ALL
USING (recipient_id = auth.uid());
