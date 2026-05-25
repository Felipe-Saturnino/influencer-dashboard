-- Investidor (e demais perfis sem user_scopes): paridade com Executivo/Staff na visão global
-- quando role_permissions libera a página — corrige RLS que hardcodava só 'executivo'.

BEGIN;

-- ─── Helpers canónicos ───────────────────────────────────────────────────────

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
        'shift_leader',
        'service_manager',
        'figurino',
        'rh'
      )
  );
$$;

REVOKE ALL ON FUNCTION public._role_sem_escopo_app() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._role_sem_escopo_app() TO authenticated;

COMMENT ON FUNCTION public._role_sem_escopo_app() IS
  'Executivo, Investidor e staff Spin: sem escopo operadora/influencer na app — só role_permissions.';

CREATE OR REPLACE FUNCTION public._role_permissions_sem_escopo_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IN ('executivo', 'investidor')
          AND rp.page_key = p_page_key
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
      OR public._staff_spin_page_perm(p_page_key, p_need)
    );
$$;

REVOKE ALL ON FUNCTION public._role_permissions_sem_escopo_page_perm(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._role_permissions_sem_escopo_page_perm(text, text) TO authenticated;

COMMENT ON FUNCTION public._role_permissions_sem_escopo_page_perm(text, text) IS
  'Executivo/Investidor/staff Spin: ação efetiva só conforme role_permissions (aba Permissões), sem user_scopes.';

-- Compat: políticas legadas que referenciam _executivo_role_permissions_can_view
CREATE OR REPLACE FUNCTION public._executivo_role_permissions_can_view(p_page_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._role_permissions_sem_escopo_page_perm(p_page_key, 'view');
$$;

COMMENT ON FUNCTION public._executivo_role_permissions_can_view(text) IS
  'Executivo e Investidor (e staff via _staff_spin_page_perm indireto em políticas dedicadas): Ver conforme role_permissions.';

CREATE OR REPLACE FUNCTION public._executivo_role_permissions_figurinos_any_action()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public._role_permissions_sem_escopo_page_perm('rh_figurinos', 'view')
    OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', 'create')
    OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', 'edit')
    OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', 'delete');
$$;

-- ─── Mesas Spin: catálogo + lobby (Overview Spin usa mesas_spin, não só gestao_mesas) ───

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

DROP POLICY IF EXISTS mesas_spin_cadastro_select ON public.mesas_spin_cadastro;
CREATE POLICY mesas_spin_cadastro_select
  ON public.mesas_spin_cadastro FOR SELECT TO authenticated
  USING (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND (
      public._mesas_spin_overview_perm('view')
      OR public._mesas_spin_cadastro_perm('view')
    )
  );

-- ─── Figurinos: Investidor com mesma regra global que Executivo ───────────────

CREATE OR REPLACE FUNCTION public._rh_figurino_auth_can_slug(p_slug text, p_need text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
      OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', p_need)
      OR (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
        AND EXISTS (
          SELECT 1 FROM public.user_scopes s
          WHERE s.user_id = auth.uid()
            AND s.scope_type = 'operadora'
            AND s.scope_ref = p_slug
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public._rh_figurino_user_can_access_peca_id(p_peca_id uuid, p_need text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
      OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', p_need)
      OR (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
        AND EXISTS (
          SELECT 1
          FROM public.rh_figurino_peca_operadoras j
          INNER JOIN public.user_scopes s
            ON s.user_id = auth.uid()
           AND s.scope_type = 'operadora'
           AND s.scope_ref = j.operadora_slug
          WHERE j.peca_id = p_peca_id
        )
      )
    );
$$;

DROP POLICY IF EXISTS rh_figurino_pecas_select_scope ON public.rh_figurino_pecas;
CREATE POLICY rh_figurino_pecas_select_scope
  ON public.rh_figurino_pecas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('rh_figurinos', 'view')
    OR public._prestador_page_perm('rh_figurinos', 'view')
    OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', 'view')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
      AND EXISTS (
        SELECT 1
        FROM public.rh_figurino_peca_operadoras j
        WHERE j.peca_id = rh_figurino_pecas.id
          AND j.operadora_slug IN (
            SELECT s.scope_ref FROM public.user_scopes s
            WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
          )
      )
    )
  );

DROP POLICY IF EXISTS rh_figurino_po_select ON public.rh_figurino_peca_operadoras;
CREATE POLICY rh_figurino_po_select
  ON public.rh_figurino_peca_operadoras FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('rh_figurinos', 'view')
    OR public._prestador_page_perm('rh_figurinos', 'view')
    OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', 'view')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
  );

DROP POLICY IF EXISTS rh_figurino_emp_select ON public.rh_figurino_emprestimos;
CREATE POLICY rh_figurino_emp_select
  ON public.rh_figurino_emprestimos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rh_figurino_pecas p
      WHERE p.id = rh_figurino_emprestimos.item_id
        AND (
          EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
          OR public._gestor_page_perm('rh_figurinos', 'view')
          OR public._prestador_page_perm('rh_figurinos', 'view')
          OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', 'view')
          OR (
            EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'operador')
            AND EXISTS (
              SELECT 1 FROM public.rh_figurino_peca_operadoras j
              WHERE j.peca_id = p.id
                AND j.operadora_slug IN (
                  SELECT s.scope_ref FROM public.user_scopes s
                  WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
                )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS rh_figurino_hist_select ON public.rh_figurino_status_history;
CREATE POLICY rh_figurino_hist_select
  ON public.rh_figurino_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rh_figurino_pecas p
      WHERE p.id = rh_figurino_status_history.item_id
        AND (
          EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
          OR public._gestor_page_perm('rh_figurinos', 'view')
          OR public._prestador_page_perm('rh_figurinos', 'view')
          OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', 'view')
          OR (
            EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'operador')
            AND EXISTS (
              SELECT 1 FROM public.rh_figurino_peca_operadoras j
              WHERE j.peca_id = p.id
                AND j.operadora_slug IN (
                  SELECT s.scope_ref FROM public.user_scopes s
                  WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
                )
            )
          )
        )
    )
  );

-- ─── Playbook / Roteiro / Dealers: paridade Investidor com Executivo ─────────

CREATE OR REPLACE FUNCTION public._role_admin_executivo_investidor()
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
      AND p.role IN ('admin', 'executivo', 'investidor')
  );
