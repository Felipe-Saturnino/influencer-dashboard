-- Paridade Gestor: RLS e RPCs espelham a app — role_permissions ∩ gestor_tipo_pages (user_scopes gestor_tipo).
-- Exceção: home, configuracoes, ajuda só role_permissions (sem interseção com gestor_tipo_pages).

BEGIN;

-- ─── Helpers Gestor (SECURITY DEFINER: leitura consistente de gestor_tipo_pages / user_scopes) ─

CREATE OR REPLACE FUNCTION public._gestor_page_perm(p_page_key text, p_need text)
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

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'gestor') THEN
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
    WHERE s.user_id = uid AND s.scope_type = 'gestor_tipo'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_scopes s
    INNER JOIN public.gestor_tipo_pages gtp
      ON gtp.gestor_tipo_slug = s.scope_ref AND gtp.page_key = p_page_key
    WHERE s.user_id = uid AND s.scope_type = 'gestor_tipo'
  );
END;
$$;

REVOKE ALL ON FUNCTION public._gestor_page_perm(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._gestor_page_perm(text, text) TO authenticated;

COMMENT ON FUNCTION public._gestor_page_perm(text, text) IS
  'Gestor: permissão efetiva = role_permissions ∩ união(gestor_tipo_pages); páginas home/configuracoes/ajuda só role_permissions.';

-- ─── Permissões RH / Mesas (role gestor isolado; demais roles via JOIN existente) ─

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
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
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
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
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
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
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
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
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
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
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
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
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

-- ─── Figurinos: overload com p_need (cadastro vs mutação) ─

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
  'Figurinos: admin; gestor com rh_figurinos efetivo; executivo se role_permissions; demais via user_scopes operadora.';
COMMENT ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid, text) IS
  'Figurinos: acesso à peça por nível (view/edit/delete para gestor via matriz); executivo com qualquer ação em rh_figurinos.';

DROP POLICY IF EXISTS rh_figurino_pecas_select_scope ON public.rh_figurino_pecas;
CREATE POLICY rh_figurino_pecas_select_scope
  ON public.rh_figurino_pecas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('rh_figurinos', 'view')
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

-- ─── RPC Figurinos (mutações checam edit/delete/create conforme Gestão de Usuários) ─

