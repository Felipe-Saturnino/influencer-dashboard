-- ─── Figurinos: várias operadoras por peça; remove cor/preço; novo cadastro ───

BEGIN;

-- ─── Tabela N:N ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rh_figurino_peca_operadoras (
  peca_id         uuid NOT NULL REFERENCES public.rh_figurino_pecas (id) ON DELETE CASCADE,
  operadora_slug  text NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  PRIMARY KEY (peca_id, operadora_slug)
);

CREATE INDEX IF NOT EXISTS idx_rh_figurino_po_slug ON public.rh_figurino_peca_operadoras (operadora_slug);

INSERT INTO public.rh_figurino_peca_operadoras (peca_id, operadora_slug)
SELECT p.id, p.operadora_slug
FROM public.rh_figurino_pecas p
WHERE NOT EXISTS (
  SELECT 1 FROM public.rh_figurino_peca_operadoras x WHERE x.peca_id = p.id AND x.operadora_slug = p.operadora_slug
)
ON CONFLICT DO NOTHING;

-- ─── Políticas antigas (dependem de pecas.operadora_slug) ────────────────────
DROP POLICY IF EXISTS rh_figurino_pecas_select_scope ON public.rh_figurino_pecas;
DROP POLICY IF EXISTS rh_figurino_emp_select ON public.rh_figurino_emprestimos;
DROP POLICY IF EXISTS rh_figurino_hist_select ON public.rh_figurino_status_history;

