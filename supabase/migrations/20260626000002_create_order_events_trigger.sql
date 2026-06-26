-- Trigger unificado de auditoria: popula order_events a cada mudança de status
-- Substitui/amplia o audit_order_status() com dados mais ricos (actor, metadata)

CREATE OR REPLACE FUNCTION audit_order_events()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_role TEXT;
    v_tenant_id UUID;
BEGIN
    -- Determina o tenant_id do pedido
    v_tenant_id := NEW.tenant_id;

    -- Determina o role do actor que fez a mudança
    -- auth.uid() pode ser courier, business_owner ou admin
    SELECT role INTO v_actor_role
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;

    IF v_actor_role IS NULL THEN
        v_actor_role := 'system';
    END IF;

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
        NEW.status::order_event_type,
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

-- Remove trigger antigo de order_status_history (mantém a tabela para compatibilidade)
DROP TRIGGER IF EXISTS trg_audit_order_status ON orders;

-- Cria novo trigger unificado
CREATE TRIGGER trg_audit_order_events
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION audit_order_events();