CREATE OR REPLACE FUNCTION public.rh_figurino_criar_peca(
  p_operadora_slugs text[],
  p_category text,
  p_size text,
  p_purchase_date date,
  p_description text,
  p_actor text
)
RETURNS public.rh_figurino_pecas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code   text;
  v_bar    text;
  v_tries  int := 0;
  v_row    public.rh_figurino_pecas%ROWTYPE;
  v_slug   text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF p_operadora_slugs IS NULL OR cardinality(p_operadora_slugs) = 0 THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF trim(coalesce(p_category, '')) = '' OR trim(coalesce(p_size, '')) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF p_purchase_date IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  FOREACH v_slug IN ARRAY p_operadora_slugs
  LOOP
    v_slug := trim(v_slug);
    IF v_slug = '' THEN
      RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
    END IF;
    IF NOT public._rh_figurino_auth_can_slug(v_slug, 'create') THEN
      RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  v_code := 'FIG-' || lpad(nextval('public.rh_figurino_code_seq')::text, 6, '0');

  LOOP
    v_bar := lpad((floor(random() * 1e12)::bigint)::text, 12, '0');
    v_tries := v_tries + 1;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rh_figurino_pecas p WHERE p.barcode = v_bar);
    EXIT WHEN v_tries >= 25;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.rh_figurino_pecas p WHERE p.barcode = v_bar) THEN
    RAISE EXCEPTION 'rh_figurino_barcode_collision' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.rh_figurino_pecas (
    code, barcode, name, category, size, description,
    purchase_date, status, condition
  ) VALUES (
    v_code, v_bar, v_code, trim(p_category), trim(p_size),
    nullif(trim(coalesce(p_description, '')), ''),
    p_purchase_date, 'available', 'good'
  )
  RETURNING * INTO v_row;

  INSERT INTO public.rh_figurino_peca_operadoras (peca_id, operadora_slug)
  SELECT DISTINCT v_row.id, trim(both from s.slug)
  FROM unnest(p_operadora_slugs) AS s(slug);

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (v_row.id, NULL, 'available', coalesce(nullif(trim(p_actor), ''), 'sistema'), 'Cadastro');

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_figurino_registrar_emprestimo(
  p_item_id uuid,
  p_borrower_name text,
  p_borrower_ref text,
  p_withdrawal_type text,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
  v_wd text := lower(trim(coalesce(p_withdrawal_type, '')));
  v_actor text := coalesce(nullif(trim(p_actor), ''), 'sistema');
  v_note text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF trim(coalesce(p_borrower_name, '')) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF v_wd NOT IN ('emprestar', 'fixo') THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id, 'edit') THEN
    RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
  END IF;
  IF peca.status <> 'available' THEN
    RAISE EXCEPTION 'rh_figurino_not_available' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rh_figurino_emprestimos e WHERE e.item_id = peca.id AND e.status = 'active') THEN
    RAISE EXCEPTION 'rh_figurino_already_borrowed' USING ERRCODE = 'P0001';
  END IF;

  v_note := CASE WHEN v_wd = 'fixo' THEN 'Retirada (fixo)' ELSE 'Retirada (emprestar)' END;

  INSERT INTO public.rh_figurino_emprestimos (item_id, borrower_name, borrower_ref, loaned_by, status, withdrawal_type)
  VALUES (
    peca.id,
    trim(p_borrower_name),
    nullif(trim(coalesce(p_borrower_ref, '')), ''),
    v_actor,
    'active',
    v_wd
  );

  UPDATE public.rh_figurino_pecas SET status = 'borrowed' WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'borrowed', v_actor, v_note);
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_figurino_enviar_manutencao(
  p_item_id uuid,
  p_tipo text,
  p_motivo text,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
  v_actor text := coalesce(nullif(trim(p_actor), ''), 'sistema');
  v_tipo text := lower(trim(coalesce(p_tipo, '')));
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_label text;
  v_reason text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001'; END IF;
  IF v_motivo = '' THEN RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001'; END IF;
  IF v_tipo NOT IN ('costura', 'lavagem', 'perda', 'descarte') THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  v_label := CASE v_tipo
    WHEN 'costura' THEN 'Costura'
    WHEN 'lavagem' THEN 'Lavagem'
    WHEN 'perda' THEN 'Perda'
    WHEN 'descarte' THEN 'Descarte'
    ELSE v_tipo
  END;
  v_reason := v_label || ' — ' || v_motivo;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001'; END IF;

  IF v_tipo IN ('perda', 'descarte') THEN
    IF NOT public._rh_figurino_user_can_access_peca_id(peca.id, 'delete') THEN
      RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF NOT public._rh_figurino_user_can_access_peca_id(peca.id, 'edit') THEN
      RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF peca.status <> 'available' THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  IF v_tipo IN ('costura', 'lavagem') THEN
    UPDATE public.rh_figurino_pecas
    SET
      status = 'maintenance',
      maintenance_reason = v_reason,
      maintenance_entered_at = now(),
      maintenance_entered_by = v_actor
    WHERE id = peca.id;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (peca.id, peca.status, 'maintenance', v_actor, v_reason);
  ELSE
    UPDATE public.rh_figurino_pecas
    SET
      status = 'discarded',
      discarded_at = now(),
      discard_reason = v_reason,
      discarded_by = v_actor,
      maintenance_reason = NULL,
      maintenance_entered_at = NULL,
      maintenance_entered_by = NULL
    WHERE id = peca.id;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (peca.id, peca.status, 'discarded', v_actor, v_reason);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_figurino_registrar_devolucao(
  p_item_id uuid,
  p_fluxo text,
  p_observacoes text,
  p_manut_tipo text,
  p_manut_motivo text,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
  emp  public.rh_figurino_emprestimos%ROWTYPE;
  v_actor text := coalesce(nullif(trim(p_actor), ''), 'sistema');
  v_fluxo text := lower(trim(coalesce(p_fluxo, '')));
  v_obs text := nullif(trim(coalesce(p_observacoes, '')), '');
  v_mt text := lower(trim(coalesce(p_manut_tipo, '')));
  v_mm text := trim(coalesce(p_manut_motivo, ''));
  v_label text;
  v_reason text;
  v_new_status text;
  v_hist_notes text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF v_fluxo NOT IN ('disponivel_bom', 'disponivel_possivel_descarte', 'manutencao') THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  IF v_fluxo = 'manutencao' THEN
    IF v_mt NOT IN ('costura', 'lavagem', 'perda', 'descarte') OR v_mm = '' THEN
      RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_fluxo IN ('disponivel_bom', 'disponivel_possivel_descarte') THEN
    IF NOT public._rh_figurino_user_can_access_peca_id(peca.id, 'edit') THEN
      RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_fluxo = 'manutencao' AND v_mt IN ('perda', 'descarte') THEN
    IF NOT public._rh_figurino_user_can_access_peca_id(peca.id, 'delete') THEN
      RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF NOT public._rh_figurino_user_can_access_peca_id(peca.id, 'edit') THEN
      RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF peca.status <> 'borrowed' THEN
    RAISE EXCEPTION 'rh_figurino_not_borrowed' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO emp
  FROM public.rh_figurino_emprestimos
  WHERE item_id = peca.id AND status = 'active'
  ORDER BY loaned_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rh_figurino_no_active_loan' USING ERRCODE = 'P0001';
  END IF;

  IF v_fluxo = 'disponivel_bom' THEN
    UPDATE public.rh_figurino_emprestimos
    SET
      returned_at = now(),
      return_condition = 'good',
      return_notes = v_obs,
      returned_by = v_actor,
      status = 'returned'
    WHERE id = emp.id;

    UPDATE public.rh_figurino_pecas
    SET status = 'available', condition = 'good'
    WHERE id = peca.id;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (
      peca.id,
      peca.status,
      'available',
      v_actor,
      'Devolução: boa condição' || CASE WHEN v_obs IS NOT NULL THEN ' · ' || v_obs ELSE '' END
    );

  ELSIF v_fluxo = 'disponivel_possivel_descarte' THEN
    UPDATE public.rh_figurino_emprestimos
    SET
      returned_at = now(),
      return_condition = 'damaged',
      return_notes = v_obs,
      returned_by = v_actor,
      status = 'returned'
    WHERE id = emp.id;

    UPDATE public.rh_figurino_pecas
    SET status = 'available', condition = 'damaged'
    WHERE id = peca.id;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (
      peca.id,
      peca.status,
      'available',
      v_actor,
      'Devolução: possível descarte' || CASE WHEN v_obs IS NOT NULL THEN ' · ' || v_obs ELSE '' END
    );

  ELSE
    v_label := CASE v_mt
      WHEN 'costura' THEN 'Costura'
      WHEN 'lavagem' THEN 'Lavagem'
      WHEN 'perda' THEN 'Perda'
      WHEN 'descarte' THEN 'Descarte'
      ELSE v_mt
    END;
    v_reason := v_label || ' — ' || v_mm;
    v_hist_notes := 'Devolução (manutenção): ' || v_reason || CASE WHEN v_obs IS NOT NULL THEN ' · Obs.: ' || v_obs ELSE '' END;

    UPDATE public.rh_figurino_emprestimos
    SET
      returned_at = now(),
      return_condition = 'damaged',
      return_notes = coalesce(v_obs, v_reason),
      returned_by = v_actor,
      status = 'returned'
    WHERE id = emp.id;

    IF v_mt IN ('costura', 'lavagem') THEN
      v_new_status := 'maintenance';
      UPDATE public.rh_figurino_pecas
      SET
        status = 'maintenance',
        condition = peca.condition,
        maintenance_reason = v_reason,
        maintenance_entered_at = now(),
        maintenance_entered_by = v_actor
      WHERE id = peca.id;
    ELSE
      v_new_status := 'discarded';
      UPDATE public.rh_figurino_pecas
      SET
        status = 'discarded',
        discarded_at = now(),
        discard_reason = v_reason,
        discarded_by = v_actor,
        maintenance_reason = NULL,
        maintenance_entered_at = NULL,
        maintenance_entered_by = NULL
      WHERE id = peca.id;
    END IF;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (peca.id, peca.status, v_new_status, v_actor, v_hist_notes);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_figurino_concluir_manutencao(
  p_item_id uuid,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001'; END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id, 'edit') THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
  IF peca.status <> 'maintenance' THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  UPDATE public.rh_figurino_pecas
  SET
    status = 'available',
    maintenance_reason = NULL,
    maintenance_entered_at = NULL,
    maintenance_entered_by = NULL
  WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'available', coalesce(nullif(trim(p_actor), ''), 'sistema'), 'Manutenção concluída');
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_figurino_descartar(
  p_item_id uuid,
  p_motivo text,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001'; END IF;
  IF trim(coalesce(p_motivo, '')) = '' THEN RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001'; END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id, 'delete') THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
  IF peca.status NOT IN ('available', 'maintenance') THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  UPDATE public.rh_figurino_pecas
  SET
    status = 'discarded',
    discarded_at = now(),
    discard_reason = trim(p_motivo),
    discarded_by = coalesce(nullif(trim(p_actor), ''), 'sistema')
  WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'discarded', coalesce(nullif(trim(p_actor), ''), 'sistema'), trim(p_motivo));
END;
$$;

-- ─── Banca de jogo ─

DROP POLICY IF EXISTS "banca_jogo_select_admin_gestor" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_select_admin_gestor"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'view')
  );

DROP POLICY IF EXISTS "banca_jogo_update_staff" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_update_staff"
  ON public.banca_jogo_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'edit')
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
    OR public._gestor_page_perm('banca_jogo', 'edit')
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
    OR public._gestor_page_perm('banca_jogo', 'delete')
  );

