-- Fix: calculate_platform_fee() falhava quando platform_settings estava vazio
-- causando "null value in column platform_fee violates not-null constraint"

CREATE OR REPLACE FUNCTION calculate_platform_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_settings platform_settings%ROWTYPE;
    v_fee DECIMAL(10,2);
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        SELECT * INTO v_settings FROM platform_settings WHERE is_active = true LIMIT 1;

        IF NOT FOUND THEN
            v_fee := 0;
        ELSE
            v_fee := GREATEST(
                NEW.delivery_fee * (v_settings.platform_percentage / 100),
                v_settings.min_tax_fee
            );
        END IF;

        NEW.platform_fee := v_fee;
        NEW.delivered_at := timezone('utc'::text, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
