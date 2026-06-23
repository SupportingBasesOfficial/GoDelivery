-- Migration: Índices de performance (v2)
-- Ordem: após tabelas (20260622000002_create_tables.sql)

-- Orders: partial indexes excluindo soft-deleted
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_courier ON orders(courier_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_created ON orders(created_at DESC) WHERE deleted_at IS NULL;

-- Order history
CREATE INDEX idx_order_history_order_id ON order_status_history(order_id, created_at DESC);

-- Locations
CREATE INDEX idx_courier_locations_courier_recorded ON courier_locations(courier_id, recorded_at DESC);

-- Payments
CREATE INDEX idx_payments_tenant_created ON payments(tenant_id, created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read) WHERE is_read = false;

-- Tenants
CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_active ON tenants(is_active, deleted_at) WHERE deleted_at IS NULL;

-- Profiles
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;

-- Couriers
CREATE INDEX idx_couriers_tenant ON couriers(tenant_id);
CREATE INDEX idx_couriers_status ON couriers(status) WHERE status = 'available';
CREATE INDEX idx_couriers_tenant_status ON couriers(tenant_id, status) WHERE status = 'available';
