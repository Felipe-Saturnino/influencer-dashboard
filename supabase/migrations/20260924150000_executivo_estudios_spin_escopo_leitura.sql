-- Executivo (sem user_scopes operadora): leitura global de estudios_spin alinhada ao app
-- (ROLES_SEM_RESTRICAO_ESCOPO) e à paridade Investidor / Mesas Spin.
-- Corrige Gestão de Dealers (e demais páginas operacionais) sem filtro «Todos Estúdios».

BEGIN;

CREATE OR REPLACE FUNCTION public._investidor_role_permissions_can_view(p_page_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND p.role = 'investidor'
      AND rp.page_key = p_page_key
      AND rp.can_view IN ('sim', 'proprios')
  );
$$;

REVOKE ALL ON FUNCTION public._investidor_role_permissions_can_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._investidor_role_permissions_can_view(text) TO authenticated;

COMMENT ON FUNCTION public._investidor_role_permissions_can_view(text) IS
  'Investidor: Ver efetivo conforme Gestão de Usuários (role_permissions), sem user_scopes operadora.';

CREATE OR REPLACE FUNCTION public._estudios_spin_leitura_perm(p_need text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public._mesas_spin_cadastro_perm(p_need)
      OR public._rh_staff_perm(p_need)
      OR public._gestor_page_perm('rh_gestao_escala', p_need)
      OR public._prestador_page_perm('rh_gestao_escala', p_need)
      OR public._staff_spin_page_perm('rh_gestao_escala', p_need)
      OR public._executivo_role_permissions_can_view('rh_gestao_escala')
      OR public._investidor_role_permissions_can_view('rh_gestao_escala')
      OR public._gestor_page_perm('gestao_dealers', p_need)
      OR public._prestador_page_perm('gestao_dealers', p_need)
      OR public._staff_spin_page_perm('gestao_dealers', p_need)
      OR public._executivo_role_permissions_can_view('gestao_dealers')
      OR public._investidor_role_permissions_can_view('gestao_dealers')
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
      OR public._staff_spin_page_perm('rh_figurinos', p_need)
      OR public._executivo_role_permissions_can_view('rh_figurinos')
      OR public._investidor_role_permissions_can_view('rh_figurinos')
      OR public._gestor_page_perm('roteiro_mesa', p_need)
      OR public._prestador_page_perm('roteiro_mesa', p_need)
      OR public._staff_spin_page_perm('roteiro_mesa', p_need)
      OR public._executivo_role_permissions_can_view('roteiro_mesa')
      OR public._investidor_role_permissions_can_view('roteiro_mesa')
      OR public._gestor_page_perm('central_notificacoes', p_need)
      OR public._prestador_page_perm('central_notificacoes', p_need)
      OR public._staff_spin_page_perm('central_notificacoes', p_need)
      OR public._executivo_role_permissions_can_view('central_notificacoes')
      OR public._investidor_role_permissions_can_view('central_notificacoes')
    );
$$;

CREATE OR REPLACE FUNCTION public._estudios_spin_scope_estudio(p_estudio_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor'))
      OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND pr.role IN (
            'shift_leader',
            'service_manager',
            'figurino',
            'rh',
            'investidor',
            'executivo'
          )
      )
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'operador')
        AND EXISTS (
          SELECT 1
          FROM public.estudios_spin_operadoras j
          INNER JOIN public.user_scopes s
            ON s.user_id = auth.uid()
           AND s.scope_type = 'operadora'
           AND s.scope_ref = j.operadora_slug
          WHERE j.estudio_slug = p_estudio_slug
        )
      )
    );
$$;

COMMENT ON FUNCTION public._estudios_spin_scope_estudio(text) IS
  'Escopo por estúdio: admin/gestor/staff Spin/executivo/investidor global; operador por user_scopes operadora.';

COMMIT;
