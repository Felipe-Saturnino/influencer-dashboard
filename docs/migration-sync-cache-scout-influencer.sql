-- =============================================================================
-- MIGRAÇÃO: Sincronizar cache_negociado do Scout para cache_hora em influencer_perfil
--
-- Problema: Influencers criados via Scout (status Fechado) vinham com cache_hora = 0
-- porque cache_negociado (Scout) não estava sendo copiado para cache_hora (Influencers).
--
-- Esta migration corrige os registros existentes ligando scout_influencer.user_id
-- aos influencer_perfil.id e copiando cache_negociado → cache_hora.
--
-- Execute no SQL Editor do Supabase
-- =============================================================================

-- 1. Verificar se a coluna cache_hora existe em influencer_perfil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'influencer_perfil' AND column_name = 'cache_hora'
  ) THEN
    ALTER TABLE influencer_perfil ADD COLUMN cache_hora NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;

-- 2. Atualizar influencer_perfil com cache do scout onde scout tem user_id e cache_negociado > 0
UPDATE influencer_perfil ip
SET cache_hora = COALESCE(s.cache_negociado, 0)
FROM scout_influencer s
WHERE s.user_id = ip.id
  AND s.cache_negociado IS NOT NULL
  AND s.cache_negociado > 0
  AND (ip.cache_hora IS NULL OR ip.cache_hora = 0);

-- 3. Verificar resultado (opcional)
-- SELECT ip.id, ip.nome_artistico, ip.cache_hora, s.cache_negociado
-- FROM influencer_perfil ip
-- JOIN scout_influencer s ON s.user_id = ip.id
-- WHERE s.cache_negociado > 0;
