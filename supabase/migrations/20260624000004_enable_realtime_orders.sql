-- Habilita realtime para a tabela orders
-- Necessario para atualizacoes automaticas no painel web e app mobile

alter publication supabase_realtime add table orders;
