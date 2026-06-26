-- Corrige pedidos com status invalido 'pending' que ainda existam no banco
-- Usa cast para text para encontrar registros sem validacao do enum

UPDATE orders
SET status = 'draft'
WHERE status::text = 'pending';
