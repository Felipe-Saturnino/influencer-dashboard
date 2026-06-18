-- Gestão de Dealers: vínculo por estúdio; operadora_slug mantido para solicitações legadas.

BEGIN;

ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS estudio_slug text;

ALTER TABLE public.dealers
  DROP CONSTRAINT IF EXISTS dealers_estudio_slug_fkey;

ALTER TABLE public.dealers
  ADD CONSTRAINT dealers_estudio_slug_fkey
  FOREIGN KEY (estudio_slug)
  REFERENCES public.estudios_spin (slug)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dealers_estudio_slug
  ON public.dealers (estudio_slug)
  WHERE estudio_slug IS NOT NULL;

COMMENT ON COLUMN public.dealers.estudio_slug IS
  'Estúdio Spin do dealer (Gestão de Dealers). operadora_slug permanece para dealer_solicitacoes e legado.';

-- Backfill: operadora → estúdio vinculado (preferência dedicado).
UPDATE public.dealers d
SET estudio_slug = sub.estudio_slug
FROM (
  SELECT DISTINCT ON (d2.id)
    d2.id,
    e.slug AS estudio_slug
  FROM public.dealers d2
  JOIN public.estudios_spin_operadoras j ON j.operadora_slug = d2.operadora_slug
  JOIN public.estudios_spin e ON e.slug = j.estudio_slug AND e.ativo = true
  WHERE d2.operadora_slug IS NOT NULL
    AND btrim(d2.operadora_slug) <> ''
    AND d2.estudio_slug IS NULL
  ORDER BY d2.id, CASE WHEN e.tipo = 'dedicado' THEN 0 ELSE 1 END, e.nome
) sub
WHERE d.id = sub.id;

-- Backfill via prestador RH quando existir staff_estudio_slug.
UPDATE public.dealers d
SET estudio_slug = f.staff_estudio_slug
FROM public.rh_funcionarios f
WHERE d.rh_funcionario_id = f.id
  AND f.staff_estudio_slug IS NOT NULL
  AND btrim(f.staff_estudio_slug) <> ''
  AND (d.estudio_slug IS NULL OR btrim(d.estudio_slug) = '');

COMMIT;
