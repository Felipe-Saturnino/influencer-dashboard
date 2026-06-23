-- Executivo, Investidor e Prestador: visão global de operadoras/estúdios (sem user_scopes).
-- Alinha RLS à app; corrige estudios_spin, mesas_spin e regressão do Roteiro (investidor).

BEGIN;

CREATE OR REPLACE FUNCTION public._role_sem_escopo_app()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN (
        'executivo',
        'investidor',
        'prestador',
        'shift_leader',
        'service_manager',
        'figurino',
        'rh'
      )
  );
$$;

COMMENT ON FUNCTION public._role_sem_escopo_app() IS
  'Executivo, Investidor, Prestador e staff Spin: sem escopo operadora/influencer na app — só role_permissions.';

CREATE OR REPLACE FUNCTION public._mesas_spin_cadastro_scope_slug(p_slug text)
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
      OR public._role_sem_escopo_app()
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'operador')
        AND EXISTS (
          SELECT 1
          FROM public.user_scopes s
          WHERE s.user_id = auth.uid()
            AND s.scope_type = 'operadora'
            AND s.scope_ref = p_slug
        )
      )
    );
$$;

COMMENT ON FUNCTION public._mesas_spin_cadastro_scope_slug(text) IS
  'Mesas Spin por operadora: admin/gestor global; executivo/investidor/prestador/staff sem user_scopes; operador por escopo.';

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
      OR public._gestor_page_perm('gestao_dealers', p_need)
      OR public._prestador_page_perm('gestao_dealers', p_need)
      OR public._staff_spin_page_perm('gestao_dealers', p_need)
      OR public._executivo_role_permissions_can_view('gestao_dealers')
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
      OR public._staff_spin_page_perm('rh_figurinos', p_need)
      OR public._executivo_role_permissions_can_view('rh_figurinos')
      OR public._gestor_page_perm('roteiro_mesa', p_need)
      OR public._prestador_page_perm('roteiro_mesa', p_need)
      OR public._staff_spin_page_perm('roteiro_mesa', p_need)
      OR public._executivo_role_permissions_can_view('roteiro_mesa')
      OR public._gestor_page_perm('central_notificacoes', p_need)
      OR public._prestador_page_perm('central_notificacoes', p_need)
      OR public._staff_spin_page_perm('central_notificacoes', p_need)
      OR public._executivo_role_permissions_can_view('central_notificacoes')
    );
$$;

COMMENT ON FUNCTION public._estudios_spin_leitura_perm(text) IS
  'SELECT em estudios_spin: Gestão de Mesas ou páginas operacionais (Staff, Escala, Dealers, Figurinos, Roteiro, Central).';

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
      OR public._role_sem_escopo_app()
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
  'Escopo por estúdio: admin/gestor + perfis _role_sem_escopo_app (executivo/investidor/prestador/staff) global; operador por user_scopes.';

-- Roteiro: restaura investidor (regressão 20260924120000) — operador continua por escopo
DROP POLICY IF EXISTS "Operador_executivo leem e escrevem roteiro das suas operadoras" ON public.roteiro_mesa_sugestoes;
CREATE POLICY "Operador_executivo leem e escrevem roteiro das suas operadoras"
  ON public.roteiro_mesa_sugestoes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes us
      WHERE us.user_id = auth.uid()
        AND us.scope_type = 'operadora'
        AND (
          us.scope_ref = roteiro_mesa_sugestoes.operadora_slug
          OR EXISTS (
            SELECT 1
            FROM public.estudios_spin_operadoras eo
            WHERE eo.estudio_slug = roteiro_mesa_sugestoes.estudio_slug
              AND eo.operadora_slug = us.scope_ref
          )
        )
    )
    OR public._role_admin_executivo_investidor()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes us
      WHERE us.user_id = auth.uid()
        AND us.scope_type = 'operadora'
        AND (
          us.scope_ref = roteiro_mesa_sugestoes.operadora_slug
          OR EXISTS (
            SELECT 1
            FROM public.estudios_spin_operadoras eo
            WHERE eo.estudio_slug = roteiro_mesa_sugestoes.estudio_slug
              AND eo.operadora_slug = us.scope_ref
          )
        )
    )
    OR public._role_admin_executivo_investidor()
  );

DROP POLICY IF EXISTS "Operador_executivo leem e escrevem campanhas das suas operadoras" ON public.roteiro_mesa_campanhas;
CREATE POLICY "Operador_executivo leem e escrevem campanhas das suas operadoras"
  ON public.roteiro_mesa_campanhas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes us
      WHERE us.user_id = auth.uid()
        AND us.scope_type = 'operadora'
        AND (
          us.scope_ref = roteiro_mesa_campanhas.operadora_slug
          OR EXISTS (
            SELECT 1
            FROM public.estudios_spin_operadoras eo
            WHERE eo.estudio_slug = roteiro_mesa_campanhas.estudio_slug
              AND eo.operadora_slug = us.scope_ref
          )
        )
    )
    OR public._role_admin_executivo_investidor()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes us
      WHERE us.user_id = auth.uid()
        AND us.scope_type = 'operadora'
        AND (
          us.scope_ref = roteiro_mesa_campanhas.operadora_slug
          OR EXISTS (
            SELECT 1
            FROM public.estudios_spin_operadoras eo
            WHERE eo.estudio_slug = roteiro_mesa_campanhas.estudio_slug
              AND eo.operadora_slug = us.scope_ref
          )
        )
    )
    OR public._role_admin_executivo_investidor()
  );

COMMIT;
