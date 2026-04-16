-- ─── RH — Figurinos: peças, empréstimos (1 ativo por peça), histórico de status ─
-- Códigos FIG-###### via sequência; barcode numérico 12 dígitos com retry.
-- RLS: admin/gestor (todas); executivo/operador (operadoras em user_scopes).

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.rh_figurino_code_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.rh_figurino_pecas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operadora_slug     text        NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  code               text        NOT NULL UNIQUE,
  barcode            text        NOT NULL UNIQUE,
  name               text        NOT NULL,
  category           text        NOT NULL,
  size               text        NOT NULL,
  color              text,
  description        text,
  status             text        NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'borrowed', 'maintenance', 'discarded')),
  condition          text        NOT NULL DEFAULT 'good'
    CHECK (condition IN ('good', 'damaged', 'needs_cleaning')),
  purchase_date      date,
  purchase_price     numeric(12, 2),
  maintenance_reason text,
  maintenance_entered_at timestamptz,
  discarded_at       timestamptz,
  discard_reason     text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_figurino_pecas_operadora ON public.rh_figurino_pecas (operadora_slug);
CREATE INDEX IF NOT EXISTS idx_rh_figurino_pecas_status ON public.rh_figurino_pecas (status);
CREATE INDEX IF NOT EXISTS idx_rh_figurino_pecas_barcode ON public.rh_figurino_pecas (barcode);

CREATE TABLE IF NOT EXISTS public.rh_figurino_emprestimos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          uuid NOT NULL REFERENCES public.rh_figurino_pecas (id) ON DELETE CASCADE,
  borrower_name    text NOT NULL,
  borrower_ref     text,
  loaned_by        text NOT NULL,
  loaned_at        timestamptz NOT NULL DEFAULT now(),
  returned_at      timestamptz,
  return_condition text CHECK (return_condition IS NULL OR return_condition IN ('good', 'needs_cleaning', 'damaged')),
  return_notes     text,
  returned_by      text,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned'))
);

