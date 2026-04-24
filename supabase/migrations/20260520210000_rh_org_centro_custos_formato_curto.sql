-- Reaplica centro de custos no formato curto (D.{6hex}, +.G{4hex}, +.T{4hex}).
-- Idempotente: útil para bases que já rodaram 20260519120000 com o padrão longo (RH.D…).

BEGIN;

UPDATE public.rh_org_diretorias d
SET centro_custos = 'D.' || upper(substring(replace(d.id::text, '-', ''), 1, 6));

UPDATE public.rh_org_gerencias g
SET centro_custos = d.centro_custos || '.G' || upper(substring(replace(g.id::text, '-', ''), 1, 4))
FROM public.rh_org_diretorias d
WHERE g.diretoria_id = d.id;

UPDATE public.rh_org_times t
SET centro_custos = gr.centro_custos || '.T' || upper(substring(replace(t.id::text, '-', ''), 1, 4))
FROM public.rh_org_gerencias gr
WHERE t.gerencia_id = gr.id;

COMMENT ON COLUMN public.rh_org_diretorias.centro_custos IS 'Centro de custos curto: D. + 6 hex do id (ex.: D.A3F2B1).';
COMMENT ON COLUMN public.rh_org_gerencias.centro_custos IS 'Hierárquico: código da diretoria + .G + 4 hex do id da gerência.';
COMMENT ON COLUMN public.rh_org_times.centro_custos IS 'Hierárquico: código da gerência + .T + 4 hex do id do time.';

COMMIT;
