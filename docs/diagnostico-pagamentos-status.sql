-- =============================================================================
-- DIAGNÓSTICO e FIX: Status de pagamentos não persiste
-- Execute no Supabase SQL Editor
-- =============================================================================

-- PASSO 1: Verificar TRIGGERS na tabela pagamentos
-- Um trigger BEFORE UPDATE pode estar revertendo status para em_analise
SELECT 
  t.tgname AS trigger_name,
  CASE t.tgtype::integer & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
  CASE t.tgtype::integer & 4 WHEN 4 THEN 'INSERT' 
       WHEN 8 THEN 'DELETE' WHEN 16 THEN 'UPDATE' END AS event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'pagamentos' 
  AND n.nspname = 'public'
  AND NOT t.tgisinternal;

-- PASSO 2: Se encontrar trigger em pagamentos, REMOVER (pode estar causando o problema)
-- Descomente a linha abaixo se o PASSO 1 mostrou algum trigger:
-- DROP TRIGGER IF EXISTS nome_do_trigger ON pagamentos;

-- PASSO 3: Testar UPDATE manual (troque o ID por um da sua tabela)
-- Execute e depois confira no Table Editor se o status mudou:
UPDATE pagamentos 
SET status = 'a_pagar', total = 1800 
WHERE id = (SELECT id FROM pagamentos LIMIT 1);

SELECT id, status, total FROM pagamentos LIMIT 5;

-- PASSO 4: Se o UPDATE acima funcionou, o problema era trigger ou RPC.
-- Recrie a RPC para garantir que está correta (execute fix-financeiro-rpc-aprovar.sql)