CREATE UNIQUE INDEX IF NOT EXISTS rh_figurino_emprestimos_um_ativo
  ON public.rh_figurino_emprestimos (item_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_rh_figurino_emp_item ON public.rh_figurino_emprestimos (item_id);
CREATE INDEX IF NOT EXISTS idx_rh_figurino_emp_status ON public.rh_figurino_emprestimos (status);

CREATE TABLE IF NOT EXISTS public.rh_figurino_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES public.rh_figurino_pecas (id) ON DELETE CASCADE,
  previous_status text,
  new_status      text NOT NULL,
  changed_by      text NOT NULL,
  notes           text,
  changed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_figurino_hist_item ON public.rh_figurino_status_history (item_id, changed_at DESC);

-- updated_at
CREATE OR REPLACE FUNCTION public.rh_figurino_pecas_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_figurino_pecas_updated ON public.rh_figurino_pecas;
CREATE TRIGGER trg_rh_figurino_pecas_updated
  BEFORE UPDATE ON public.rh_figurino_pecas
  FOR EACH ROW EXECUTE PROCEDURE public.rh_figurino_pecas_set_updated_at();

CREATE OR REPLACE FUNCTION public.rh_figurino_pecas_block_discarded_mut()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'discarded' THEN
    RAISE EXCEPTION 'rh_figurino_discarded_immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_figurino_pecas_no_discarded_update ON public.rh_figurino_pecas;
CREATE TRIGGER trg_rh_figurino_pecas_no_discarded_update
  BEFORE UPDATE ON public.rh_figurino_pecas
  FOR EACH ROW EXECUTE PROCEDURE public.rh_figurino_pecas_block_discarded_mut();

-- ─── Acesso operadora (auth.uid) — usado nas RPCs SECURITY DEFINER ────────────
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
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('executivo', 'operador'))
        AND EXISTS (
          SELECT 1 FROM public.user_scopes s
          WHERE s.user_id = auth.uid()
            AND s.scope_type = 'operadora'
            AND s.scope_ref = p_slug
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_figurino_auth_can_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_figurino_auth_can_slug(text) TO authenticated;

-- ─── RPC: criar peça (código + barcode atômicos) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.rh_figurino_criar_peca(
  p_operadora_slug text,
  p_name text,
  p_category text,
  p_size text,
  p_color text,
  p_description text,
  p_purchase_date date,
  p_purchase_price numeric,
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public._rh_figurino_auth_can_slug(p_operadora_slug) THEN
    RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
  END IF;
  IF trim(p_name) = '' OR trim(p_category) = '' OR trim(p_size) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

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
    operadora_slug, code, barcode, name, category, size, color, description,
    purchase_date, purchase_price, status, condition
  ) VALUES (
    p_operadora_slug, v_code, v_bar, trim(p_name), trim(p_category), trim(p_size),
    nullif(trim(p_color), ''), nullif(trim(p_description), ''),
    p_purchase_date, p_purchase_price, 'available', 'good'
  )
  RETURNING * INTO v_row;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (v_row.id, NULL, 'available', coalesce(nullif(trim(p_actor), ''), 'sistema'), 'Cadastro');

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_criar_peca(text, text, text, text, text, text, date, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_criar_peca(text, text, text, text, text, text, date, numeric, text) TO authenticated;

-- ─── RPC: empréstimo ───────────────────────────────────────────────────────────
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
  IF NOT public._rh_figurino_auth_can_slug(peca.operadora_slug) THEN
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

-- ─── RPC: devolução (fecha empréstimo ativo; atualiza peça) ────────────────────
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
  IF NOT public._rh_figurino_auth_can_slug(peca.operadora_slug) THEN
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

-- ─── RPC: enviar para manutenção (a partir de available) ─────────────────────
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
  IF NOT public._rh_figurino_auth_can_slug(peca.operadora_slug) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
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

-- ─── RPC: concluir manutenção → available ────────────────────────────────────
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
  IF NOT public._rh_figurino_auth_can_slug(peca.operadora_slug) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
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

-- ─── RPC: descartar (available ou maintenance) ───────────────────────────────
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
  IF NOT public._rh_figurino_auth_can_slug(peca.operadora_slug) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
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

-- ─── RLS pecas ───────────────────────────────────────────────────────────────
ALTER TABLE public.rh_figurino_pecas ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_figurino_pecas_select_scope
  ON public.rh_figurino_pecas FOR SELECT TO authenticated
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

-- Mutations em peças apenas via RPC (SECURITY DEFINER).

-- ─── RLS empréstimos (via peça) ──────────────────────────────────────────────
ALTER TABLE public.rh_figurino_emprestimos ENABLE ROW LEVEL SECURITY;

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
            AND p.operadora_slug IN (
              SELECT s.scope_ref FROM public.user_scopes s
              WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
            )
          )
        )
    )
  );

-- INSERT/UPDATE em empréstimos apenas via RPC.

-- ─── RLS histórico ───────────────────────────────────────────────────────────
ALTER TABLE public.rh_figurino_status_history ENABLE ROW LEVEL SECURITY;

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
            AND p.operadora_slug IN (
              SELECT s.scope_ref FROM public.user_scopes s
              WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
            )
          )
        )
    )
  );

-- INSERT no histórico apenas via RPC.

-- ─── Permissões de menu (espelha gestão de dealers) ──────────────────────────
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'rh_figurinos', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'gestao_dealers'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT gestor_tipo_slug, 'rh_figurinos'
FROM public.gestor_tipo_pages
WHERE page_key = 'gestao_dealers'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT operadora_slug, 'rh_figurinos'
FROM public.operadora_pages
WHERE page_key = 'gestao_dealers'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

COMMENT ON TABLE public.rh_figurino_pecas IS 'RH — peças de figurino por operadora; códigos FIG-###### e barcode únicos.';
COMMENT ON TABLE public.rh_figurino_emprestimos IS 'RH — empréstimos; no máximo um status=active por item_id.';
COMMENT ON TABLE public.rh_figurino_status_history IS 'RH — histórico de mudanças de status da peça.';

REVOKE INSERT, UPDATE, DELETE ON public.rh_figurino_pecas FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rh_figurino_emprestimos FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rh_figurino_status_history FROM authenticated;

COMMIT;
