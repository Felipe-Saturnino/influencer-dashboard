-- =============================================================================
-- MIGRAÇÃO: ciclos_pagamento - CHECK datas + DEFAULT criado_em
-- Execute no Supabase SQL Editor.
--
-- A) data_fim >= data_inicio (intervalo válido)
-- B) criado_em com DEFAULT now() para futuros INSERTs
-- =============================================================================

-- Default para criado_em
ALTER TABLE ciclos_pagamento
ALTER COLUMN criado_em SET DEFAULT now();

-- Remover constraint antiga se existir
ALTER TABLE ciclos_pagamento DROP CONSTRAINT IF EXISTS ciclos_pagamento_datas_validas;

-- Garantir que data_fim >= data_inicio
ALTER TABLE ciclos_pagamento
ADD CONSTRAINT ciclos_pagamento_datas_validas
CHECK (data_fim >= data_inicio);

-- =============================================================================
-- NOTA: Se falhar por registros existentes com data_fim < data_inicio, corrija antes:
-- SELECT id, data_inicio, data_fim FROM ciclos_pagamento WHERE data_fim < data_inicio;
-- UPDATE ciclos_pagamento SET data_fim = data_inicio WHERE data_fim < data_inicio;
-- =============================================================================
