-- Corrige qualquer pedido restante com status invalido 'pending'
-- Usa cast para text para encontrar registros, depois atualiza para 'draft'

DO $$
DECLARE
    v_count INT;
BEGIN
    -- Conta pedidos com status 'pending' usando cast para text
    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE status::text = 'pending';

    IF v_count > 0 THEN
        -- Atualiza para 'draft' (status inicial valido)
        UPDATE orders
        SET status = 'draft'
        WHERE status::text = 'pending';

        RAISE NOTICE 'Corrigidos % pedidos com status pending invalido', v_count;
    ELSE
        RAISE NOTICE 'Nenhum pedido com status pending encontrado';
    END IF;
END $$;
