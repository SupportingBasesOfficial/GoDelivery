-- Migration: Functions e Triggers (v2)
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
        NEW.delivered_at := timezone('utc'::text, now());
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
-- 3. audit_order_status() — audit trail imutável com created_by
-- ============================================================
CREATE OR REPLACE FUNCTION audit_order_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_status_history (order_id, status, notes, created_by)
    VALUES (NEW.id, NEW.status, NULL, auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_order_status
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION audit_order_status();

-- ============================================================
-- 4. sync_courier_location() — mantém current_location em couriers atualizada
-- ============================================================
CREATE OR REPLACE FUNCTION sync_courier_location()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE couriers SET
        current_location_lat = NEW.latitude,
        current_location_lng = NEW.longitude,
        last_location_at = NEW.recorded_at,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.courier_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_courier_location
    AFTER INSERT ON courier_locations
    FOR EACH ROW
    EXECUTE FUNCTION sync_courier_location();

-- ============================================================
-- 5. update_courier_stats() — atualiza rating, entregas e ganhos
-- ============================================================
CREATE OR REPLACE FUNCTION update_courier_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.courier_id IS NOT NULL THEN
        UPDATE couriers SET
            total_deliveries = total_deliveries + 1,
            total_earnings = total_earnings + COALESCE(NEW.delivery_fee, 0),
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.courier_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_courier_stats
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered')
    EXECUTE FUNCTION update_courier_stats();
