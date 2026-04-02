-- =============================================================================
-- TESTE: Atualizar status de UM pagamento e conferir imediatamente
-- Execute cada bloco no Supabase SQL Editor (um de cada vez)
-- =============================================================================

-- 1. Pegar um ID para testar
SELECT id, status, total FROM pagamentos LIMIT 1;

-- 2. COPIAR o id da linha acima e colar na query abaixo (substitua MEU_ID_AQUI)
-- Depois execute o UPDATE e o SELECT juntos:

/*
DO $$
DECLARE
  v_id uuid := '6ab58eb6-c129-4705-aaf7-7689c58f3610';  -- troque pelo id do passo 1
BEGIN
  UPDATE pagamentos SET status = 'a_pagar', total = 1000 WHERE id = v_id;
  RAISE NOTICE 'Rows updated: %', (SELECT COUNT(*) FROM pagamentos WHERE id = v_id AND status = 'a_pagar');
END $$;
*/

-- 3. FORMA MAIS SIMPLES - execute estas 2 linhas (troque o ID pelo real):
UPDATE pagamentos SET status = 'a_pagar', total = 1000 
WHERE id = '6ab58eb6-c129-4705-aaf7-7689c58f3610';

-- 4. Conferir NA MESMA SESSÃO - este SELECT deve mostrar a_pagar:
SELECT id, status, total FROM pagamentos WHERE id = '6ab58eb6-c129-4705-aaf7-7689c58f3610';

-- 5. Se o passo 4 mostrou a_pagar: o UPDATE funciona. O problema pode ser trigger 
--    que reverte em outra sessão, ou a RPC está conectando a outro banco.
--    Se o passo 4 ainda mostra em_analise: há trigger BEFORE UPDATE revertendo.