-- ─── Playbook / guia confirmações (auditoria staff) ─

DROP POLICY IF EXISTS "Admin gestor executivo leem guia_confirmacoes" ON public.guia_confirmacoes;
CREATE POLICY "Admin gestor executivo leem guia_confirmacoes"
  ON public.guia_confirmacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo'))
    OR public._gestor_page_perm('playbook_influencers', 'view')
  );

-- ─── Roteiro mesa: campanhas e sugestões (gestor por permissão; evita duplicar gestor na política operador/executivo) ─

DROP POLICY IF EXISTS "Gestor pode tudo em roteiro_mesa_campanhas" ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_select
  ON public.roteiro_mesa_campanhas FOR SELECT TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'view'));

CREATE POLICY roteiro_mesa_campanhas_gestor_insert
  ON public.roteiro_mesa_campanhas FOR INSERT TO authenticated
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'create'));

CREATE POLICY roteiro_mesa_campanhas_gestor_update
  ON public.roteiro_mesa_campanhas FOR UPDATE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'edit'))
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'edit'));

CREATE POLICY roteiro_mesa_campanhas_gestor_delete
  ON public.roteiro_mesa_campanhas FOR DELETE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'delete'));

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

DROP POLICY IF EXISTS "Gestor pode tudo em roteiro_mesa_sugestoes" ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_select
  ON public.roteiro_mesa_sugestoes FOR SELECT TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'view'));

