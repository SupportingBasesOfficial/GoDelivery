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

-- 3) Garante schema cron acessivel e agenda execucao automatica
--    pg_cron no Supabase Cloud fica no schema 'cron'
DO $$
BEGIN
    -- Garante que o schema cron existe e esta no search_path
    IF NOT EXISTS (
        SELECT 1 FROM pg_namespace WHERE nspname = 'cron'
    ) THEN
        CREATE SCHEMA cron;
    END IF;

    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
EXCEPTION
    WHEN duplicate_object THEN
        -- Extensao ja existe em outro schema, ignora
        NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Aviso ao garantir pg_cron: %. Continuando...', SQLERRM;
END $$;

-- Agenda o job (usa schema qualificado para evitar ambiguidade)
SELECT cron.schedule(
    'mark-stale-couriers-offline',
    '*/2 * * * *',
    'SELECT mark_stale_couriers_offline();'
);

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
