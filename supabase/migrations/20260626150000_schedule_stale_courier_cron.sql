-- ============================================================================
-- MIGRATION: Agenda cron job para marcar entregadores stale como offline
-- ============================================================================
-- Descricao: Como a migration anterior falhou na etapa do cron (schema nao
--            existia), esta migration agenda o job de forma independente.
-- ============================================================================

-- 1) Garante schema cron e extensao
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_namespace WHERE nspname = 'cron'
    ) THEN
        CREATE SCHEMA cron;
    END IF;

    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Aviso ao garantir pg_cron: %. Continuando...', SQLERRM;
END $$;

-- 2) Remove job anterior se existir (para evitar duplicado)
SELECT cron.unschedule('mark-stale-couriers-offline')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'mark-stale-couriers-offline'
);

-- 3) Agenda o job
SELECT cron.schedule(
    'mark-stale-couriers-offline',
    '*/2 * * * *',
    'SELECT mark_stale_couriers_offline();'
);

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
