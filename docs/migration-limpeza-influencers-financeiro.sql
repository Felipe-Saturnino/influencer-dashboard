-- =============================================================================
-- MIGRAÇÃO: Limpeza completa — Influencers e Financeiro
--
-- Remove todos os influencers (e usuários Auth) + dados de lives, métricas,
-- pagamentos e ciclos. Permite recriar tudo corretamente pela plataforma.
--
-- ATENÇÃO: Esta operação é IRREVERSÍVEL. Faça backup se necessário.
-- Execute no SQL Editor do Supabase.
-- =============================================================================

BEGIN;

-- 1. Guardar IDs dos influencers (profiles com role='influencer')
CREATE TEMP TABLE _ids_influencers AS
  SELECT id FROM profiles WHERE role = 'influencer';

-- 2. FINANCEIRO: resultados de lives (antes de deletar lives)
DELETE FROM live_resultados
  WHERE live_id IN (SELECT id FROM lives WHERE influencer_id IN (SELECT id FROM _ids_influencers));

-- 3. LIVES
DELETE FROM lives WHERE influencer_id IN (SELECT id FROM _ids_influencers);

-- 4. PAGAMENTOS (influencers)
DELETE FROM pagamentos WHERE influencer_id IN (SELECT id FROM _ids_influencers);

-- 5. PAGAMENTOS AGENTES (limpeza total do financeiro)
DELETE FROM pagamentos_agentes;

-- 6. CICLOS DE PAGAMENTO (limpa tudo para recomeçar)
DELETE FROM ciclos_pagamento;

-- 7. MÉTRICAS (influencer_metricas)
DELETE FROM influencer_metricas WHERE influencer_id IN (SELECT id FROM _ids_influencers);

-- 8. UTM_ALIASES (se existir e tiver influencer_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'utm_aliases' AND column_name = 'influencer_id'
  ) THEN
    DELETE FROM utm_aliases WHERE influencer_id IN (SELECT id FROM _ids_influencers);
  END IF;
END $$;

-- 9. INFLUENCER_OPERADORAS
DELETE FROM influencer_operadoras WHERE influencer_id IN (SELECT id FROM _ids_influencers);

-- 10. USER_SCOPES (escopos dos influencers)
DELETE FROM user_scopes WHERE user_id IN (SELECT id FROM _ids_influencers);

-- 11. INFLUENCER_PERFIL
DELETE FROM influencer_perfil WHERE id IN (SELECT id FROM _ids_influencers);

-- 12. PROFILES (usuários influencer)
DELETE FROM profiles WHERE id IN (SELECT id FROM _ids_influencers);

COMMIT;

-- 13. AUTH.USERS (usa IDs salvos em _ids_influencers antes de apagar profiles)
-- Se der "permission denied", apague manualmente em: Authentication > Users
DO $$
DECLARE
  _count int;
BEGIN
  DELETE FROM auth.users
  WHERE id IN (SELECT id FROM _ids_influencers);
  GET DIAGNOSTICS _count = ROW_COUNT;
  RAISE NOTICE 'Removidos % usuários de auth.users', _count;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auth.users: % — Apague influencers manualmente em Authentication > Users', SQLERRM;
END $$;

-- Verificação: deve retornar 0
-- SELECT COUNT(*) FROM profiles WHERE role = 'influencer';
-- SELECT COUNT(*) FROM lives;
-- SELECT COUNT(*) FROM pagamentos;
-- SELECT COUNT(*) FROM ciclos_pagamento;
