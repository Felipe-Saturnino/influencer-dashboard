-- Dashboards — Headcount (dash_headcount): permissões iniciais + leitura RLS.

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'dash_headcount', 'nao', NULL, NULL, NULL
FROM (
  SELECT unnest(ARRAY[
    'gestor_aquisicao', 'gestor_marketing', 'gestor_operacoes', 'gestor_tech_ops', 'gestor_academy', 'gestor_rh',
    'operador', 'agencia', 'influencer', 'afiliado', 'investidor', 'executivo',
    'prestador', 'rh', 'figurino', 'comunicacao', 'performance_coach', 'service_manager', 'shift_leader',
    'customer_service', 'game_presenter', 'shuffler', 'tech_ops'
  ]::text[]) AS role
) r
ON CONFLICT (role, page_key) DO NOTHING;

-- gestor_tipo_pages foi removida em 20260710200000 — gestores de departamento usam só role_permissions.

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT DISTINCT pt.prestador_tipo_slug, 'dash_headcount'
FROM public.prestador_tipo_pages pt
WHERE pt.page_key = 'rh_funcionarios'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public._dash_headcount_perm(p_need text)
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
      OR public._gestor_page_perm('dash_headcount', p_need)
      OR public._prestador_page_perm('dash_headcount', p_need)
      OR public._staff_spin_page_perm('dash_headcount', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'dash_headcount'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._dash_headcount_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._dash_headcount_perm(text) TO authenticated;

DROP POLICY IF EXISTS rh_funcionarios_select_dash_headcount ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_select_dash_headcount
  ON public.rh_funcionarios FOR SELECT TO authenticated
  USING (public._dash_headcount_perm('view'));

DROP POLICY IF EXISTS rh_funcionario_historico_select_dash_headcount ON public.rh_funcionario_historico;
CREATE POLICY rh_funcionario_historico_select_dash_headcount
  ON public.rh_funcionario_historico FOR SELECT TO authenticated
  USING (public._dash_headcount_perm('view'));

DROP POLICY IF EXISTS rh_org_diretorias_select_dash_headcount ON public.rh_org_diretorias;
CREATE POLICY rh_org_diretorias_select_dash_headcount
  ON public.rh_org_diretorias FOR SELECT TO authenticated
  USING (public._dash_headcount_perm('view'));

DROP POLICY IF EXISTS rh_org_gerencias_select_dash_headcount ON public.rh_org_gerencias;
CREATE POLICY rh_org_gerencias_select_dash_headcount
  ON public.rh_org_gerencias FOR SELECT TO authenticated
  USING (public._dash_headcount_perm('view'));

DROP POLICY IF EXISTS rh_org_times_select_dash_headcount ON public.rh_org_times;
CREATE POLICY rh_org_times_select_dash_headcount
  ON public.rh_org_times FOR SELECT TO authenticated
  USING (public._dash_headcount_perm('view'));

DROP POLICY IF EXISTS rh_vagas_select_dash_headcount ON public.rh_vagas;
CREATE POLICY rh_vagas_select_dash_headcount
  ON public.rh_vagas FOR SELECT TO authenticated
  USING (public._dash_headcount_perm('view'));

COMMIT;
