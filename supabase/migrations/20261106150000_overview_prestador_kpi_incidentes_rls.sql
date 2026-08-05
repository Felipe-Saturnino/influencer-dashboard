-- Overview Prestador → KPIs de Mesa: leitura de incidentes e gp_kpi_diario
-- sem exigir permissão na página Incidentes.
-- Shuffler depende 100% de estudio_incidentes; sem isto a aba fica vazia.

CREATE OR REPLACE FUNCTION public._estudio_incidentes_perm(p_need text)
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
      OR public._gestor_page_perm('incidentes', p_need)
      OR public._prestador_page_perm('incidentes', p_need)
      OR public._staff_spin_page_perm('incidentes', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'incidentes'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
      -- Leitura agregada no Overview Prestador (KPIs de Mesa — GP e Shuffler)
      OR (
        p_need = 'view'
        AND (
          public._gestor_page_perm('dash_overview_prestador', 'view')
          OR public._prestador_page_perm('dash_overview_prestador', 'view')
          OR public._staff_spin_page_perm('dash_overview_prestador', 'view')
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
            WHERE p.id = auth.uid()
              AND p.role IS DISTINCT FROM 'gestor'
              AND p.role IS DISTINCT FROM 'prestador'
              AND rp.page_key = 'dash_overview_prestador'
              AND rp.can_view IN ('sim', 'proprios')
          )
        )
      )
    );
$$;

COMMENT ON FUNCTION public._estudio_incidentes_perm(text) IS
  'Permissão Incidentes; view também liberada com Ver em Overview Prestador (KPIs de Mesa).';

DROP POLICY IF EXISTS gp_kpi_diario_select ON public.gp_kpi_diario;
CREATE POLICY gp_kpi_diario_select
  ON public.gp_kpi_diario FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor')
    )
    OR (
      estudio_slug IS NOT NULL
      AND public._estudios_spin_scope_estudio(estudio_slug)
    )
    OR public._gestor_page_perm('dash_overview_prestador', 'view')
    OR public._prestador_page_perm('dash_overview_prestador', 'view')
    OR public._staff_spin_page_perm('dash_overview_prestador', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'gestor'
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'dash_overview_prestador'
        AND rp.can_view IN ('sim', 'proprios')
    )
  );

COMMENT ON POLICY gp_kpi_diario_select ON public.gp_kpi_diario IS
  'Leitura para admin/gestor, escopo de estúdio ou Ver em Overview Prestador.';
