-- Renumerar centro_custos para padrão só dígitos (3 + 3 + 3), por created_at.
-- Idempotente; substitui formatos anteriores (RH.D…, D.xxx hex, etc.).

BEGIN;

UPDATE public.rh_org_diretorias d
SET centro_custos = x.c
FROM (
  SELECT id, lpad((row_number() OVER (ORDER BY created_at ASC, id ASC))::text, 3, '0') AS c
  FROM public.rh_org_diretorias
) x
WHERE x.id = d.id;

UPDATE public.rh_org_gerencias g
SET centro_custos = x.c
FROM (
  SELECT g2.id,
    (d.centro_custos || lpad((row_number() OVER (PARTITION BY g2.diretoria_id ORDER BY g2.created_at ASC, g2.id ASC))::text, 3, '0')) AS c
  FROM public.rh_org_gerencias g2
  INNER JOIN public.rh_org_diretorias d ON d.id = g2.diretoria_id
) x
WHERE x.id = g.id;

UPDATE public.rh_org_times t
SET centro_custos = x.c
FROM (
  SELECT t2.id,
    (gr.centro_custos || lpad((row_number() OVER (PARTITION BY t2.gerencia_id ORDER BY t2.created_at ASC, t2.id ASC))::text, 3, '0')) AS c
  FROM public.rh_org_times t2
  INNER JOIN public.rh_org_gerencias gr ON gr.id = t2.gerencia_id
) x
WHERE x.id = t.id;

COMMENT ON COLUMN public.rh_org_diretorias.centro_custos IS 'Centro de custos numérico 3 dígitos (ordem de criação), ex.: 001.';
COMMENT ON COLUMN public.rh_org_gerencias.centro_custos IS 'Numérico: código da diretoria (3) + ordem na diretoria (3), ex.: 001002.';
COMMENT ON COLUMN public.rh_org_times.centro_custos IS 'Numérico: código da gerência (6) + ordem na gerência (3), ex.: 001002003.';

COMMIT;
