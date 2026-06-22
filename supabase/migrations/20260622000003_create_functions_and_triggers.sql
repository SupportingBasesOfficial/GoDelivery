-- Migration: Functions e Triggers
-- Ordem: após tabelas (20260622000002_create_tables.sql)

-- ============================================================
-- 1. update_timestamp() — atualiza updated_at universal
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica em todas as tabelas com updated_at
CREATE TRIGGER set_timestamp_platform_settings
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_tenants
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_tenant_settings
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_couriers
    BEFORE UPDATE ON couriers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_orders
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_payments
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- 2. calculate_platform_fee() — calcula taxa da plataforma ao entregar
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_platform_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_settings platform_settings%ROWTYPE;
    v_fee DECIMAL(10,2);
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        SELECT * INTO v_settings FROM platform_settings WHERE is_active = true LIMIT 1;
        v_fee := GREATEST(
            NEW.delivery_fee * (v_settings.platform_percentage / 100),
            v_settings.min_tax_fee
        );
        NEW.platform_fee := v_fee;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_platform_fee
    BEFORE UPDATE ON orders
    FOR EACH ROW
    WHEN (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered')
    EXECUTE FUNCTION calculate_platform_fee();

-- ============================================================
-- 3. audit_order_status() — audit trail imutável
-- ============================================================
CREATE OR REPLACE FUNCTION audit_order_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_status_history (order_id, status, notes)
    VALUES (NEW.id, NEW.status, NULL);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_order_status
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION audit_order_status();

-- ============================================================
-- 4. notify_courier_on_order() — webhook para notificar motoboy
-- ============================================================
CREATE OR REPLACE FUNCTION notify_courier_on_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.courier_id IS NOT NULL AND OLD.courier_id IS NULL THEN
        PERFORM net.http_post(
            'https://api.godelivery.com/webhooks/notify-courier',
            jsonb_build_object(
                'courier_id', NEW.courier_id,
                'order_id', NEW.id,
                'type', 'new_order'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_courier_on_order
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (NEW.courier_id IS DISTINCT FROM OLD.courier_id AND NEW.courier_id IS NOT NULL)
    EXECUTE FUNCTION notify_courier_on_order();
