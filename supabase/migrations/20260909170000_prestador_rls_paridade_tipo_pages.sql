-- Prestador: paridade com a app — role_permissions ∩ união(prestador_tipo_pages) via user_scopes (prestador_tipo).
-- Exceção: home, configuracoes, ajuda só role_permissions (sem interseção com prestador_tipo_pages).
-- Depende de: prestador_tipo_pages (20260606100000), _gestor_page_perm (20260908120000).

BEGIN;

-- ─── Helper Prestador (SECURITY DEFINER: leitura consistente de prestador_tipo_pages / user_scopes) ─

CREATE OR REPLACE FUNCTION public._prestador_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_rp_ok boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'prestador') THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = uid
      AND rp.page_key = p_page_key
      AND (
        (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
        OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
        OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
        OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
      )
  )
  INTO v_rp_ok;

  IF NOT coalesce(v_rp_ok, false) THEN
    RETURN false;
  END IF;

  IF p_page_key IN ('home', 'configuracoes', 'ajuda') THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_scopes s
    WHERE s.user_id = uid AND s.scope_type = 'prestador_tipo'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_scopes s
    INNER JOIN public.prestador_tipo_pages ptp
      ON ptp.prestador_tipo_slug = s.scope_ref AND ptp.page_key = p_page_key
    WHERE s.user_id = uid AND s.scope_type = 'prestador_tipo'
  );
END;
$$;