DROP FUNCTION IF EXISTS public.rh_figurino_criar_peca(text, text, text, text, text, text, date, numeric, text);
DROP FUNCTION IF EXISTS public.rh_figurino_registrar_emprestimo(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.rh_figurino_registrar_devolucao(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.rh_figurino_enviar_manutencao(uuid, text, text);
DROP FUNCTION IF EXISTS public.rh_figurino_concluir_manutencao(uuid, text);
DROP FUNCTION IF EXISTS public.rh_figurino_descartar(uuid, text, text);

DROP INDEX IF EXISTS public.idx_rh_figurino_pecas_operadora;

ALTER TABLE public.rh_figurino_pecas DROP COLUMN IF EXISTS operadora_slug;
ALTER TABLE public.rh_figurino_pecas DROP COLUMN IF EXISTS color;
ALTER TABLE public.rh_figurino_pecas DROP COLUMN IF EXISTS purchase_price;

-- ─── Acesso a uma peça (qualquer operadora vinculada no escopo) ─────────────
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
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('executivo', 'operador'))
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

REVOKE ALL ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_figurino_user_can_access_peca_id(uuid) TO authenticated;

-- ─── Próximo código (pré-visualização, sem consumir a sequência) ────────────
CREATE OR REPLACE FUNCTION public.rh_figurino_preview_proximo_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'FIG-' || lpad(
    (CASE WHEN NOT is_called THEN last_value ELSE last_value + 1 END)::text,
    6,
    '0'
  )
  FROM public.rh_figurino_code_seq;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_preview_proximo_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_preview_proximo_code() TO authenticated;

-- ─── RPC: criar peça (N operadoras; nome = código; data entrada obrigatória) ─
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
    IF NOT public._rh_figurino_auth_can_slug(v_slug) THEN
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

REVOKE ALL ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, date, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_figurino_registrar_emprestimo(
  p_item_id uuid,
  p_borrower_name text,
  p_borrower_ref text,
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF trim(p_borrower_name) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN
    RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
  END IF;
  IF peca.status <> 'available' THEN
    RAISE EXCEPTION 'rh_figurino_not_available' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rh_figurino_emprestimos e WHERE e.item_id = peca.id AND e.status = 'active') THEN
    RAISE EXCEPTION 'rh_figurino_already_borrowed' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.rh_figurino_emprestimos (item_id, borrower_name, borrower_ref, loaned_by, status)
  VALUES (
    peca.id,
    trim(p_borrower_name),
    nullif(trim(coalesce(p_borrower_ref, '')), ''),
    coalesce(nullif(trim(p_actor), ''), 'sistema'),
    'active'
  );

  UPDATE public.rh_figurino_pecas SET status = 'borrowed' WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'borrowed', coalesce(nullif(trim(p_actor), ''), 'sistema'), 'Empréstimo');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_registrar_emprestimo(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_registrar_emprestimo(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_figurino_registrar_devolucao(
  p_item_id uuid,
  p_return_condition text,
  p_notes text,
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
  v_new_status text;
  v_new_condition text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF p_return_condition IS NULL OR p_return_condition NOT IN ('good', 'needs_cleaning', 'damaged') THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF p_return_condition <> 'good' AND coalesce(trim(p_notes), '') = '' THEN
    RAISE EXCEPTION 'rh_figurino_notes_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN
    RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
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

  IF p_return_condition = 'good' THEN
    v_new_status := 'available';
    v_new_condition := 'good';
  ELSIF p_return_condition = 'needs_cleaning' THEN
    v_new_status := 'maintenance';
    v_new_condition := peca.condition;
  ELSE
    v_new_status := 'maintenance';
    v_new_condition := 'damaged';
  END IF;

  UPDATE public.rh_figurino_emprestimos
  SET
    returned_at = now(),
    return_condition = p_return_condition,
    return_notes = nullif(trim(p_notes), ''),
    returned_by = coalesce(nullif(trim(p_actor), ''), 'sistema'),
    status = 'returned'
  WHERE id = emp.id;

  UPDATE public.rh_figurino_pecas
  SET
    status = v_new_status,
    condition = v_new_condition,
    maintenance_reason = CASE WHEN v_new_status = 'maintenance' THEN coalesce(nullif(trim(p_notes), ''), peca.maintenance_reason) ELSE peca.maintenance_reason END,
    maintenance_entered_at = CASE WHEN v_new_status = 'maintenance' AND peca.status <> 'maintenance' THEN now() ELSE peca.maintenance_entered_at END
  WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (
    peca.id,
    peca.status,
    v_new_status,
    coalesce(nullif(trim(p_actor), ''), 'sistema'),
    'Devolução: ' || p_return_condition
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_registrar_devolucao(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_registrar_devolucao(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_figurino_enviar_manutencao(
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
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
  IF peca.status <> 'available' THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  UPDATE public.rh_figurino_pecas
  SET
    status = 'maintenance',
    maintenance_reason = trim(p_motivo),
    maintenance_entered_at = now()
  WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'maintenance', coalesce(nullif(trim(p_actor), ''), 'sistema'), trim(p_motivo));
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_enviar_manutencao(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_enviar_manutencao(uuid, text, text) TO authenticated;

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
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
  IF peca.status <> 'maintenance' THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  UPDATE public.rh_figurino_pecas
  SET status = 'available', maintenance_reason = NULL, maintenance_entered_at = NULL
  WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'available', coalesce(nullif(trim(p_actor), ''), 'sistema'), 'Manutenção concluída');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_concluir_manutencao(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_concluir_manutencao(uuid, text) TO authenticated;

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
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
  IF peca.status NOT IN ('available', 'maintenance') THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  UPDATE public.rh_figurino_pecas
  SET
    status = 'discarded',
    discarded_at = now(),
    discard_reason = trim(p_motivo)
  WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'discarded', coalesce(nullif(trim(p_actor), ''), 'sistema'), trim(p_motivo));
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_descartar(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_descartar(uuid, text, text) TO authenticated;

-- ─── RLS pecas (via N:N) ─────────────────────────────────────────────────────
CREATE POLICY rh_figurino_pecas_select_scope
  ON public.rh_figurino_pecas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('executivo', 'operador'))
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

-- ─── RLS junction ─────────────────────────────────────────────────────────────
ALTER TABLE public.rh_figurino_peca_operadoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_figurino_po_select
  ON public.rh_figurino_peca_operadoras FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('executivo', 'operador'))
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.rh_figurino_peca_operadoras FROM authenticated;

-- ─── RLS empréstimos / histórico (recreadas) ─────────────────────────────────
CREATE POLICY rh_figurino_emp_select
  ON public.rh_figurino_emprestimos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rh_figurino_pecas p
      WHERE p.id = rh_figurino_emprestimos.item_id
        AND (
          EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor'))
          OR (
            EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('executivo', 'operador'))
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

CREATE POLICY rh_figurino_hist_select
  ON public.rh_figurino_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rh_figurino_pecas p
      WHERE p.id = rh_figurino_status_history.item_id
        AND (
          EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor'))
          OR (
            EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('executivo', 'operador'))
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

COMMENT ON TABLE public.rh_figurino_peca_operadoras IS 'RH — operadoras em que a peça pode ser usada (N:N).';

COMMIT;
