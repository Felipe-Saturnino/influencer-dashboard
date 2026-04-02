-- =============================================================================
-- MIGRAÇÃO: Remover ciclos de pagamento anteriores a 19/12 (início das lives)
--
-- As lives iniciaram em 19/12; ciclos antes disso poluem a tela.
-- Execute no Supabase SQL Editor se quiser limpar o banco.
-- =============================================================================

-- Remove pagamentos que referenciam ciclos antigos (FK)
DELETE FROM pagamentos
WHERE ciclo_id IN (
  SELECT id FROM ciclos_pagamento WHERE data_inicio < '2025-12-18'
);

DELETE FROM pagamentos_agentes
WHERE ciclo_id IN (
  SELECT id FROM ciclos_pagamento WHERE data_inicio < '2025-12-18'
);

-- Remove os ciclos
DELETE FROM ciclos_pagamento WHERE data_inicio < '2025-12-18';