$$;

REVOKE ALL ON FUNCTION public._role_admin_executivo_investidor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._role_admin_executivo_investidor() TO authenticated;

DROP POLICY IF EXISTS "Admin gestor executivo leem guia_confirmacoes" ON public.guia_confirmacoes;
CREATE POLICY "Admin gestor executivo leem guia_confirmacoes"
  ON public.guia_confirmacoes FOR SELECT TO authenticated
  USING (
    public._role_admin_executivo_investidor()
    OR public._gestor_page_perm('playbook_influencers', 'view')
    OR public._prestador_page_perm('playbook_influencers', 'view')
    OR public._staff_spin_page_perm('playbook_influencers', 'view')
  );

DROP POLICY IF EXISTS "Operador_executivo leem e escrevem campanhas das suas operadoras" ON public.roteiro_mesa_campanhas;
CREATE POLICY "Operador_executivo leem e escrevem campanhas das suas operadoras"
  ON public.roteiro_mesa_campanhas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_campanhas.operadora_slug
    )
    OR public._role_admin_executivo_investidor()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_campanhas.operadora_slug
    )
    OR public._role_admin_executivo_investidor()
  );

DROP POLICY IF EXISTS "Operador_executivo leem e escrevem roteiro das suas operadoras" ON public.roteiro_mesa_sugestoes;
CREATE POLICY "Operador_executivo leem e escrevem roteiro das suas operadoras"
  ON public.roteiro_mesa_sugestoes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_sugestoes.operadora_slug
    )
    OR public._role_admin_executivo_investidor()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_sugestoes.operadora_slug
    )
    OR public._role_admin_executivo_investidor()
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_select_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_select_staff"
  ON public.roteiro_mesa_solicitacoes FOR SELECT TO authenticated
  USING (
    public._role_admin_executivo_investidor()
    OR public._gestor_page_perm('roteiro_mesa', 'view')
    OR public._prestador_page_perm('roteiro_mesa', 'view')
    OR public._staff_spin_page_perm('roteiro_mesa', 'view')
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_insert_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_insert_staff"
  ON public.roteiro_mesa_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    (
      public._role_admin_executivo_investidor()
      OR public._gestor_page_perm('roteiro_mesa', 'create')
      OR public._prestador_page_perm('roteiro_mesa', 'create')
      OR public._staff_spin_page_perm('roteiro_mesa', 'create')
    )
    AND EXISTS (
      SELECT 1 FROM public.roteiro_mesa_sugestoes g
      WHERE g.id = sugestao_id AND g.operadora_slug = operadora_slug
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_update_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_update_staff"
  ON public.roteiro_mesa_solicitacoes FOR UPDATE TO authenticated
  USING (
    public._role_admin_executivo_investidor()
    OR public._gestor_page_perm('roteiro_mesa', 'edit')
    OR public._prestador_page_perm('roteiro_mesa', 'edit')
    OR public._staff_spin_page_perm('roteiro_mesa', 'edit')
  );

DROP POLICY IF EXISTS "dealer_sol_select_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_select_staff"
  ON public.dealer_solicitacoes FOR SELECT TO authenticated
  USING (
    public._role_admin_executivo_investidor()
    OR public._gestor_page_perm('gestao_dealers', 'view')
    OR public._prestador_page_perm('gestao_dealers', 'view')
    OR public._staff_spin_page_perm('gestao_dealers', 'view')
  );

DROP POLICY IF EXISTS "dealer_sol_update_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_update_staff"
  ON public.dealer_solicitacoes FOR UPDATE TO authenticated
  USING (
    public._role_admin_executivo_investidor()
    OR public._gestor_page_perm('gestao_dealers', 'edit')
    OR public._prestador_page_perm('gestao_dealers', 'edit')
    OR public._staff_spin_page_perm('gestao_dealers', 'edit')
  );

COMMIT;
