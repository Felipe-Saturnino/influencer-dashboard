-- =============================================================================
-- FIX: Permissão para aprovar/pagar na página Financeiro
-- 
-- Se o botão "Aprovar valor" fecha o modal mas não altera o status,
-- provavelmente as políticas RLS não permitem UPDATE em pagamentos.
--
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor → New query)
-- =============================================================================

-- 1. Pagamentos: garantir que authenticated pode UPDATE
DROP POLICY IF EXISTS "Allow authenticated read pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Allow authenticated write pagamentos" ON pagamentos;

CREATE POLICY "Allow authenticated read pagamentos" 
  ON pagamentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write pagamentos" 
  ON pagamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Pagamentos_agentes: mesmo para pagamentos de agentes
DROP POLICY IF EXISTS "Allow authenticated read pagamentos_agentes" ON pagamentos_agentes;
DROP POLICY IF EXISTS "Allow authenticated write pagamentos_agentes" ON pagamentos_agentes;

CREATE POLICY "Allow authenticated read pagamentos_agentes" 
  ON pagamentos_agentes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write pagamentos_agentes" 
  ON pagamentos_agentes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verificar políticas aplicadas:
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('pagamentos', 'pagamentos_agentes');
