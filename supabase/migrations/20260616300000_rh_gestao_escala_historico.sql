-- Histórico de ações na Gestão de Escala (mês/área): sugestão, salvar, aprovar, nova escala, alterar escala.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_gestao_escala_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_mes date NOT NULL,
  area_key text NOT NULL,
  acao text NOT NULL CHECK (
    acao IN ('sugestao', 'salvar', 'aprovar', 'nova_escala', 'alterar_escala')
  ),
  realizada_em timestamptz NOT NULL DEFAULT now(),
  realizada_por uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS rh_gestao_escala_historico_ref_area_em_idx
  ON public.rh_gestao_escala_historico (ref_mes, area_key, realizada_em DESC);

COMMENT ON TABLE public.rh_gestao_escala_historico IS
  'Auditoria de ações na Gestão de Escala por mês e área (time).';

ALTER TABLE public.rh_gestao_escala_historico ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rh_gestao_escala_historico FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_gestao_escala_historico FROM authenticated;

CREATE OR REPLACE FUNCTION public._rh_gestao_escala_historico_inserir(
  p_ref_mes date,
  p_area_key text,
  p_acao text,
  p_detalhes jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.rh_gestao_escala_historico (ref_mes, area_key, acao, realizada_por, detalhes)
  VALUES (
    v_ref,
    v_area,
    p_acao,
    v_uid,
    coalesce(p_detalhes, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_historico_registrar(
  p_ref_mes date,
  p_area_key text,
  p_acao text,
  p_detalhes jsonb DEFAULT '{}'::jsonb
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
  v_acao text := lower(btrim(p_acao));
  v_ok_perm boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF v_acao NOT IN ('sugestao', 'nova_escala') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'acao_invalida');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR public._prestador_page_perm('rh_gestao_escala', 'create')
  OR public._prestador_page_perm('rh_gestao_escala', 'edit')
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

  PERFORM public._rh_gestao_escala_historico_inserir(v_ref, v_area, v_acao, coalesce(p_detalhes, '{}'::jsonb));

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_historico_listar(p_ref_mes date, p_area_key text)
RETURNS TABLE (
  id uuid,
  acao text,
  realizada_em timestamptz,
  realizada_por_nome text,
  detalhes jsonb
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
  SELECT
    h.id,
    h.acao,
    h.realizada_em,
    coalesce(nullif(btrim(pr.name), ''), nullif(btrim(pr.email), ''), 'Usuário') AS realizada_por_nome,
    h.detalhes
  FROM public.rh_gestao_escala_historico h
  INNER JOIN public.profiles pr ON pr.id = h.realizada_por
  WHERE h.ref_mes = v_ref
    AND h.area_key = v_area
  ORDER BY h.realizada_em DESC;
END;
$$;

-- grade_salvar: registra «salvar»
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
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
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

  PERFORM public._rh_gestao_escala_historico_inserir(v_ref, v_area, 'salvar', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- grade_aprovar: registra «aprovar»
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
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
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

  PERFORM public._rh_gestao_escala_historico_inserir(v_ref, v_area, 'aprovar', '{}'::jsonb);

  RETURN jsonb_build_object(
    'ok', true,
    'aprovado_em', v_now::text,
    'aprovado_por', v_uid::text
  );
END;
$$;

-- grade_resetar: registra «nova_escala» antes de apagar grade/status/alterações de célula
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

  PERFORM public._rh_gestao_escala_historico_inserir(v_ref, v_area, 'nova_escala', '{}'::jsonb);

  DELETE FROM public.rh_gestao_escala_grade_alteracao a
  WHERE a.ref_mes = v_ref AND a.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref AND s.area_key = v_area;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- grade_alterar_celula: registra «alterar_escala» com prestador, dia e observação
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
  v_prestador_nome text;
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

  SELECT coalesce(
    nullif(btrim(f.staff_nickname), ''),
    nullif(btrim(f.nome), ''),
    'Prestador'
  )
  INTO v_prestador_nome
  FROM public.rh_funcionarios f
  WHERE f.id = p_funcionario_id;

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

  PERFORM public._rh_gestao_escala_historico_inserir(
    v_ref,
    v_area,
    'alterar_escala',
    jsonb_build_object(
      'funcionario_id', p_funcionario_id::text,
      'prestador_nome', coalesce(v_prestador_nome, 'Prestador'),
      'dia_iso', p_dia_iso::text,
      'observacao', v_obs
    )
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

REVOKE ALL ON FUNCTION public._rh_gestao_escala_historico_inserir(date, text, text, jsonb) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_historico_registrar(date, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_historico_registrar(date, text, text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_historico_listar(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_historico_listar(date, text) TO authenticated;

COMMIT;
