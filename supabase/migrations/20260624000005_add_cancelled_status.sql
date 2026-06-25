-- Adiciona 'cancelled' ao enum order_status para separar cancelamento do empresario de recusa do motoboy
ALTER TYPE order_status ADD VALUE 'cancelled';
