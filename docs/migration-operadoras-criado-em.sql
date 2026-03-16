-- =============================================================================
-- MIGRAÇÃO: operadoras - DEFAULT criado_em + CHECK slug
-- Execute no Supabase SQL Editor.
--
-- A) criado_em com DEFAULT now() para inserts funcionarem
-- C) CHECK em slug (apenas letras minúsculas, números e underscore)
-- =============================================================================

-- Default para criado_em em novos registros
ALTER TABLE operadoras
ALTER COLUMN criado_em SET DEFAULT now();

-- Remover constraint antiga se existir
ALTER TABLE operadoras DROP CONSTRAINT IF EXISTS operadoras_slug_format_check;

-- Garantir formato do slug: apenas a-z, 0-9 e underscore
ALTER TABLE operadoras
ADD CONSTRAINT operadoras_slug_format_check
CHECK (slug ~ '^[a-z0-9_]+$');

-- =============================================================================
-- NOTA: slug deve ser PK ou UNIQUE. Verificar com:
-- SELECT indexdef FROM pg_indexes WHERE tablename = 'operadoras';
-- Se não houver UNIQUE em slug, considerar:
-- ALTER TABLE operadoras ADD CONSTRAINT operadoras_slug_key UNIQUE (slug);
-- =============================================================================
