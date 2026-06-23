-- Comercial — Overview Comercial (leitura das mesmas tabelas do Pipeline B2B).

BEGIN;

CREATE OR REPLACE FUNCTION public._comercial_overview_perm(p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR public._gestor_page_perm('comercial_overview', p_need)
      OR public._prestador_page_perm('comercial_overview', p_need)
      OR public._staff_spin_page_perm('comercial_overview', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'comercial_overview'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._comercial_overview_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._comercial_overview_perm(text) TO authenticated;

-- SELECT: Pipeline B2B ou Overview Comercial
DROP POLICY IF EXISTS comercial_empresas_select ON public.comercial_empresas;
CREATE POLICY comercial_empresas_select ON public.comercial_empresas FOR SELECT TO authenticated
  USING (
    public._comercial_pipeline_b2b_perm('view')
    OR public._comercial_overview_perm('view')
  );

DROP POLICY IF EXISTS comercial_marcas_select ON public.comercial_marcas;
CREATE POLICY comercial_marcas_select ON public.comercial_marcas FOR SELECT TO authenticated
  USING (
    public._comercial_pipeline_b2b_perm('view')
    OR public._comercial_overview_perm('view')
  );

DROP POLICY IF EXISTS comercial_contatos_select ON public.comercial_marca_contatos;
CREATE POLICY comercial_contatos_select ON public.comercial_marca_contatos FOR SELECT TO authenticated
  USING (
    public._comercial_pipeline_b2b_perm('view')
    OR public._comercial_overview_perm('view')
  );

DROP POLICY IF EXISTS comercial_produtos_select ON public.comercial_marca_produtos;
CREATE POLICY comercial_produtos_select ON public.comercial_marca_produtos FOR SELECT TO authenticated
  USING (
    public._comercial_pipeline_b2b_perm('view')
    OR public._comercial_overview_perm('view')
  );

DROP POLICY IF EXISTS comercial_anot_select ON public.comercial_marca_anotacoes;
CREATE POLICY comercial_anot_select ON public.comercial_marca_anotacoes FOR SELECT TO authenticated
  USING (
    public._comercial_pipeline_b2b_perm('view')
    OR public._comercial_overview_perm('view')
  );

DROP POLICY IF EXISTS comercial_hist_select ON public.comercial_marca_historico;
CREATE POLICY comercial_hist_select ON public.comercial_marca_historico FOR SELECT TO authenticated
  USING (
    public._comercial_pipeline_b2b_perm('view')
    OR public._comercial_overview_perm('view')
  );

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'comercial_overview', 'nao', NULL, NULL, NULL
FROM (SELECT unnest(ARRAY['gestor', 'operador', 'agencia', 'influencer', 'afiliado', 'investidor', 'executivo', 'prestador']::text[]) AS role) r
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT DISTINCT gt.gestor_tipo_slug, 'comercial_overview'
FROM public.gestor_tipo_pages gt
WHERE gt.page_key = 'comercial_pipeline_b2b'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT DISTINCT op.operadora_slug, 'comercial_overview'
FROM public.operadora_pages op
WHERE op.page_key = 'comercial_pipeline_b2b'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

COMMIT;
