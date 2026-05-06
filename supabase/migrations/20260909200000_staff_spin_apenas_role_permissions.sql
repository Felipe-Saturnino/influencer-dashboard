-- Shift Leader, Service Manager, Figurino e RH: acesso alinhado 100% à aba Permissões (role_permissions).
-- Remove dependência de user_scopes operadora na app e no RLS; visão global de dados quando can_* permite.

BEGIN;

-- ─── Helper: perfis staff Spin × Gestão de Usuários (sem matriz de tipo) ───

CREATE OR REPLACE FUNCTION public._staff_spin_page_perm(p_page_key text, p_need text)
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
      AND p.role IN ('shift_leader', 'service_manager', 'figurino', 'rh')
      AND rp.page_key = p_page_key
      AND (
        (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
        OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
        OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
        OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
      )
  );
$$;

REVOKE ALL ON FUNCTION public._staff_spin_page_perm(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._staff_spin_page_perm(text, text) TO authenticated;

COMMENT ON FUNCTION public._staff_spin_page_perm(text, text) IS
  'Shift Leader / Service Manager / Figurino / RH: ação efetiva só conforme role_permissions (aba Permissões), sem user_scopes.';

-- ─── Mesas Spin: staff com gestao_mesas vê todas as operadoras (como executivo) ───

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
      OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'executivo')
      OR EXISTS (
        SELECT 1
        FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND pr.role IN ('shift_leader', 'service_manager', 'figurino', 'rh')
      )
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

-- ─── Figurinos: staff só por role_permissions; operador continua por user_scopes ───

DROP FUNCTION IF EXISTS public._rh_figurino_user_can_access_peca_id(uuid);
DROP FUNCTION IF EXISTS public._rh_figurino_auth_can_slug(text);

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
      OR (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
        AND public._executivo_role_permissions_figurinos_any_action()
      )
      OR public._staff_spin_page_perm('rh_figurinos', p_need)
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
      OR (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
        AND public._executivo_role_permissions_figurinos_any_action()
      )
      OR public._staff_spin_page_perm('rh_figurinos', p_need)
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

REVOKE ALL ON FUNCTION public._rh_figurino_auth_can_slug(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_figurino_auth_can_slug(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid, text) TO authenticated;

COMMENT ON FUNCTION public._rh_figurino_auth_can_slug(text, text) IS
  'Figurinos: admin; gestor/prestador matriz; executivo/staff × role_permissions; operador × user_scopes operadora.';
COMMENT ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid, text) IS
  'Figurinos: peça acessível conforme papel — staff Spin global se rh_figurinos na aba Permissões; operador por escopo.';

DROP POLICY IF EXISTS rh_figurino_pecas_select_scope ON public.rh_figurino_pecas;
CREATE POLICY rh_figurino_pecas_select_scope
  ON public.rh_figurino_pecas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('rh_figurinos', 'view')
    OR public._prestador_page_perm('rh_figurinos', 'view')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND public._executivo_role_permissions_can_view('rh_figurinos')
    )
    OR public._staff_spin_page_perm('rh_figurinos', 'view')
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
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND public._executivo_role_permissions_can_view('rh_figurinos')
    )
    OR public._staff_spin_page_perm('rh_figurinos', 'view')
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
          OR (
            EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'executivo')
            AND public._executivo_role_permissions_can_view('rh_figurinos')
          )
          OR public._staff_spin_page_perm('rh_figurinos', 'view')
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
          OR (
            EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'executivo')
            AND public._executivo_role_permissions_can_view('rh_figurinos')
          )
          OR public._staff_spin_page_perm('rh_figurinos', 'view')
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

-- Escopos legados: staff não usa mais user_scopes para permissão
DELETE FROM public.user_scopes s
USING public.profiles p
WHERE p.id = s.user_id
  AND p.role IN ('shift_leader', 'service_manager', 'figurino', 'rh');

-- Parte 2: banca de jogo, playbook/guia, roteiro, dealers — gestor ou prestador com matriz efetiva (_gestor_page_perm ∪ _prestador_page_perm).

DROP POLICY IF EXISTS "banca_jogo_select_admin_gestor" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_select_admin_gestor"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'view') OR public._prestador_page_perm('banca_jogo', 'view') OR public._staff_spin_page_perm('banca_jogo', 'view')
  );

DROP POLICY IF EXISTS "banca_jogo_update_staff" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_update_staff"
  ON public.banca_jogo_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'edit') OR public._prestador_page_perm('banca_jogo', 'edit') OR public._staff_spin_page_perm('banca_jogo', 'edit')
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
    OR public._gestor_page_perm('banca_jogo', 'edit') OR public._prestador_page_perm('banca_jogo', 'edit') OR public._staff_spin_page_perm('banca_jogo', 'edit')
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
    OR public._gestor_page_perm('banca_jogo', 'delete') OR public._prestador_page_perm('banca_jogo', 'delete') OR public._staff_spin_page_perm('banca_jogo', 'delete')
  );

