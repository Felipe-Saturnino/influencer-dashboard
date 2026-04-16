-- ciclos_pagamento: INSERT/UPDATE para authenticated (criação automática de ciclos no Financeiro)
-- Corrige: new row violates row-level security policy for table "ciclos_pagamento"

ALTER TABLE public.ciclos_pagamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read ciclos_pagamento" ON public.ciclos_pagamento;
CREATE POLICY "Allow authenticated read ciclos_pagamento"
  ON public.ciclos_pagamento FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert ciclos_pagamento" ON public.ciclos_pagamento;
CREATE POLICY "Allow authenticated insert ciclos_pagamento"
  ON public.ciclos_pagamento FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update ciclos_pagamento" ON public.ciclos_pagamento;
CREATE POLICY "Allow authenticated update ciclos_pagamento"
  ON public.ciclos_pagamento FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
