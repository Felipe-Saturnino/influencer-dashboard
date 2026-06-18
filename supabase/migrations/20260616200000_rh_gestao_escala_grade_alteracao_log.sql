-- Log de alterações pontuais na grade aprovada + listagem da última alteração por célula.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_gestao_escala_grade_alteracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_mes date NOT NULL,
  area_key text NOT NULL,
  funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  dia_iso date NOT NULL,
  valor_anterior text NOT NULL DEFAULT '',
  valor_novo text NOT NULL DEFAULT '',
  observacao text NULL,
  alterado_por uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  alterado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rh_gestao_escala_grade_alteracao_ref_area_idx
  ON public.rh_gestao_escala_grade_alteracao (ref_mes, area_key);

CREATE INDEX IF NOT EXISTS rh_gestao_escala_grade_alteracao_celula_idx
  ON public.rh_gestao_escala_grade_alteracao (ref_mes, area_key, funcionario_id, dia_iso, alterado_em DESC);

COMMENT ON TABLE public.rh_gestao_escala_grade_alteracao IS
  'Histórico de alterações pontuais na Gestão de Escala (escala aprovada). Uma linha por salvamento no modal Alterar Escala.';

ALTER TABLE public.rh_gestao_escala_grade_alteracao ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rh_gestao_escala_grade_alteracao FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_gestao_escala_grade_alteracao FROM authenticated;

DROP FUNCTION IF EXISTS public.rh_gestao_escala_grade_alterar_celula(date, text, uuid, date, text);

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_alterar_celula(
  p_ref_mes date,
  p_area_key text,
  p_funcionario_id uuid,
  p_dia_iso date,
  p_valor text,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  v_val text := coalesce(p_valor, '');
  v_obs text := nullif(btrim(p_observacao), '');
  v_ok_perm boolean;
  v_aprovada boolean;
  v_anterior text := '';
  v_uid uuid := auth.uid();
  v_nome text;
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.role = 'admin'
  )
  OR public._prestador_page_perm('rh_gestao_escala', 'edit')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = v_uid
      AND p.role IS DISTINCT FROM 'prestador'
      AND rp.page_key = 'rh_gestao_escala'
      AND rp.can_editar IN ('sim', 'proprios')
  )
  INTO v_ok_perm;

  IF NOT v_ok_perm THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_area');
  END IF;

  IF p_funcionario_id IS NULL OR p_dia_iso IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_payload');
  END IF;

  IF date_trunc('month', p_dia_iso)::date <> v_ref THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_fora_mes');
  END IF;

  IF p_dia_iso < current_date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_passado');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref
      AND s.area_key = v_area
      AND s.status = 'aprovada'
  )
  INTO v_aprovada;

  IF NOT coalesce(v_aprovada, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  IF NOT public._rh_gestao_escala_prestador_na_area(p_funcionario_id, v_area) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'prestador_fora_area');
  END IF;

  IF length(v_val) > 32 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'valor_too_long');
  END IF;

  IF v_obs IS NOT NULL AND length(v_obs) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'observacao_too_long');
  END IF;

  SELECT coalesce(g.valor, '')
  INTO v_anterior
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref
    AND g.area_key = v_area
    AND g.funcionario_id = p_funcionario_id
    AND g.dia_iso = p_dia_iso;

  IF NOT FOUND THEN
    v_anterior := '';
  END IF;

  SELECT coalesce(nullif(btrim(p.name), ''), nullif(btrim(p.email), ''), 'Usuário')
  INTO v_nome
  FROM public.profiles p
  WHERE p.id = v_uid;

  INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
  VALUES (v_ref, v_area, p_funcionario_id, p_dia_iso, v_val)
  ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
  DO UPDATE SET
    valor = EXCLUDED.valor,
    atualizado_em = v_now;

  INSERT INTO public.rh_gestao_escala_grade_alteracao (
    ref_mes,
    area_key,
    funcionario_id,
    dia_iso,
    valor_anterior,
    valor_novo,
    observacao,
    alterado_por,
    alterado_em
  )
  VALUES (
    v_ref,
    v_area,
    p_funcionario_id,
    p_dia_iso,
    v_anterior,
    v_val,
    v_obs,
    v_uid,
    v_now
  );

  RETURN jsonb_build_object(
    'ok', true,
    'valor_anterior', v_anterior,
    'observacao', v_obs,
    'alterado_em', v_now::text,
    'alterado_por_nome', coalesce(v_nome, 'Usuário')
  );
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_alterar_celula(date, text, uuid, date, text, text) IS
  'Altera uma célula da grade aprovada e registra log (valor anterior, observação, autor). Exige can_editar.';

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_alteracoes_ultimas(p_ref_mes date, p_area_key text)
RETURNS TABLE (
  funcionario_id uuid,
  dia_iso date,
  valor_anterior text,
  valor_novo text,
  observacao text,
  alterado_em timestamptz,
  alterado_por_nome text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
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

  IF v_area IS NULL OR v_area = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (a.funcionario_id, a.dia_iso)
    a.funcionario_id,
    a.dia_iso,
    a.valor_anterior,
    a.valor_novo,
    a.observacao,
    a.alterado_em,
    coalesce(nullif(btrim(pr.name), ''), nullif(btrim(pr.email), ''), 'Usuário') AS alterado_por_nome
  FROM public.rh_gestao_escala_grade_alteracao a
  INNER JOIN public.profiles pr ON pr.id = a.alterado_por
  WHERE a.ref_mes = v_ref
    AND a.area_key = v_area
  ORDER BY a.funcionario_id, a.dia_iso, a.alterado_em DESC;
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_alteracoes_ultimas(date, text) IS
  'Última alteração pontual por célula (mês/área) para ícone de comentário na Escala Diária.';

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

  DELETE FROM public.rh_gestao_escala_grade_alteracao a
  WHERE a.ref_mes = v_ref AND a.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref AND s.area_key = v_area;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_alterar_celula(date, text, uuid, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_alterar_celula(date, text, uuid, date, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_alteracoes_ultimas(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_alteracoes_ultimas(date, text) TO authenticated;

COMMIT;
