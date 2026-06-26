-- ============================================================================
-- MIGRATION: Limpa entregadores stale (offline automatico)
-- ============================================================================
-- Descricao: Marca entregadores como offline se nao enviarem localizacao
--            por mais de 2 minutos. Inclui motivo explicito do offline.
-- ============================================================================

-- 1) Adiciona coluna status_reason para registrar motivo do offline
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- 2) Cria funcao que marca entregadores stale como offline
CREATE OR REPLACE FUNCTION mark_stale_couriers_offline()
RETURNS VOID AS $$
DECLARE
    v_threshold INTERVAL := '2 minutes';
    v_reason TEXT := 'GPS inativo por mais de 2 minutos — conexao perdida ou app fechado';
    v_count INTEGER := 0;
BEGIN
    UPDATE couriers
    SET
        status = 'offline',
        status_reason = v_reason,
        updated_at = timezone('utc'::text, now())
    WHERE status != 'offline'
      AND last_location_at IS NOT NULL
      AND last_location_at < (timezone('utc'::text, now()) - v_threshold);

    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count > 0 THEN
        RAISE NOTICE 'mark_stale_couriers_offline: % courier(s) marcado(s) como offline', v_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3) Habilita pg_cron se disponivel e agenda execucao automatica
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    
    PERFORM cron.schedule(
        'mark-stale-couriers-offline',
        '*/2 * * * *',
        'SELECT mark_stale_couriers_offline();'
    );
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'pg_cron nao disponivel ou sem permissao. Job nao agendado. Habilite a extensao no Supabase Dashboard > Database > Extensions.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao configurar pg_cron: %. Job nao agendado.', SQLERRM;
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
