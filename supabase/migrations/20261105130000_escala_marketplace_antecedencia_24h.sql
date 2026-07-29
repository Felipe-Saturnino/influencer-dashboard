-- Marketplace de turnos — antecedência mínima de 24h para publicar oferta.
--
-- A oferta é por dia (não por horário), então o primeiro dia publicável é
-- `hoje + 2` em America/Sao_Paulo: garante ≥24h entre a publicação e o dia
-- negociado em qualquer hora do dia. Erro devolvido: `antecedencia_minima`.
--
-- O aceite continua exigindo apenas dia futuro — quem já publicou com
-- antecedência não deve perder o aceite de última hora.

BEGIN;

CREATE OR REPLACE FUNCTION public.escala_marketplace_oferta_criar(
  p_tipo text,
  p_dia_iso date,
  p_valor_celula text,
  p_turno_label text DEFAULT NULL,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fid uuid;
  v_time uuid;
  v_tipo text := lower(btrim(COALESCE(p_tipo, '')));
  v_turno text := nullif(btrim(COALESCE(p_turno_label, '')), '');
  v_area text;
  v_ref date;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_primeiro_dia date;
  v_celula text;
  v_celula_norm text;
  v_valor_origem text;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
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

  IF v_tipo NOT IN ('venda_turno', 'venda_folga', 'oferta_troca', 'troca_cassada') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tipo');
  END IF;

  v_primeiro_dia := v_hoje + 2;

  IF p_dia_iso IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_nao_futuro');
  END IF;

  IF p_dia_iso < v_primeiro_dia THEN
    RETURN jsonb_build_object('ok', false, 'error', 'antecedencia_minima');
  END IF;

  SELECT f.id, f.org_time_id
  INTO v_fid, v_time
  FROM public.rh_funcionarios f
  WHERE f.id = public._rh_funcionario_login_id()
    AND f.status IN ('ativo', 'indisponivel')
    AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = 'estudio'
  LIMIT 1;

  IF v_fid IS NULL OR v_time IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'prestador_nao_encontrado');
  END IF;

  v_area := public._escala_marketplace_area_key(v_time);
  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'area_invalida');
  END IF;

  v_ref := date_trunc('month', p_dia_iso)::date;

  IF NOT EXISTS (
    SELECT 1 FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref AND s.area_key = v_area AND s.status = 'aprovada'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.escala_marketplace_oferta o
    WHERE o.ofertante_funcionario_id = v_fid
      AND o.dia_iso = p_dia_iso
      AND o.status IN ('aberta', 'interessado')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_duplicada');
  END IF;

  SELECT g.valor
  INTO v_celula
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref
    AND g.area_key = v_area
    AND g.funcionario_id = v_fid
    AND g.dia_iso = p_dia_iso
  LIMIT 1;

  v_celula_norm := lower(btrim(COALESCE(v_celula, '')));

  IF v_tipo = 'venda_folga' THEN
    IF v_celula_norm NOT IN ('folga', 'f') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_nao_folga');
    END IF;
    IF v_turno IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'turno_obrigatorio');
    END IF;
    v_valor_origem := 'Folga';
  ELSE
    IF v_celula_norm IN ('', 'folga', 'f') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_sem_turno');
    END IF;
    IF v_celula_norm IN ('compra', 'venda', 'troca') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_em_negociacao');
    END IF;
    v_valor_origem := btrim(v_celula);
  END IF;

  INSERT INTO public.escala_marketplace_oferta (
    tipo, status, ofertante_funcionario_id, org_time_id, dia_iso,
    valor_celula_origem, turno_label, observacao
  )
  VALUES (
    v_tipo, 'aberta', v_fid, v_time, p_dia_iso,
    v_valor_origem, v_turno, nullif(btrim(COALESCE(p_observacao, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) IS
  'Marketplace: publica oferta do prestador logado. Exige ≥24h de antecedência (dia >= hoje + 2), escala do mês aprovada, célula coerente com o tipo e nenhuma oferta ativa no mesmo dia.';

COMMIT;