CREATE POLICY roteiro_mesa_sugestoes_gestor_insert
  ON public.roteiro_mesa_sugestoes FOR INSERT TO authenticated
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'create'));

CREATE POLICY roteiro_mesa_sugestoes_gestor_update
  ON public.roteiro_mesa_sugestoes FOR UPDATE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'edit'))
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'edit'));

CREATE POLICY roteiro_mesa_sugestoes_gestor_delete
  ON public.roteiro_mesa_sugestoes FOR DELETE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'delete'));

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

-- ─── Threads roteiro mesa / campanha / dealers ─

DROP POLICY IF EXISTS "roteiro_mesa_sol_select_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_select_staff"
  ON public.roteiro_mesa_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('roteiro_mesa', 'view')
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
      OR public._gestor_page_perm('roteiro_mesa', 'create')
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
    OR public._gestor_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view')
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
              OR public._gestor_page_perm('roteiro_mesa', 'create')
              OR public._gestor_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view')
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

-- roteiro campanha solicitações

DROP POLICY IF EXISTS "roteiro_camp_sol_select_staff" ON public.roteiro_campanha_solicitacoes;
CREATE POLICY "roteiro_camp_sol_select_staff"
  ON public.roteiro_campanha_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('roteiro_mesa', 'view')
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
      OR public._gestor_page_perm('roteiro_mesa', 'create')
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
    OR public._gestor_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view')
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
              OR public._gestor_page_perm('roteiro_mesa', 'create')
              OR public._gestor_page_perm('roteiro_mesa', 'edit')
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
          OR public._gestor_page_perm('roteiro_mesa', 'view')
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
    OR public._gestor_page_perm('gestao_dealers', 'view')
  );

DROP POLICY IF EXISTS "dealer_sol_update_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_update_staff"
  ON public.dealer_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('gestao_dealers', 'edit')
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
          OR public._gestor_page_perm('gestao_dealers', 'view')
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
              OR public._gestor_page_perm('gestao_dealers', 'create')
              OR public._gestor_page_perm('gestao_dealers', 'edit')
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
          OR public._gestor_page_perm('gestao_dealers', 'view')
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
