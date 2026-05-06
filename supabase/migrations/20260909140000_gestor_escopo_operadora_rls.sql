-- Gestor: sem bypass global por operadora — RLS alinha-se ao user_scopes (scope_type = operadora),
-- como na Gestão de Usuários (paridade com operador para dados por slug).

BEGIN;

CREATE OR REPLACE FUNCTION public._auth_tem_scope_operadora_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_scopes s
    WHERE s.user_id = auth.uid()
      AND s.scope_type = 'operadora'
      AND s.scope_ref = p_slug
  );
$$;

REVOKE ALL ON FUNCTION public._auth_tem_scope_operadora_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._auth_tem_scope_operadora_slug(text) TO authenticated;

COMMENT ON FUNCTION public._auth_tem_scope_operadora_slug(text) IS
  'Utilizador autenticado tem scope operadora = slug (Gestão de Usuários).';

-- Mesas Spin cadastro: gestor só slugs em escopo (admin e executivo mantêm visão global).
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
      EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
      OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'executivo')
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('gestor', 'operador'))
        AND public._auth_tem_scope_operadora_slug(p_slug)
      )
    );
$$;

-- Figurinos: gestor exige permissão na página + slug ∈ escopo (RPC e SELECT).
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
      OR (
        public._gestor_page_perm('rh_figurinos', p_need)
        AND public._auth_tem_scope_operadora_slug(p_slug)
      )
      OR (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
        AND public._executivo_role_permissions_figurinos_any_action()
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN (
              'operador',
              'shift_leader',
              'service_manager',
              'figurino',
              'rh'
            )
        )
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
      OR (
        public._gestor_page_perm('rh_figurinos', p_need)
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
      OR (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
        AND public._executivo_role_permissions_figurinos_any_action()
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN (
              'operador',
              'shift_leader',
              'service_manager',
              'figurino',
              'rh'
            )
        )
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

COMMENT ON FUNCTION public._rh_figurino_auth_can_slug(text, text) IS
  'Figurinos: gestor só operadoras em user_scopes; admin global; executivo por role_permissions.';
COMMENT ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid, text) IS
  'Figurinos: gestor só peças ligadas a operadoras do seu escopo.';

DROP POLICY IF EXISTS rh_figurino_pecas_select_scope ON public.rh_figurino_pecas;
CREATE POLICY rh_figurino_pecas_select_scope
  ON public.rh_figurino_pecas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._gestor_page_perm('rh_figurinos', 'view')
      AND EXISTS (
        SELECT 1
        FROM public.rh_figurino_peca_operadoras j
        INNER JOIN public.user_scopes s
          ON s.user_id = auth.uid()
         AND s.scope_type = 'operadora'
         AND s.scope_ref = j.operadora_slug
        WHERE j.peca_id = rh_figurino_pecas.id
      )
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND public._executivo_role_permissions_can_view('rh_figurinos')
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN (
            'operador',
            'shift_leader',
            'service_manager',
            'figurino',
            'rh'
          )
      )
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
    OR (
      public._gestor_page_perm('rh_figurinos', 'view')
      AND public._auth_tem_scope_operadora_slug(operadora_slug)
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND public._executivo_role_permissions_can_view('rh_figurinos')
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN (
            'operador',
            'shift_leader',
            'service_manager',
            'figurino',
            'rh'
          )
      )
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
          OR (
            public._gestor_page_perm('rh_figurinos', 'view')
            AND EXISTS (
              SELECT 1 FROM public.rh_figurino_peca_operadoras j
              INNER JOIN public.user_scopes s
                ON s.user_id = auth.uid()
               AND s.scope_type = 'operadora'
               AND s.scope_ref = j.operadora_slug
              WHERE j.peca_id = p.id
            )
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'executivo')
            AND public._executivo_role_permissions_can_view('rh_figurinos')
          )
          OR (
            EXISTS (
              SELECT 1 FROM public.profiles pr
              WHERE pr.id = auth.uid()
                AND pr.role IN (
                  'operador',
                  'shift_leader',
                  'service_manager',
                  'figurino',
                  'rh'
                )
            )
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
          OR (
            public._gestor_page_perm('rh_figurinos', 'view')
            AND EXISTS (
              SELECT 1 FROM public.rh_figurino_peca_operadoras j
              INNER JOIN public.user_scopes s
                ON s.user_id = auth.uid()
               AND s.scope_type = 'operadora'
               AND s.scope_ref = j.operadora_slug
              WHERE j.peca_id = p.id
            )
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'executivo')
            AND public._executivo_role_permissions_can_view('rh_figurinos')
          )
          OR (
            EXISTS (
              SELECT 1 FROM public.profiles pr
              WHERE pr.id = auth.uid()
                AND pr.role IN (
                  'operador',
                  'shift_leader',
                  'service_manager',
                  'figurino',
                  'rh'
                )
            )
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

-- Banca de jogo
DROP POLICY IF EXISTS "banca_jogo_select_admin_gestor" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_select_admin_gestor"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._gestor_page_perm('banca_jogo', 'view')
      AND public._auth_tem_scope_operadora_slug(banca_jogo_solicitacoes.operadora_slug)
    )
  );

