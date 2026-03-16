-- =============================================================================
-- MIGRAÇÃO: Permitir que usuários autenticados (incl. Gestor) leiam dados
-- 
-- Problema: Gestor não via resultados porque RLS nas tabelas de dados
-- bloqueava leitura para usuários não-admin.
--
-- Esta migration adiciona políticas SELECT para authenticated em:
--   influencer_perfil, operadoras, influencer_operadoras, lives, live_resultados,
--   influencer_metricas
--
-- A segregação (quem vê o quê) continua feita no app via user_scopes e
-- podeVerInfluencer/podeVerOperadora.
--
-- Execute no SQL Editor do Supabase
-- =============================================================================

-- 1. PROFILES: usuário deve poder ler o próprio perfil (login, sessão)
--    (Admin continua podendo ler todos via migration-profiles-rls-admin-select)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Usuário pode ler próprio perfil'
  ) THEN
    CREATE POLICY "Usuário pode ler próprio perfil" ON profiles
      FOR SELECT
      USING (id = auth.uid());
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. INFLUENCER_PERFIL — leitura para autenticados
ALTER TABLE influencer_perfil ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read influencer_perfil" ON influencer_perfil;
CREATE POLICY "Allow authenticated read influencer_perfil" ON influencer_perfil
  FOR SELECT TO authenticated USING (true);

-- 3. OPERADORAS — leitura para autenticados
ALTER TABLE operadoras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read operadoras" ON operadoras;
CREATE POLICY "Allow authenticated read operadoras" ON operadoras
  FOR SELECT TO authenticated USING (true);

-- 4. INFLUENCER_OPERADORAS — leitura para autenticados
ALTER TABLE influencer_operadoras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read influencer_operadoras" ON influencer_operadoras;
CREATE POLICY "Allow authenticated read influencer_operadoras" ON influencer_operadoras
  FOR SELECT TO authenticated USING (true);

-- 5. LIVES — leitura e escrita para autenticados (Gestor cria/edita)
ALTER TABLE lives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read lives" ON lives;
DROP POLICY IF EXISTS "Allow authenticated write lives" ON lives;
CREATE POLICY "Allow authenticated read lives" ON lives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write lives" ON lives FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. LIVE_RESULTADOS — leitura e escrita para autenticados
ALTER TABLE live_resultados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read live_resultados" ON live_resultados;
DROP POLICY IF EXISTS "Allow authenticated write live_resultados" ON live_resultados;
CREATE POLICY "Allow authenticated read live_resultados" ON live_resultados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write live_resultados" ON live_resultados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. INFLUENCER_METRICAS — leitura para autenticados (escrita via integrações/service_role)
ALTER TABLE influencer_metricas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read influencer_metricas" ON influencer_metricas;
CREATE POLICY "Allow authenticated read influencer_metricas" ON influencer_metricas
  FOR SELECT TO authenticated USING (true);

-- 8. CICLOS_PAGAMENTO, PAGAMENTOS, PAGAMENTOS_AGENTES (usados em Financeiro)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ciclos_pagamento') THEN
    ALTER TABLE ciclos_pagamento ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated read ciclos_pagamento" ON ciclos_pagamento;
    CREATE POLICY "Allow authenticated read ciclos_pagamento" ON ciclos_pagamento
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pagamentos') THEN
    ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated read pagamentos" ON pagamentos;
    DROP POLICY IF EXISTS "Allow authenticated write pagamentos" ON pagamentos;
    CREATE POLICY "Allow authenticated read pagamentos" ON pagamentos FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Allow authenticated write pagamentos" ON pagamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pagamentos_agentes') THEN
    ALTER TABLE pagamentos_agentes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated read pagamentos_agentes" ON pagamentos_agentes;
    DROP POLICY IF EXISTS "Allow authenticated write pagamentos_agentes" ON pagamentos_agentes;
    CREATE POLICY "Allow authenticated read pagamentos_agentes" ON pagamentos_agentes FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Allow authenticated write pagamentos_agentes" ON pagamentos_agentes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Verificação (opcional): listar políticas criadas
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