REVOKE ALL ON FUNCTION public._prestador_page_perm(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._prestador_page_perm(text, text) TO authenticated;

COMMENT ON FUNCTION public._prestador_page_perm(text, text) IS
  'Prestador: permissão efetiva = role_permissions ∩ união(prestador_tipo_pages); páginas home/configuracoes/ajuda só role_permissions.';

-- ─── Permissões RH / Mesas (prestador isolado em _prestador_page_perm; demais via JOIN existente) ─

CREATE OR REPLACE FUNCTION public._rh_funcionario_perm(p_need text)
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
      OR (
        public._gestor_page_perm('rh_funcionarios', p_need)
        OR (
          p_need <> 'delete'
          AND public._gestor_page_perm('rh_staff', p_need)
        )
      )
      OR (
        public._prestador_page_perm('rh_funcionarios', p_need)
        OR (
          p_need <> 'delete'
          AND public._prestador_page_perm('rh_staff', p_need)
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'rh_funcionarios'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
      OR (
        p_need <> 'delete'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
          WHERE p.id = auth.uid()
            AND p.role IS DISTINCT FROM 'gestor'
            AND p.role IS DISTINCT FROM 'prestador'
            AND rp.page_key = 'rh_staff'
            AND (
              (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
              OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
              OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            )
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public._rh_vagas_perm(p_need text)
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
      OR public._gestor_page_perm('rh_vagas', p_need)
      OR public._prestador_page_perm('rh_vagas', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'rh_vagas'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public._rh_staff_perm(p_need text)
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
      OR public._gestor_page_perm('rh_staff', p_need)
      OR public._prestador_page_perm('rh_staff', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'rh_staff'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public._rh_organograma_perm(p_need text)
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
      OR public._gestor_page_perm('rh_organograma', p_need)
      OR public._prestador_page_perm('rh_organograma', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'rh_organograma'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public._rh_dados_cadastro_perm(p_need text)
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
      OR public._gestor_page_perm('rh_dados_cadastro', p_need)
      OR public._prestador_page_perm('rh_dados_cadastro', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'rh_dados_cadastro'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public._mesas_spin_cadastro_perm(p_need text)
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
      OR public._gestor_page_perm('gestao_mesas', p_need)
      OR public._prestador_page_perm('gestao_mesas', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'gestao_mesas'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

-- ─── Figurinos: SECURITY DEFINER + políticas SELECT ─

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
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
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

REVOKE ALL ON FUNCTION public._rh_figurino_auth_can_slug(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_figurino_auth_can_slug(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid, text) TO authenticated;

COMMENT ON FUNCTION public._rh_figurino_auth_can_slug(text, text) IS
  'Figurinos: admin; gestor/prestador com rh_figurinos efetivo; executivo se role_permissions; demais via user_scopes operadora.';
COMMENT ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid, text) IS
  'Figurinos: acesso à peça por nível (view/edit/delete para gestor/prestador via matriz); executivo com qualquer ação em rh_figurinos.';

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
    OR public._gestor_page_perm('rh_figurinos', 'view')
    OR public._prestador_page_perm('rh_figurinos', 'view')
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
          OR public._gestor_page_perm('rh_figurinos', 'view')
          OR public._prestador_page_perm('rh_figurinos', 'view')
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
          OR public._gestor_page_perm('rh_figurinos', 'view')
          OR public._prestador_page_perm('rh_figurinos', 'view')
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

-- Parte 2: banca de jogo, playbook/guia, roteiro, dealers — gestor ou prestador com matriz efetiva (_gestor_page_perm ∪ _prestador_page_perm).

DROP POLICY IF EXISTS "banca_jogo_select_admin_gestor" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_select_admin_gestor"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'view') OR public._prestador_page_perm('banca_jogo', 'view')
  );

DROP POLICY IF EXISTS "banca_jogo_update_staff" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_update_staff"
  ON public.banca_jogo_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'edit') OR public._prestador_page_perm('banca_jogo', 'edit')
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
    OR public._gestor_page_perm('banca_jogo', 'edit') OR public._prestador_page_perm('banca_jogo', 'edit')
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
    OR public._gestor_page_perm('banca_jogo', 'delete') OR public._prestador_page_perm('banca_jogo', 'delete')
  );

DROP POLICY IF EXISTS "Admin gestor executivo leem guia_confirmacoes" ON public.guia_confirmacoes;
CREATE POLICY "Admin gestor executivo leem guia_confirmacoes"
  ON public.guia_confirmacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo'))
    OR public._gestor_page_perm('playbook_influencers', 'view') OR public._prestador_page_perm('playbook_influencers', 'view')
  );

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_select ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_select
  ON public.roteiro_mesa_campanhas FOR SELECT TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view'));

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_insert ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_insert
  ON public.roteiro_mesa_campanhas FOR INSERT TO authenticated
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create'));

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_update ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_update
  ON public.roteiro_mesa_campanhas FOR UPDATE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit'))
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit'));

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_delete ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_delete
  ON public.roteiro_mesa_campanhas FOR DELETE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'delete') OR public._prestador_page_perm('roteiro_mesa', 'delete'));

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
  USING (public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view'));

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_insert ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_insert
  ON public.roteiro_mesa_sugestoes FOR INSERT TO authenticated
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create'));

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_update ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_update
  ON public.roteiro_mesa_sugestoes FOR UPDATE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit'))
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit'));

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_delete ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_delete
  ON public.roteiro_mesa_sugestoes FOR DELETE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'delete') OR public._prestador_page_perm('roteiro_mesa', 'delete'));

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
    OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view')
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
      OR public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create')
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
    OR public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view')
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
              OR public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create')
              OR public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view')
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
    OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view')
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
      OR public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create')
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
    OR public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view')
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
              OR public._gestor_page_perm('roteiro_mesa', 'create') OR public._prestador_page_perm('roteiro_mesa', 'create')
              OR public._gestor_page_perm('roteiro_mesa', 'edit') OR public._prestador_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view') OR public._prestador_page_perm('roteiro_mesa', 'view')
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
    OR public._gestor_page_perm('gestao_dealers', 'view') OR public._prestador_page_perm('gestao_dealers', 'view')
  );

DROP POLICY IF EXISTS "dealer_sol_update_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_update_staff"
  ON public.dealer_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('gestao_dealers', 'edit') OR public._prestador_page_perm('gestao_dealers', 'edit')
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
          OR public._gestor_page_perm('gestao_dealers', 'view') OR public._prestador_page_perm('gestao_dealers', 'view')
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
              OR public._gestor_page_perm('gestao_dealers', 'create') OR public._prestador_page_perm('gestao_dealers', 'create')
              OR public._gestor_page_perm('gestao_dealers', 'edit') OR public._prestador_page_perm('gestao_dealers', 'edit')
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
          OR public._gestor_page_perm('gestao_dealers', 'view') OR public._prestador_page_perm('gestao_dealers', 'view')
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

-- ─── RPCs (SECURITY DEFINER): prestador não pode contornar só com role_permissions ─

CREATE OR REPLACE FUNCTION public.rh_escala_prestadores_times()
RETURNS TABLE (
  id uuid,
  nome text,
  cargo text,
  escala text,
  staff_turno text,
  email text,
  org_time_id uuid,
  nome_time text,
  staff_nickname text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_gestao_escala', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'rh_gestao_escala'
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.nome,
    f.cargo,
    f.escala,
    f.staff_turno,
    f.email,
    f.org_time_id,
    t.nome AS nome_time,
    f.staff_nickname
  FROM public.rh_funcionarios f
  INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      (lower(btrim(g.nome)) LIKE '%game floor%')
      OR (
        lower(btrim(g.nome)) LIKE '%operation%'
        AND lower(btrim(g.nome)) LIKE '%management%'
      )
    )
    AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'contador de cartas'
  ORDER BY t.nome, f.nome;
END;
$$;

COMMENT ON FUNCTION public.rh_escala_prestadores_times() IS
  'RH Gestão de Escala: staff com escala e staff_turno (Game Floor / Operation Management), exceto time Contador de Cartas. Requer rh_gestao_escala efetivo (admin ou matriz prestador) ou role_permissions não‑prestador.';

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_carregar(p_ref_mes date, p_area_key text)
RETURNS TABLE (funcionario_id uuid, dia_iso date, valor text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_gestao_escala', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'rh_gestao_escala'
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT g.funcionario_id, g.dia_iso, g.valor
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = date_trunc('month', p_ref_mes)::date
    AND g.area_key = lower(btrim(p_area_key));
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_carregar(date, text) IS
  'Carrega células gravadas da grade (Gestão de Escala) para o mês e área. Requer rh_gestao_escala efetivo ou admin.';

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_salvar(p_ref_mes date, p_area_key text, p_celulas jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  k text;
  v_val text;
  parts text[];
  v_fid uuid;
  v_dia date;
  v_ok_perm boolean;
  v_aprovada boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR (
    public._prestador_page_perm('rh_gestao_escala', 'create')
    OR public._prestador_page_perm('rh_gestao_escala', 'edit')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND p.role IS DISTINCT FROM 'prestador'
      AND rp.page_key = 'rh_gestao_escala'
      AND (
        rp.can_criar IN ('sim', 'proprios')
        OR rp.can_editar IN ('sim', 'proprios')
      )
  )
  INTO v_ok_perm;

  IF NOT v_ok_perm THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_area');
  END IF;

  IF p_celulas IS NULL OR jsonb_typeof(p_celulas) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_payload');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref
      AND s.area_key = v_area
      AND s.status = 'aprovada'
  )
  INTO v_aprovada;

  IF coalesce(v_aprovada, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_aprovada');
  END IF;

  FOR k, v_val IN
    SELECT x.key, x.value FROM jsonb_each_text(p_celulas) AS x (key, value)
  LOOP
    parts := string_to_array(k, '|');
    IF coalesce(array_length(parts, 1), 0) <> 2 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_key', 'key', k);
    END IF;
    BEGIN
      v_fid := parts[1]::uuid;
      v_dia := parts[2]::date;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_key', 'key', k);
    END;

    IF NOT public._rh_gestao_escala_prestador_na_area(v_fid, v_area) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'prestador_fora_area', 'funcionario_id', v_fid::text);
    END IF;

    IF length(v_val) > 32 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'valor_too_long');
    END IF;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area, v_fid, v_dia, coalesce(v_val, ''))
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET
      valor = EXCLUDED.valor,
      atualizado_em = now();
  END LOOP;

  INSERT INTO public.rh_gestao_escala_grade_status (ref_mes, area_key, status, aprovado_em, aprovado_por)
  SELECT v_ref, v_area, 'rascunho'::text, NULL::timestamptz, NULL::uuid
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade_status s2
    WHERE s2.ref_mes = v_ref AND s2.area_key = v_area
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_salvar(date, text, jsonb) IS
  'Upsert em lote das células da grade. Recusa quando a escala está aprovada. Prestador exige matriz efetiva (create/edit).';

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_meta_listar(p_ref_mes date)
RETURNS TABLE (area_key text, status text, aprovado_em timestamptz, aprovado_por uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_gestao_escala', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'rh_gestao_escala'
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.area_key, s.status, s.aprovado_em, s.aprovado_por
  FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref;
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_meta_listar(date) IS
  'Lista status/aprovação da grade por área para o mês. Requer rh_gestao_escala efetivo ou admin.';

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_aprovar(p_ref_mes date, p_area_key text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  v_ok_perm boolean;
  v_now timestamptz := now();
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.role = 'admin'
  )
  OR (
    public._prestador_page_perm('rh_gestao_escala', 'create')
    OR public._prestador_page_perm('rh_gestao_escala', 'edit')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = v_uid
      AND p.role IS DISTINCT FROM 'prestador'
      AND rp.page_key = 'rh_gestao_escala'
      AND (
        rp.can_criar IN ('sim', 'proprios')
        OR rp.can_editar IN ('sim', 'proprios')
      )
  )
  INTO v_ok_perm;

  IF NOT v_ok_perm THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_area');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_grade');
  END IF;

  INSERT INTO public.rh_gestao_escala_grade_status (ref_mes, area_key, status, aprovado_em, aprovado_por)
  VALUES (v_ref, v_area, 'aprovada', v_now, v_uid)
  ON CONFLICT (ref_mes, area_key) DO UPDATE SET
    status = 'aprovada',
    aprovado_em = v_now,
    aprovado_por = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'aprovado_em', v_now::text,
    'aprovado_por', v_uid::text
  );
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_aprovar(date, text) IS
  'Marca a grade do mês/área como aprovada. Prestador exige matriz efetiva (create/edit).';

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_resetar(p_ref_mes date, p_area_key text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  v_ok_perm boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR (
    public._prestador_page_perm('rh_gestao_escala', 'create')
    OR public._prestador_page_perm('rh_gestao_escala', 'edit')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND p.role IS DISTINCT FROM 'prestador'
      AND rp.page_key = 'rh_gestao_escala'
      AND (
        rp.can_criar IN ('sim', 'proprios')
        OR rp.can_editar IN ('sim', 'proprios')
      )
  )
  INTO v_ok_perm;

  IF NOT v_ok_perm THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_area');
  END IF;

  DELETE FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref AND s.area_key = v_area;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_resetar(date, text) IS
  'Remove células e meta da grade do mês/área. Prestador exige matriz efetiva (create/edit).';

CREATE OR REPLACE FUNCTION public.rh_calendario_grade_escala_mes(p_ref_mes date)
RETURNS TABLE (funcionario_id uuid, dia_iso date, valor text, area_key text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_ok boolean;
  v_calendario_proprios boolean := false;
  v_meu_funcionario_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_calendario', 'view')
    OR public._prestador_page_perm('rh_gestao_escala', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key IN ('rh_calendario', 'rh_gestao_escala')
        AND rp.can_view IN ('sim', 'proprios')
    )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    SELECT (rp.can_view = 'proprios')
    INTO v_calendario_proprios
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND rp.page_key = 'rh_calendario'
      AND (
        p.role IS DISTINCT FROM 'prestador'
        OR public._prestador_page_perm('rh_calendario', 'view')
      )
    LIMIT 1;
    v_calendario_proprios := coalesce(v_calendario_proprios, false);
  END IF;

  IF coalesce(v_calendario_proprios, false) THEN
    SELECT f.id
    INTO v_meu_funcionario_id
    FROM public.rh_funcionarios f
    INNER JOIN public.profiles p ON p.id = auth.uid()
    WHERE f.status IN ('ativo', 'indisponivel')
      AND (
        lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
        OR (
          trim(coalesce(f.email_spin, '')) <> ''
          AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
        )
      )
    ORDER BY f.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_meu_funcionario_id IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT g.funcionario_id, g.dia_iso, g.valor, g.area_key
  FROM public.rh_gestao_escala_grade g
  INNER JOIN public.rh_gestao_escala_grade_status s
    ON s.ref_mes = g.ref_mes
    AND s.area_key = g.area_key
    AND s.status = 'aprovada'
  WHERE g.ref_mes = v_ref
    AND (
      NOT coalesce(v_calendario_proprios, false)
      OR g.funcionario_id = v_meu_funcionario_id
    );
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_escala_mes(date) IS
  'Calendário RH: células da grade do mês só para combinações mês/área com status aprovada. Prestador exige matriz efetiva por página.';

CREATE OR REPLACE FUNCTION public.rh_calendario_grade_colega_mes(
  p_ref_mes date,
  p_outro_funcionario_id uuid
)
RETURNS TABLE (dia_iso date, valor text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_me uuid;
  v_colega_ok boolean;
  v_ref date := date_trunc('month', p_ref_mes)::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'rh_calendario'
        AND rp.can_view = 'proprios'
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'prestador')
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_calendario'
          AND rp.can_view = 'proprios'
      )
      AND EXISTS (
        SELECT 1
        FROM public.user_scopes s
        INNER JOIN public.prestador_tipo_pages ptp
          ON ptp.prestador_tipo_slug = s.scope_ref AND ptp.page_key = 'rh_calendario'
        WHERE s.user_id = auth.uid() AND s.scope_type = 'prestador_tipo'
      )
    )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN;
  END IF;

  SELECT f.id
  INTO v_me
  FROM public.rh_funcionarios f
  INNER JOIN public.profiles p ON p.id = auth.uid()
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
      OR (
        trim(coalesce(f.email_spin, '')) <> ''
        AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
      )
    )
  ORDER BY f.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_me IS NULL THEN
    RETURN;
  END IF;

  IF p_outro_funcionario_id = v_me THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.rh_funcionarios me
    INNER JOIN public.rh_funcionarios outro ON outro.id = p_outro_funcionario_id
      AND outro.status IN ('ativo', 'indisponivel')
    WHERE me.id = v_me
      AND me.org_time_id IS NOT NULL
      AND me.org_time_id = outro.org_time_id
      AND coalesce(trim(me.staff_operadora_slug), '') <> ''
      AND trim(me.staff_operadora_slug) = trim(outro.staff_operadora_slug)
  )
  INTO v_colega_ok;

  IF NOT coalesce(v_colega_ok, false) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT g.dia_iso, g.valor
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref
    AND g.funcionario_id = p_outro_funcionario_id;
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_colega_mes(date, uuid) IS
  'Calendário (prestador): grade do colega — exige rh_calendario can_view=proprios efetivo (role_permissions ∩ prestador_tipo_pages).';

REVOKE ALL ON FUNCTION public.rh_escala_prestadores_times() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_prestadores_times() TO authenticated;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_carregar(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_carregar(date, text) TO authenticated;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_salvar(date, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_salvar(date, text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_meta_listar(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_meta_listar(date) TO authenticated;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_aprovar(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_aprovar(date, text) TO authenticated;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_resetar(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_resetar(date, text) TO authenticated;

REVOKE ALL ON FUNCTION public.rh_calendario_grade_escala_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_escala_mes(date) TO authenticated;

REVOKE ALL ON FUNCTION public.rh_calendario_grade_colega_mes(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_colega_mes(date, uuid) TO authenticated;

COMMIT;
