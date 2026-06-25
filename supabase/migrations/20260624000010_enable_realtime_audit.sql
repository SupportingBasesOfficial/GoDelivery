-- Habilita realtime nas tabelas de auditoria
ALTER PUBLICATION supabase_realtime ADD TABLE order_events;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_routes;

-- Trigger para registrar eventos automáticos de mudança de status em orders
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  event_type_val order_event_type;
  actor_role_val TEXT := 'system';
  notes_val TEXT := '';
BEGIN
  -- Ignora se status não mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determina o tipo de evento baseado no novo status
  CASE NEW.status
    WHEN 'pending_courier' THEN
      IF OLD.courier_id IS NULL AND NEW.courier_id IS NOT NULL THEN
        event_type_val := 'assigned';
      ELSIF OLD.courier_id IS NOT NULL AND NEW.courier_id IS NOT NULL AND OLD.courier_id <> NEW.courier_id THEN
        event_type_val := 'reassigned';
      ELSE
        event_type_val := 'assigned';
      END IF;
    WHEN 'accepted' THEN
      event_type_val := 'accepted';
      actor_role_val := 'courier';
    WHEN 'collected' THEN
      event_type_val := 'collected';
      actor_role_val := 'courier';
    WHEN 'in_transit' THEN
      event_type_val := 'in_transit';
      actor_role_val := 'courier';
    WHEN 'delivered' THEN
      event_type_val := 'delivered';
      actor_role_val := 'courier';
    WHEN 'rejected' THEN
      event_type_val := 'rejected';
      actor_role_val := 'courier';
    WHEN 'cancelled' THEN
      event_type_val := 'cancelled';
      actor_role_val := 'business_owner';
    ELSE
      RETURN NEW;
  END CASE;

  -- Registra o evento
  INSERT INTO order_events (order_id, event_type, actor_id, actor_role, courier_id, route_id, metadata, notes, created_at)
  VALUES (
    NEW.id,
    event_type_val,
    COALESCE(NEW.operated_by, NEW.courier_id, NEW.created_by),
    actor_role_val,
    NEW.courier_id,
    NEW.route_id,
    jsonb_build_object(
      'previous_status', OLD.status,
      'new_status', NEW.status,
      'previous_courier_id', OLD.courier_id,
      'new_courier_id', NEW.courier_id
    ),
    notes_val,
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger existente se houver
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;

CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_order_status_change();

-- Trigger para registrar criação de pedido
CREATE OR REPLACE FUNCTION log_order_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_events (order_id, event_type, actor_id, actor_role, metadata, created_at)
  VALUES (
    NEW.id,
    'created',
    NEW.created_by,
    'business_owner',
    jsonb_build_object('status', NEW.status),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_created_trigger ON orders;

CREATE TRIGGER order_created_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_created();

-- Trigger para atualizar updated_at em delivery_routes
CREATE OR REPLACE FUNCTION update_delivery_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS delivery_routes_updated_at_trigger ON delivery_routes;

CREATE TRIGGER delivery_routes_updated_at_trigger
  BEFORE UPDATE ON delivery_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_routes_updated_at();
