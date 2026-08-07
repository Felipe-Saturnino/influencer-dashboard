-- Overview Prestador → KPIs de OCR (Service Manager):
-- leitura de sm_sinais com Ver em dash_overview_prestador
-- (sem exigir escopo de estúdio nem perfil admin/gestor).

DROP POLICY IF EXISTS sm_sinais_select ON public.sm_sinais;
CREATE POLICY sm_sinais_select
  ON public.sm_sinais FOR SELECT TO authenticated
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

COMMENT ON POLICY sm_sinais_select ON public.sm_sinais IS
  'Leitura para admin/gestor, escopo de estúdio ou Ver em Overview Prestador (KPIs de OCR).';
