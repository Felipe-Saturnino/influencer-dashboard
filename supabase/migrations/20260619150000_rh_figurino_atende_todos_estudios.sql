-- Figurinos: peças que atendem a qualquer estúdio (`atende_todos_estudios`).

BEGIN;

ALTER TABLE public.rh_figurino_pecas
  ADD COLUMN IF NOT EXISTS atende_todos_estudios boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rh_figurino_pecas.atende_todos_estudios IS
  'Quando true, a peça está disponível em qualquer estúdio ativo (sem N:N por slug).';

CREATE OR REPLACE FUNCTION public._rh_figurino_auth_can_criar_peca()
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
      OR public._gestor_page_perm('rh_figurinos', 'create')
      OR public._prestador_page_perm('rh_figurinos', 'create')
      OR public._role_permissions_sem_escopo_page_perm('rh_figurinos', 'create')
    );
$$;

REVOKE ALL ON FUNCTION public._rh_figurino_auth_can_criar_peca() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_figurino_auth_can_criar_peca() TO authenticated;

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
        AND (
          EXISTS (
            SELECT 1
            FROM public.rh_figurino_pecas pe
            WHERE pe.id = p_peca_id
              AND pe.atende_todos_estudios = true
          )
          OR EXISTS (
            SELECT 1
            FROM public.rh_figurino_peca_estudios je
            INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = je.estudio_slug
            INNER JOIN public.user_scopes s
              ON s.user_id = auth.uid()
             AND s.scope_type = 'operadora'
             AND s.scope_ref = eo.operadora_slug
            WHERE je.peca_id = p_peca_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.rh_figurino_peca_operadoras j
            INNER JOIN public.user_scopes s
              ON s.user_id = auth.uid()
             AND s.scope_type = 'operadora'
             AND s.scope_ref = j.operadora_slug
            WHERE j.peca_id = p_peca_id
          )
        )
      )
    );
$$;

DROP FUNCTION IF EXISTS public.rh_figurino_criar_peca(text[], text, text, date, text, text);

CREATE OR REPLACE FUNCTION public.rh_figurino_criar_peca(
  p_estudio_slugs text[],
  p_category text,
  p_size text,
  p_purchase_date date,
  p_description text,
  p_actor text,
  p_atende_todos_estudios boolean DEFAULT false
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
  IF trim(coalesce(p_category, '')) = '' OR trim(coalesce(p_size, '')) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF p_purchase_date IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  IF coalesce(p_atende_todos_estudios, false) THEN
    IF NOT public._rh_figurino_auth_can_criar_peca() THEN
      RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF p_estudio_slugs IS NULL OR cardinality(p_estudio_slugs) = 0 THEN
      RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
    END IF;
    FOREACH v_slug IN ARRAY p_estudio_slugs
    LOOP
      v_slug := trim(v_slug);
      IF v_slug = '' THEN
        RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
      END IF;
      IF NOT public._rh_figurino_auth_can_estudio_slug(v_slug, 'create') THEN
        RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
      END IF;
    END LOOP;
  END IF;

  v_code := public._rh_figurino_next_category_code(p_category, true);

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
    purchase_date, status, condition, atende_todos_estudios
  ) VALUES (
    v_code, v_bar, v_code, trim(p_category), trim(p_size),
    nullif(trim(coalesce(p_description, '')), ''),
    p_purchase_date, 'available', 'good', coalesce(p_atende_todos_estudios, false)
  )
  RETURNING * INTO v_row;

  IF coalesce(p_atende_todos_estudios, false) THEN
    INSERT INTO public.rh_figurino_peca_operadoras (peca_id, operadora_slug)
    SELECT DISTINCT v_row.id, eo.operadora_slug
    FROM public.estudios_spin e
    INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = e.slug
    WHERE e.ativo = true
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.rh_figurino_peca_estudios (peca_id, estudio_slug)
    SELECT DISTINCT v_row.id, trim(both from s.slug)
    FROM unnest(p_estudio_slugs) AS s(slug)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.rh_figurino_peca_operadoras (peca_id, operadora_slug)
    SELECT DISTINCT v_row.id, eo.operadora_slug
    FROM unnest(p_estudio_slugs) AS s(slug)
    INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = trim(both from s.slug)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (
    v_row.id, NULL, 'available',
    coalesce(nullif(trim(p_actor), ''), 'sistema'),
    CASE WHEN coalesce(p_atende_todos_estudios, false) THEN 'Cadastro — todos os estúdios' ELSE 'Cadastro' END
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, date, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, date, text, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, date, text, text, boolean) IS
  'Cadastra peça de figurino; p_atende_todos_estudios=true dispensa slugs e vincula operadoras de todos os estúdios ativos.';

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
      AND (
        rh_figurino_pecas.atende_todos_estudios = true
        OR EXISTS (
          SELECT 1
          FROM public.rh_figurino_peca_estudios je
          INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = je.estudio_slug
          WHERE je.peca_id = rh_figurino_pecas.id
            AND eo.operadora_slug IN (
              SELECT s.scope_ref FROM public.user_scopes s
              WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.rh_figurino_peca_operadoras j
          WHERE j.peca_id = rh_figurino_pecas.id
            AND j.operadora_slug IN (
              SELECT s.scope_ref FROM public.user_scopes s
              WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
            )
        )
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
            AND (
              p.atende_todos_estudios = true
              OR EXISTS (
                SELECT 1
                FROM public.rh_figurino_peca_estudios je
                INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = je.estudio_slug
                WHERE je.peca_id = p.id
                  AND eo.operadora_slug IN (
                    SELECT s.scope_ref FROM public.user_scopes s
                    WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
                  )
              )
              OR EXISTS (
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
            AND (
              p.atende_todos_estudios = true
              OR EXISTS (
                SELECT 1
                FROM public.rh_figurino_peca_estudios je
                INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = je.estudio_slug
                WHERE je.peca_id = p.id
                  AND eo.operadora_slug IN (
                    SELECT s.scope_ref FROM public.user_scopes s
                    WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
                  )
              )
              OR EXISTS (
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
    )
  );

COMMIT;
