-- Corrige realtime para couriers: garante replica identity e adiciona a publication correta
ALTER TABLE couriers REPLICA IDENTITY FULL;

-- Adiciona couriers a publication do realtime (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'couriers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE couriers;
  END IF;
END
$$;