DROP POLICY IF EXISTS "banca_jogo_update_staff" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_update_staff"
  ON public.banca_jogo_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._gestor_page_perm('banca_jogo', 'edit')
      AND public._auth_tem_scope_operadora_slug(banca_jogo_solicitacoes.operadora_slug)
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._gestor_page_perm('banca_jogo', 'edit')
      AND public._auth_tem_scope_operadora_slug(banca_jogo_solicitacoes.operadora_slug)
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
  );

DROP POLICY IF EXISTS "banca_jogo_delete_admin_gestor" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_delete_admin_gestor"
  ON public.banca_jogo_solicitacoes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._gestor_page_perm('banca_jogo', 'delete')
      AND public._auth_tem_scope_operadora_slug(banca_jogo_solicitacoes.operadora_slug)
    )
  );

-- Playbook / auditoria: influencer precisa estar ligado a operadora do escopo do gestor
DROP POLICY IF EXISTS "Admin gestor executivo leem guia_confirmacoes" ON public.guia_confirmacoes;
CREATE POLICY "Admin gestor executivo leem guia_confirmacoes"
  ON public.guia_confirmacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo'))
    OR (
      public._gestor_page_perm('playbook_influencers', 'view')
      AND EXISTS (
        SELECT 1
        FROM public.influencer_operadoras io
        INNER JOIN public.user_scopes s
          ON s.user_id = auth.uid()
         AND s.scope_type = 'operadora'
         AND s.scope_ref = io.operadora_slug
        WHERE io.influencer_id = guia_confirmacoes.influencer_id
          AND io.ativo IS TRUE
      )
    )
  );

-- Roteiro mesa — políticas só gestor (por operadora)
DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_select ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_select
  ON public.roteiro_mesa_campanhas FOR SELECT TO authenticated
  USING (
    public._gestor_page_perm('roteiro_mesa', 'view')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_campanhas.operadora_slug)
  );

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_insert ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_insert
  ON public.roteiro_mesa_campanhas FOR INSERT TO authenticated
  WITH CHECK (
    public._gestor_page_perm('roteiro_mesa', 'create')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_campanhas.operadora_slug)
  );

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_update ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_update
  ON public.roteiro_mesa_campanhas FOR UPDATE TO authenticated
  USING (
    public._gestor_page_perm('roteiro_mesa', 'edit')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_campanhas.operadora_slug)
  )
  WITH CHECK (
    public._gestor_page_perm('roteiro_mesa', 'edit')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_campanhas.operadora_slug)
  );

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_delete ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_delete
  ON public.roteiro_mesa_campanhas FOR DELETE TO authenticated
  USING (
    public._gestor_page_perm('roteiro_mesa', 'delete')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_campanhas.operadora_slug)
  );

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_select ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_select
  ON public.roteiro_mesa_sugestoes FOR SELECT TO authenticated
  USING (
    public._gestor_page_perm('roteiro_mesa', 'view')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_sugestoes.operadora_slug)
  );

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_insert ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_insert
  ON public.roteiro_mesa_sugestoes FOR INSERT TO authenticated
  WITH CHECK (
    public._gestor_page_perm('roteiro_mesa', 'create')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_sugestoes.operadora_slug)
  );

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_update ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_update
  ON public.roteiro_mesa_sugestoes FOR UPDATE TO authenticated
  USING (
    public._gestor_page_perm('roteiro_mesa', 'edit')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_sugestoes.operadora_slug)
  )
  WITH CHECK (
    public._gestor_page_perm('roteiro_mesa', 'edit')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_sugestoes.operadora_slug)
  );

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_delete ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_delete
  ON public.roteiro_mesa_sugestoes FOR DELETE TO authenticated
  USING (
    public._gestor_page_perm('roteiro_mesa', 'delete')
    AND public._auth_tem_scope_operadora_slug(roteiro_mesa_sugestoes.operadora_slug)
  );

