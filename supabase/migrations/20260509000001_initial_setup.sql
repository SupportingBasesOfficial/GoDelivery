-- ============================================================================
-- MIGRATION: Initial Setup - Base Template Universal
-- ============================================================================
-- Descrição: Configuração inicial do banco de dados com extensões essenciais
--            para qualquer projeto moderno.
-- Data: 2026-05-09
-- ============================================================================

-- ============================================================================
-- EXTENSÕES ESSENCIAIS
-- ============================================================================

-- UUID: Geração de identificadores únicos universais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- PG_NET: Requisições HTTP assíncronas do banco (webhooks, integrações)
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;

-- PGVECTOR: Suporte a embeddings e busca semântica (IA/ML)
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;

-- ============================================================================
-- FUNÇÕES GLOBAIS DE AUDITORIA
-- ============================================================================

-- Função: update_timestamp()
-- Descrição: Atualiza automaticamente o campo 'atualizado_em' em qualquer tabela
-- Uso: Adicione como trigger em todas as tabelas que precisam rastrear modificações
--
-- Exemplo de uso:
-- CREATE TRIGGER set_timestamp
-- BEFORE UPDATE ON sua_tabela
-- FOR EACH ROW
-- EXECUTE FUNCTION update_timestamp();
--
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON FUNCTION update_timestamp() IS 
'Função global de auditoria que atualiza automaticamente o campo atualizado_em.
Deve ser usada como trigger em todas as tabelas que rastreiam modificações.';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
