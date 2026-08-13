-- Performance Hub — leitura dos prestadores GP/Shuffler
--
-- Quem só tem Ver em academy_performance_hub não via times (RPC exigia rh_staff /
-- Overview Prestador / Marketplace) nem linhas de rh_funcionarios / rh_org_times.
-- Espelha o precedente de mesas/estúdios (20261017120000) e Incidentes.

BEGIN;

CREATE OR REPLACE FUNCTION public.rh_staff_times_filtrados()
RETURNS TABLE (
  id uuid,
  nome text,
  gerencia_id uuid,
  gerencia_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.nome, t.gerencia_id, g.nome AS gerencia_nome
  FROM public.rh_org_times t
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  WHERE t.status = 'ativo'
    AND (
      (lower(btrim(g.nome)) LIKE '%game floor%')
      OR (
        lower(btrim(g.nome)) LIKE '%operation%'
        AND lower(btrim(g.nome)) LIKE '%management%'
      )
    )
    AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'contador de cartas'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.profiles pr
        INNER JOIN public.role_permissions rp ON rp.role::text = pr.role::text
        WHERE pr.id = auth.uid()
          AND rp.page_key IN (
            'rh_staff',
            'escala_marketplace_turnos',
            'escala_solicitacoes',
            'dash_overview_prestador',
            'academy_performance_hub'
          )
          AND rp.can_view IN ('sim', 'proprios')
      )
      OR public._gestor_page_perm('academy_performance_hub', 'view')
      OR public._prestador_page_perm('academy_performance_hub', 'view')
      OR public._staff_spin_page_perm('academy_performance_hub', 'view')
    )
  ORDER BY g.nome, t.nome;
$$;

COMMENT ON FUNCTION public.rh_staff_times_filtrados() IS
  'Times ativos de Game Floor / Operation Management (exceto Contador de Cartas). Requer Ver em rh_staff, Marketplace, Solicitações, Overview Prestador ou Performance Hub.';

DROP POLICY IF EXISTS rh_funcionarios_select_academy_performance_hub ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_select_academy_performance_hub
  ON public.rh_funcionarios FOR SELECT TO authenticated
  USING (public._academy_performance_hub_perm('view'));

DROP POLICY IF EXISTS rh_org_times_select_academy_performance_hub ON public.rh_org_times;
CREATE POLICY rh_org_times_select_academy_performance_hub
  ON public.rh_org_times FOR SELECT TO authenticated
  USING (public._academy_performance_hub_perm('view'));

COMMIT;