DROP POLICY IF EXISTS "Admin gestor executivo leem guia_confirmacoes" ON public.guia_confirmacoes;
CREATE POLICY "Admin gestor executivo leem guia_confirmacoes"
  ON public.guia_confirmacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo'))
    OR public._gestor_page_perm('playbook_influencers', 'view') OR public._prestador_page_perm('playbook_influencers', 'view') OR public._staff_spin_page_perm('playbook_influencers', 'view')
  );

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_select ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_select
  ON public.roteiro_mesa_campanhas FOR SELECT TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view') OR public._staff_spin_page_perm('roteiro_mesa', 'view'));

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_insert ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_insert
  ON public.roteiro_mesa_campanhas FOR INSERT TO authenticated
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create') OR public._staff_spin_page_perm('roteiro_mesa', 'create'));

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_update ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_update
  ON public.roteiro_mesa_campanhas FOR UPDATE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit') OR public._staff_spin_page_perm('roteiro_mesa', 'edit'))
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit') OR public._staff_spin_page_perm('roteiro_mesa', 'edit'));

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_delete ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_delete
  ON public.roteiro_mesa_campanhas FOR DELETE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'delete') OR public._prestador_page_perm('roteiro_mesa', 'delete') OR public._staff_spin_page_perm('roteiro_mesa', 'delete'));

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
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_campanhas.operadora_slug
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  );

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_select ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_select
  ON public.roteiro_mesa_sugestoes FOR SELECT TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view') OR public._staff_spin_page_perm('roteiro_mesa', 'view'));

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_insert ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_insert
  ON public.roteiro_mesa_sugestoes FOR INSERT TO authenticated
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create') OR public._staff_spin_page_perm('roteiro_mesa', 'create'));

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_update ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_update
  ON public.roteiro_mesa_sugestoes FOR UPDATE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit') OR public._staff_spin_page_perm('roteiro_mesa', 'edit'))
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit') OR public._staff_spin_page_perm('roteiro_mesa', 'edit'));

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_delete ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_delete
  ON public.roteiro_mesa_sugestoes FOR DELETE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'delete') OR public._prestador_page_perm('roteiro_mesa', 'delete') OR public._staff_spin_page_perm('roteiro_mesa', 'delete'));

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
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_sugestoes.operadora_slug
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_select_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_select_staff"
  ON public.roteiro_mesa_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view') OR public._staff_spin_page_perm('roteiro_mesa', 'view')
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
      OR public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create') OR public._staff_spin_page_perm('roteiro_mesa', 'create')
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
    OR public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit') OR public._staff_spin_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view') OR public._staff_spin_page_perm('roteiro_mesa', 'view')
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
            (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
              )
              OR public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create') OR public._staff_spin_page_perm('roteiro_mesa', 'create')
              OR public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit') OR public._staff_spin_page_perm('roteiro_mesa', 'edit')
            )
            AND autor = 'gestor'
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
          OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view') OR public._staff_spin_page_perm('roteiro_mesa', 'view')
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

DROP POLICY IF EXISTS "roteiro_camp_sol_select_staff" ON public.roteiro_campanha_solicitacoes;
CREATE POLICY "roteiro_camp_sol_select_staff"
  ON public.roteiro_campanha_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view') OR public._staff_spin_page_perm('roteiro_mesa', 'view')
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
      OR public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create') OR public._staff_spin_page_perm('roteiro_mesa', 'create')
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
    OR public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit') OR public._staff_spin_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view') OR public._staff_spin_page_perm('roteiro_mesa', 'view')
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
            (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
              )
              OR public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create') OR public._staff_spin_page_perm('roteiro_mesa', 'create')
              OR public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit') OR public._staff_spin_page_perm('roteiro_mesa', 'edit')
            )
            AND autor = 'gestor'
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
          OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view') OR public._staff_spin_page_perm('roteiro_mesa', 'view')
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

DROP POLICY IF EXISTS "dealer_sol_select_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_select_staff"
  ON public.dealer_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('gestao_dealers', 'view') OR public._prestador_page_perm('gestao_dealers', 'view') OR public._staff_spin_page_perm('gestao_dealers', 'view')
  );

DROP POLICY IF EXISTS "dealer_sol_update_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_update_staff"
  ON public.dealer_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('gestao_dealers', 'edit') OR public._prestador_page_perm('gestao_dealers', 'edit') OR public._staff_spin_page_perm('gestao_dealers', 'edit')
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
          OR public._gestor_page_perm('gestao_dealers', 'view') OR public._prestador_page_perm('gestao_dealers', 'view') OR public._staff_spin_page_perm('gestao_dealers', 'view')
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
            (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
              )
              OR public._gestor_page_perm('gestao_dealers', 'create') OR public._prestador_page_perm('gestao_dealers', 'create') OR public._staff_spin_page_perm('gestao_dealers', 'create')
              OR public._gestor_page_perm('gestao_dealers', 'edit') OR public._prestador_page_perm('gestao_dealers', 'edit') OR public._staff_spin_page_perm('gestao_dealers', 'edit')
            )
            AND autor = 'gestor'
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
          OR public._gestor_page_perm('gestao_dealers', 'view') OR public._prestador_page_perm('gestao_dealers', 'view') OR public._staff_spin_page_perm('gestao_dealers', 'view')
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

DROP FUNCTION IF EXISTS public._auth_tem_scope_operadora_slug(text);

COMMIT;
