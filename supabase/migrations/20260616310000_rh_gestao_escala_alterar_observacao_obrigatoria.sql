-- Alterar Escala: observação obrigatória na alteração pontual de célula aprovada.

BEGIN;

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

  IF v_obs IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'observacao_obrigatoria');
  END IF;

  IF length(v_obs) > 500 THEN
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

COMMENT ON FUNCTION public.rh_gestao_escala_grade_alterar_celula(date, text, uuid, date, text, text) IS
  'Altera uma célula da grade aprovada. Observação obrigatória (máx. 500). Registra log e histórico.';

COMMIT;
