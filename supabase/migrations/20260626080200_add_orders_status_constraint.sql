-- Adiciona constraint CHECK extra na tabela orders para garantir valores validos de status
-- O enum order_status ja restringe, mas esta constraint fornece mensagem de erro mais clara
-- e protecao contra bypass do enum

ALTER TABLE orders
ADD CONSTRAINT orders_status_check
CHECK (status IN ('draft', 'pending_courier', 'accepted', 'collected', 'in_transit', 'delivered', 'rejected', 'cancelled'));
