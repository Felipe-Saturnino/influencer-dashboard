-- RH Organograma: código hierárquico de centro de custos (Diretoria > Gerência > Time).

BEGIN;

ALTER TABLE public.rh_org_diretorias ADD COLUMN IF NOT EXISTS centro_custos text;
ALTER TABLE public.rh_org_gerencias ADD COLUMN IF NOT EXISTS centro_custos text;
ALTER TABLE public.rh_org_times ADD COLUMN IF NOT EXISTS centro_custos text;

UPDATE public.rh_org_diretorias d
SET centro_custos = 'RH.D.' || upper(substring(replace(d.id::text, '-', ''), 1, 8))
WHERE centro_custos IS NULL OR btrim(centro_custos) = '';

UPDATE public.rh_org_gerencias g
SET centro_custos = d.centro_custos || '.G.' || upper(substring(replace(g.id::text, '-', ''), 1, 6))
FROM public.rh_org_diretorias d
WHERE g.diretoria_id = d.id
  AND (g.centro_custos IS NULL OR btrim(g.centro_custos) = '');

UPDATE public.rh_org_times t
SET centro_custos = gr.centro_custos || '.T.' || upper(substring(replace(t.id::text, '-', ''), 1, 6))
FROM public.rh_org_gerencias gr
WHERE t.gerencia_id = gr.id
  AND (t.centro_custos IS NULL OR btrim(t.centro_custos) = '');

ALTER TABLE public.rh_org_diretorias ALTER COLUMN centro_custos SET NOT NULL;
ALTER TABLE public.rh_org_gerencias ALTER COLUMN centro_custos SET NOT NULL;
ALTER TABLE public.rh_org_times ALTER COLUMN centro_custos SET NOT NULL;

COMMENT ON COLUMN public.rh_org_diretorias.centro_custos IS 'Código fixo de centro de custos (prefixo RH.D + sufixo do id).';
COMMENT ON COLUMN public.rh_org_gerencias.centro_custos IS 'Centro de custos hierárquico: código da diretoria + .G. + sufixo.';
COMMENT ON COLUMN public.rh_org_times.centro_custos IS 'Centro de custos hierárquico: código da gerência + .T. + sufixo.';

COMMIT;
