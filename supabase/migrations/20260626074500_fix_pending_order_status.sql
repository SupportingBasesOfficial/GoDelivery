-- Corrige pedidos antigos que podem ter status 'pending' (valor removido do enum order_status)
-- Usa status::text para evitar validacao do enum no WHERE

UPDATE orders
SET status = 'draft'
WHERE status::text = 'pending';
