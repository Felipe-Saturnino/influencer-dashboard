-- Executivo: sem escopo por operadora na app — vê dados de todas as operadoras quando
-- role_permissions.can_view permite a página. Mesas Spin + Figurinos alinhados.

BEGIN;

CREATE OR REPLACE FUNCTION public._executivo_role_permissions_can_view(p_page_key text)
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
      AND p.role = 'executivo'
      AND rp.page_key = p_page_key
      AND rp.can_view IN ('sim', 'proprios')
  );
$$;

REVOKE ALL ON FUNCTION public._executivo_role_permissions_can_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._executivo_role_permissions_can_view(text) TO authenticated;

COMMENT ON FUNCTION public._executivo_role_permissions_can_view(text) IS
  'Executivo: Ver efetivo conforme Gestão de Usuários (role_permissions), sem user_scopes operadora.';

-- Para RPCs SECURITY DEFINER de figurinos: alguma ação permitida na página (evita bypass sem linha em role_permissions).
CREATE OR REPLACE FUNCTION public._executivo_role_permissions_figurinos_any_action()
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
      AND p.role = 'executivo'
      AND rp.page_key = 'rh_figurinos'
      AND (
        rp.can_view IN ('sim', 'proprios')
        OR rp.can_criar IN ('sim', 'proprios')
        OR rp.can_editar IN ('sim', 'proprios')
        OR rp.can_excluir IN ('sim', 'proprios')
      )
  );
$$;

REVOKE ALL ON FUNCTION public._executivo_role_permissions_figurinos_any_action() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._executivo_role_permissions_figurinos_any_action() TO authenticated;

-- Gestão de Mesas: escopo por slug — executivo ignora user_scopes (permissões já em _mesas_spin_cadastro_perm).
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

-- Figurinos: executivo não exige user_scopes por slug; perfis com escopo continuam restritos.
CREATE OR REPLACE FUNCTION public._rh_figurino_auth_can_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
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

CREATE OR REPLACE FUNCTION public._rh_figurino_user_can_access_peca_id(p_peca_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
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

DROP POLICY IF EXISTS rh_figurino_pecas_select_scope ON public.rh_figurino_pecas;
CREATE POLICY rh_figurino_pecas_select_scope
  ON public.rh_figurino_pecas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
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
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
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
          EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor'))
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
          EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor'))
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

COMMENT ON FUNCTION public._rh_figurino_auth_can_slug(text) IS
  'Figurinos: admin/gestor global; executivo se role_permissions rh_figurinos; demais via user_scopes operadora.';
COMMENT ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid) IS
  'Figurinos: admin/gestor; executivo com permissão na página; demais junction ∩ user_scopes.';

COMMIT;
