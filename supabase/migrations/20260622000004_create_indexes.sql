-- Migration: Índices de performance
-- Ordem: após tabelas (20260622000002_create_tables.sql)

CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_courier ON orders(courier_id);
CREATE INDEX idx_order_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_courier_locations_courier_recorded ON courier_locations(courier_id, recorded_at DESC);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_tenants_slug ON tenants(slug);
