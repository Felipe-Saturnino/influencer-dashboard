-- =============================================================================
-- MIGRAÇÃO: Permitir INSERT em ciclos_pagamento (criação automática no frontend)
--
-- Após limpeza da base, o financeiro pode criar ciclos automaticamente a partir
-- das lives realizadas. Esta policy permite que usuários autenticados insiram
-- novos ciclos.
--
-- Execute no Supabase SQL Editor.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ciclos_pagamento') THEN
    DROP POLICY IF EXISTS "Allow authenticated insert ciclos_pagamento" ON ciclos_pagamento;
    CREATE POLICY "Allow authenticated insert ciclos_pagamento" ON ciclos_pagamento
      FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow authenticated update ciclos_pagamento" ON ciclos_pagamento;
    CREATE POLICY "Allow authenticated update ciclos_pagamento" ON ciclos_pagamento
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
