-- Adiciona campo para rastrear quando o courier foi notificado via push
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_notified_at TIMESTAMPTZ;
