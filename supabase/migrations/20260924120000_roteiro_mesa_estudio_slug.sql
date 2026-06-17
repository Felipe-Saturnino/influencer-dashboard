-- Roteiro de Mesa: vínculo por estúdio; operadora_slug mantido para solicitações legadas.

BEGIN;

ALTER TABLE public.roteiro_mesa_sugestoes
  ADD COLUMN IF NOT EXISTS estudio_slug text;

ALTER TABLE public.roteiro_mesa_sugestoes
  DROP CONSTRAINT IF EXISTS roteiro_mesa_sugestoes_estudio_slug_fkey;

ALTER TABLE public.roteiro_mesa_sugestoes
  ADD CONSTRAINT roteiro_mesa_sugestoes_estudio_slug_fkey
  FOREIGN KEY (estudio_slug)
  REFERENCES public.estudios_spin (slug)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_roteiro_mesa_sugestoes_estudio
  ON public.roteiro_mesa_sugestoes (estudio_slug);

ALTER TABLE public.roteiro_mesa_campanhas
  ADD COLUMN IF NOT EXISTS estudio_slug text;

ALTER TABLE public.roteiro_mesa_campanhas
  DROP CONSTRAINT IF EXISTS roteiro_mesa_campanhas_estudio_slug_fkey;

ALTER TABLE public.roteiro_mesa_campanhas
  ADD CONSTRAINT roteiro_mesa_campanhas_estudio_slug_fkey
  FOREIGN KEY (estudio_slug)
  REFERENCES public.estudios_spin (slug)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_roteiro_mesa_campanhas_estudio
  ON public.roteiro_mesa_campanhas (estudio_slug);

COMMENT ON COLUMN public.roteiro_mesa_sugestoes.estudio_slug IS
  'Estúdio Spin do roteiro. operadora_slug permanece para solicitações e legado.';
COMMENT ON COLUMN public.roteiro_mesa_campanhas.estudio_slug IS
  'Estúdio Spin da campanha. operadora_slug permanece para solicitações e legado.';

-- Backfill sugestões
UPDATE public.roteiro_mesa_sugestoes s
SET estudio_slug = sub.estudio_slug
FROM (
  SELECT DISTINCT ON (s2.id)
    s2.id,
    e.slug AS estudio_slug
  FROM public.roteiro_mesa_sugestoes s2
  JOIN public.estudios_spin_operadoras j ON j.operadora_slug = s2.operadora_slug
  JOIN public.estudios_spin e ON e.slug = j.estudio_slug AND e.ativo = true
  WHERE s2.estudio_slug IS NULL
  ORDER BY s2.id, CASE WHEN e.tipo = 'dedicado' THEN 0 ELSE 1 END, e.nome
) sub
WHERE s.id = sub.id;

-- Backfill campanhas
UPDATE public.roteiro_mesa_campanhas c
SET estudio_slug = sub.estudio_slug
FROM (
  SELECT DISTINCT ON (c2.id)
    c2.id,
    e.slug AS estudio_slug
  FROM public.roteiro_mesa_campanhas c2
  JOIN public.estudios_spin_operadoras j ON j.operadora_slug = c2.operadora_slug
  JOIN public.estudios_spin e ON e.slug = j.estudio_slug AND e.ativo = true
  WHERE c2.estudio_slug IS NULL
  ORDER BY c2.id, CASE WHEN e.tipo = 'dedicado' THEN 0 ELSE 1 END, e.nome
) sub
WHERE c.id = sub.id;

-- Operador: escopo por estúdio (via junction) ou operadora legada
DROP POLICY IF EXISTS "Operador_executivo leem e escrevem roteiro das suas operadoras" ON public.roteiro_mesa_sugestoes;
CREATE POLICY "Operador_executivo leem e escrevem roteiro das suas operadoras"
  ON public.roteiro_mesa_sugestoes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes us
      WHERE us.user_id = auth.uid()
        AND us.scope_type = 'operadora'
        AND (
          us.scope_ref = roteiro_mesa_sugestoes.operadora_slug
          OR EXISTS (
            SELECT 1
            FROM public.estudios_spin_operadoras eo
            WHERE eo.estudio_slug = roteiro_mesa_sugestoes.estudio_slug
              AND eo.operadora_slug = us.scope_ref
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes us
      WHERE us.user_id = auth.uid()
        AND us.scope_type = 'operadora'
        AND (
          us.scope_ref = roteiro_mesa_sugestoes.operadora_slug
          OR EXISTS (
            SELECT 1
            FROM public.estudios_spin_operadoras eo
            WHERE eo.estudio_slug = roteiro_mesa_sugestoes.estudio_slug
              AND eo.operadora_slug = us.scope_ref
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  );

DROP POLICY IF EXISTS "Operador_executivo leem e escrevem campanhas das suas operadoras" ON public.roteiro_mesa_campanhas;
CREATE POLICY "Operador_executivo leem e escrevem campanhas das suas operadoras"
  ON public.roteiro_mesa_campanhas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes us
      WHERE us.user_id = auth.uid()
        AND us.scope_type = 'operadora'
        AND (
          us.scope_ref = roteiro_mesa_campanhas.operadora_slug
          OR EXISTS (
            SELECT 1
            FROM public.estudios_spin_operadoras eo
            WHERE eo.estudio_slug = roteiro_mesa_campanhas.estudio_slug
              AND eo.operadora_slug = us.scope_ref
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes us
      WHERE us.user_id = auth.uid()
        AND us.scope_type = 'operadora'
        AND (
          us.scope_ref = roteiro_mesa_campanhas.operadora_slug
          OR EXISTS (
            SELECT 1
            FROM public.estudios_spin_operadoras eo
            WHERE eo.estudio_slug = roteiro_mesa_campanhas.estudio_slug
              AND eo.operadora_slug = us.scope_ref
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  );

COMMIT;
