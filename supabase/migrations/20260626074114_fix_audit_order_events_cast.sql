-- Corrige audit_order_events: mapeia order_status -> order_event_type manualmente
-- Cast direto entre enums distintos falha no PostgreSQL

CREATE OR REPLACE FUNCTION audit_order_events()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_role TEXT;
    v_tenant_id UUID;
    v_event_type order_event_type;
BEGIN
    -- Determina o tenant_id do pedido
    v_tenant_id := NEW.tenant_id;

    -- Determina o role do actor que fez a mudanca
    SELECT role INTO v_actor_role
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;

    IF v_actor_role IS NULL THEN
        v_actor_role := 'system';
    END IF;

    -- Mapeia order_status -> order_event_type
    CASE NEW.status
        WHEN 'pending' THEN
            v_event_type := 'created';
        WHEN 'pending_courier' THEN
            IF OLD.courier_id IS NULL AND NEW.courier_id IS NOT NULL THEN
                v_event_type := 'assigned';
            ELSIF OLD.courier_id IS NOT NULL AND NEW.courier_id IS NOT NULL AND OLD.courier_id <> NEW.courier_id THEN
                v_event_type := 'reassigned';
            ELSE
                v_event_type := 'assigned';
            END IF;
        WHEN 'accepted' THEN
            v_event_type := 'accepted';
            v_actor_role := 'courier';
        WHEN 'collected' THEN
            v_event_type := 'collected';
            v_actor_role := 'courier';
        WHEN 'in_transit' THEN
            v_event_type := 'in_transit';
            v_actor_role := 'courier';
        WHEN 'delivered' THEN
            v_event_type := 'delivered';
            v_actor_role := 'courier';
        WHEN 'rejected' THEN
            v_event_type := 'rejected';
            v_actor_role := 'courier';
        WHEN 'cancelled' THEN
            v_event_type := 'cancelled';
            v_actor_role := 'business_owner';
        ELSE
            v_event_type := 'created';
    END CASE;

    INSERT INTO order_events (
        order_id,
        event_type,
        actor_id,
        actor_role,
        courier_id,
        latitude,
        longitude,
        metadata,
        notes,
        created_at
    ) VALUES (
        NEW.id,
        v_event_type,
        auth.uid(),
        v_actor_role,
        NEW.courier_id,
        NULL,
        NULL,
        jsonb_build_object(
            'previous_status', OLD.status,
            'delivery_fee', NEW.delivery_fee,
            'order_value', NEW.order_value
        ),
        COALESCE(NEW.rejection_reason, NULL),
        timezone('utc'::text, now())
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
