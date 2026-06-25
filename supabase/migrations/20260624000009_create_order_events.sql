-- Auditoria completa ponta a ponta de pedidos
CREATE TYPE order_event_type AS ENUM (
  'created',
  'assigned',
  'reassigned',
  'accepted',
  'rejected',
  'cancelled',
  'collected',
  'in_transit',
  'delivered',
  'courier_notified',
  'route_started',
  'route_ended',
  'location_updated'
);

CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type order_event_type NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT 'system', -- 'business_owner', 'courier', 'system', 'admin'
  courier_id UUID REFERENCES couriers(id) ON DELETE SET NULL,
  route_id UUID,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  metadata JSONB DEFAULT '{}', -- dados extras flexíveis
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order_id ON order_events(order_id);
CREATE INDEX idx_order_events_event_type ON order_events(event_type);
CREATE INDEX idx_order_events_courier_id ON order_events(courier_id);
CREATE INDEX idx_order_events_created_at ON order_events(created_at);

-- RLS para order_events: usuário vê eventos dos pedidos do seu tenant
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_events_select_tenant"
  ON order_events
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN couriers c ON c.id = o.courier_id OR EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tenant_id = c.tenant_id
      )
      WHERE o.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.tenant_id = (
              SELECT tenant_id FROM profiles WHERE id = o.created_by
            )
        )
    )
  );

CREATE POLICY "order_events_insert_system"
  ON order_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Tabela de rotas de entrega (um courier pode ter múltiplas rotas, cada rota múltiplos pedidos)
CREATE TABLE delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed'
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_distance_km DECIMAL(10, 2),
  estimated_duration_min INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_routes_courier_id ON delivery_routes(courier_id);
CREATE INDEX idx_delivery_routes_tenant_id ON delivery_routes(tenant_id);
CREATE INDEX idx_delivery_routes_status ON delivery_routes(status);

ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_routes_select_tenant"
  ON delivery_routes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tenant_id = delivery_routes.tenant_id
    )
  );

CREATE POLICY "delivery_routes_insert_tenant"
  ON delivery_routes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.tenant_id = delivery_routes.tenant_id
    )
  );

-- Adiciona campo route_id na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES delivery_routes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_route_id ON orders(route_id);

-- Campos de timestamps detalhados em orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Quem operou o pedido (último operador que fez ação)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS operated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_operated_by ON orders(operated_by);