-- Threads roteiro mesa
DROP POLICY IF EXISTS "roteiro_mesa_sol_select_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_select_staff"
  ON public.roteiro_mesa_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR (
      public._gestor_page_perm('roteiro_mesa', 'view')
      AND public._auth_tem_scope_operadora_slug(roteiro_mesa_solicitacoes.operadora_slug)
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_insert_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_insert_staff"
  ON public.roteiro_mesa_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
      )
      OR (
        public._gestor_page_perm('roteiro_mesa', 'create')
        AND public._auth_tem_scope_operadora_slug(roteiro_mesa_solicitacoes.operadora_slug)
      )
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
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR (
      public._gestor_page_perm('roteiro_mesa', 'edit')
      AND public._auth_tem_scope_operadora_slug(roteiro_mesa_solicitacoes.operadora_slug)
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_msg_select" ON public.roteiro_mesa_solicitacao_mensagens;
CREATE POLICY "roteiro_mesa_sol_msg_select"
  ON public.roteiro_mesa_solicitacao_mensagens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_mesa_solicitacoes s
      WHERE s.id = roteiro_mesa_solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR (
            public._gestor_page_perm('roteiro_mesa', 'view')
            AND public._auth_tem_scope_operadora_slug(s.operadora_slug)
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_msg_insert" ON public.roteiro_mesa_solicitacao_mensagens;
CREATE POLICY "roteiro_mesa_sol_msg_insert"
  ON public.roteiro_mesa_solicitacao_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roteiro_mesa_solicitacoes s
      WHERE s.id = solicitacao_id
        AND (
          (
            autor = 'gestor'
            AND (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
              )
              OR (
                (
                  public._gestor_page_perm('roteiro_mesa', 'create')
                  OR public._gestor_page_perm('roteiro_mesa', 'edit')
                )
                AND public._auth_tem_scope_operadora_slug(s.operadora_slug)
              )
            )
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND autor = 'operadora'
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_msg_update_visto" ON public.roteiro_mesa_solicitacao_mensagens;
CREATE POLICY "roteiro_mesa_sol_msg_update_visto"
  ON public.roteiro_mesa_solicitacao_mensagens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_mesa_solicitacoes s
      WHERE s.id = roteiro_mesa_solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR (
            public._gestor_page_perm('roteiro_mesa', 'view')
            AND public._auth_tem_scope_operadora_slug(s.operadora_slug)
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

-- Roteiro campanha solicitações
DROP POLICY IF EXISTS "roteiro_camp_sol_select_staff" ON public.roteiro_campanha_solicitacoes;
CREATE POLICY "roteiro_camp_sol_select_staff"
  ON public.roteiro_campanha_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR (
      public._gestor_page_perm('roteiro_mesa', 'view')
      AND public._auth_tem_scope_operadora_slug(roteiro_campanha_solicitacoes.operadora_slug)
    )
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_insert_staff" ON public.roteiro_campanha_solicitacoes;
CREATE POLICY "roteiro_camp_sol_insert_staff"
  ON public.roteiro_campanha_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
      )
      OR (
        public._gestor_page_perm('roteiro_mesa', 'create')
        AND public._auth_tem_scope_operadora_slug(roteiro_campanha_solicitacoes.operadora_slug)
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.roteiro_mesa_campanhas c
      WHERE c.id = campanha_id AND c.operadora_slug = operadora_slug
    )
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_update_staff" ON public.roteiro_campanha_solicitacoes;
CREATE POLICY "roteiro_camp_sol_update_staff"
  ON public.roteiro_campanha_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR (
      public._gestor_page_perm('roteiro_mesa', 'edit')
      AND public._auth_tem_scope_operadora_slug(roteiro_campanha_solicitacoes.operadora_slug)
    )
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_msg_select" ON public.roteiro_campanha_solicitacao_mensagens;
CREATE POLICY "roteiro_camp_sol_msg_select"
  ON public.roteiro_campanha_solicitacao_mensagens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_campanha_solicitacoes s
      WHERE s.id = roteiro_campanha_solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR (
            public._gestor_page_perm('roteiro_mesa', 'view')
            AND public._auth_tem_scope_operadora_slug(s.operadora_slug)
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_msg_insert" ON public.roteiro_campanha_solicitacao_mensagens;
CREATE POLICY "roteiro_camp_sol_msg_insert"
  ON public.roteiro_campanha_solicitacao_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roteiro_campanha_solicitacoes s
      WHERE s.id = solicitacao_id
        AND (
          (
            autor = 'gestor'
            AND (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
              )
              OR (
                (
                  public._gestor_page_perm('roteiro_mesa', 'create')
                  OR public._gestor_page_perm('roteiro_mesa', 'edit')
                )
                AND public._auth_tem_scope_operadora_slug(s.operadora_slug)
              )
            )
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND autor = 'operadora'
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_msg_update_visto" ON public.roteiro_campanha_solicitacao_mensagens;
CREATE POLICY "roteiro_camp_sol_msg_update_visto"
  ON public.roteiro_campanha_solicitacao_mensagens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_campanha_solicitacoes s
      WHERE s.id = roteiro_campanha_solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR (
            public._gestor_page_perm('roteiro_mesa', 'view')
            AND public._auth_tem_scope_operadora_slug(s.operadora_slug)
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

-- Dealers solicitações
DROP POLICY IF EXISTS "dealer_sol_select_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_select_staff"
  ON public.dealer_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR (
      public._gestor_page_perm('gestao_dealers', 'view')
      AND public._auth_tem_scope_operadora_slug(dealer_solicitacoes.operadora_slug)
    )
  );

DROP POLICY IF EXISTS "dealer_sol_update_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_update_staff"
  ON public.dealer_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR (
      public._gestor_page_perm('gestao_dealers', 'edit')
      AND public._auth_tem_scope_operadora_slug(dealer_solicitacoes.operadora_slug)
    )
  );

DROP POLICY IF EXISTS "sol_msg_select" ON public.solicitacao_mensagens;
CREATE POLICY "sol_msg_select"
  ON public.solicitacao_mensagens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dealer_solicitacoes s
      WHERE s.id = solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR (
            public._gestor_page_perm('gestao_dealers', 'view')
            AND public._auth_tem_scope_operadora_slug(s.operadora_slug)
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "sol_msg_insert" ON public.solicitacao_mensagens;
CREATE POLICY "sol_msg_insert"
  ON public.solicitacao_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dealer_solicitacoes s
      WHERE s.id = solicitacao_id
        AND (
          (
            autor = 'gestor'
            AND (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
              )
              OR (
                (
                  public._gestor_page_perm('gestao_dealers', 'create')
                  OR public._gestor_page_perm('gestao_dealers', 'edit')
                )
                AND public._auth_tem_scope_operadora_slug(s.operadora_slug)
              )
            )
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND autor = 'operadora'
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "sol_msg_update_visto" ON public.solicitacao_mensagens;
CREATE POLICY "sol_msg_update_visto"
  ON public.solicitacao_mensagens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dealer_solicitacoes s
      WHERE s.id = solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR (
            public._gestor_page_perm('gestao_dealers', 'view')
            AND public._auth_tem_scope_operadora_slug(s.operadora_slug)
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

COMMIT;
