-- Ofertas Spin: permitir várias ofertas abertas no mesmo dia/turno (quantidade).
-- Remove a barreira oferta_duplicada; p_quantidade (1–20) cria N linhas no mural.

BEGIN;

DROP FUNCTION IF EXISTS public.escala_marketplace_oferta_spin_criar(text, uuid, date, text, text, text);

CREATE OR REPLACE FUNCTION public.escala_marketplace_oferta_spin_criar(
  p_tipo text,
  p_org_time_id uuid,
  p_dia_iso date,
  p_turno_label text,
  p_estudio_slug text,
  p_observacao text DEFAULT NULL,
  p_quantidade integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text := lower(btrim(COALESCE(p_tipo, '')));
  v_turno text := nullif(btrim(COALESCE(p_turno_label, '')), '');
  v_estudio text := nullif(btrim(COALESCE(p_estudio_slug, '')), '');
  v_qtd integer := COALESCE(p_quantidade, 1);
  v_area text;
  v_grupo text;
  v_ref date;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_fid uuid;
  v_inicio timestamptz;
  v_id uuid;
  v_valor_origem text;
  v_obs text := nullif(btrim(COALESCE(p_observacao, '')), '');
  v_ids uuid[] := ARRAY[]::uuid[];
  v_i integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public._escala_marketplace_pode_gestao_spin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('escala_marketplace_turnos', 'create')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'escala_marketplace_turnos'
        AND rp.can_criar IN ('sim', 'proprios')
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_tipo NOT IN ('oferta_spin_cobertura', 'oferta_spin_liberacao') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tipo');
  END IF;

  IF p_org_time_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'time_obrigatorio');
  END IF;

  IF p_dia_iso IS NULL OR p_dia_iso < v_hoje THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_nao_futuro');
  END IF;

  IF v_turno IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'turno_obrigatorio');
  END IF;

  IF v_qtd < 1 OR v_qtd > 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'quantidade_invalida');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.rh_org_times t
    WHERE t.id = p_org_time_id AND t.status = 'ativo'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'time_invalido');
  END IF;

  v_area := public._escala_marketplace_area_key(p_org_time_id);
  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'area_invalida');
  END IF;

  v_grupo := public._escala_marketplace_grupo_key(v_area);
  IF v_grupo IN ('shuffler', 'lideranca') THEN
    v_estudio := 'todos';
  ELSE
    IF v_estudio IS NULL OR lower(v_estudio) = 'todos' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'estudio_obrigatorio');
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.estudios_spin e WHERE e.slug = v_estudio AND e.ativo = true
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'estudio_invalido');
    END IF;
  END IF;

  v_ref := date_trunc('month', p_dia_iso)::date;

  IF NOT public._escala_marketplace_grade_aprovada(v_ref, v_area) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  SELECT f.id INTO v_fid
  FROM public.rh_funcionarios f
  WHERE f.id = public._rh_funcionario_login_id()
    AND f.status IN ('ativo', 'indisponivel')
  LIMIT 1;

  IF v_fid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'prestador_nao_encontrado');
  END IF;

  v_inicio := public._escala_marketplace_inicio_turno_por_estudio(v_estudio, p_dia_iso, v_turno);
  IF v_inicio IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'horario_turno_indisponivel');
  END IF;

  IF v_inicio < now() + interval '4 hours' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'antecedencia_minima');
  END IF;

  v_valor_origem := CASE
    WHEN v_tipo = 'oferta_spin_cobertura' THEN 'Compra - ' || v_turno
    ELSE 'Venda'
  END;

  FOR v_i IN 1 .. v_qtd LOOP
    INSERT INTO public.escala_marketplace_oferta (
      tipo, status, ofertante_funcionario_id, org_time_id, dia_iso,
      valor_celula_origem, turno_label, observacao,
      oferta_spin, criado_por_funcionario_id, estudio_slug, inicio_turno_at
    )
    VALUES (
      v_tipo, 'aberta', v_fid, p_org_time_id, p_dia_iso,
      v_valor_origem, v_turno, v_obs,
      true, v_fid, v_estudio, v_inicio
    )
    RETURNING id INTO v_id;

    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_ids[1],
    'ids', to_jsonb(v_ids),
    'quantidade', v_qtd
  );
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_spin_criar(text, uuid, date, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_spin_criar(text, uuid, date, text, text, text, integer)
  TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_oferta_spin_criar(text, uuid, date, text, text, text, integer) IS
  'Publica 1–20 ofertas Spin (cobertura/liberação) no mesmo dia/turno; cada unidade = uma linha no mural.';

COMMIT;
