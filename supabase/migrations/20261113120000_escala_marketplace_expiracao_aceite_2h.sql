-- Marketplace:
-- - criar oferta: ≥4h até o início do turno (já em escala_marketplace_oferta_criar);
-- - aceitar / aprovar troca: mesmo dia permitido até 2h antes do início;
-- - expiração automática: <2h ou dia civil já passou.

BEGIN;

DROP FUNCTION IF EXISTS public._escala_marketplace_limite_4h_atingido(timestamptz, date, timestamptz);

CREATE OR REPLACE FUNCTION public._escala_marketplace_limite_2h_atingido(
  p_inicio_turno_at timestamptz,
  p_dia_iso date,
  p_agora timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_inicio_turno_at IS NOT NULL
      THEN p_inicio_turno_at < p_agora + interval '2 hours'
    -- Legado sem início resolvido: dia civil já passou (SP).
    ELSE p_dia_iso < (p_agora AT TIME ZONE 'America/Sao_Paulo')::date
  END;
$$;

COMMENT ON FUNCTION public._escala_marketplace_limite_2h_atingido(timestamptz, date, timestamptz) IS
  'True quando faltam <2h para o início congelado, ou o dia já passou (legado sem horário).';

CREATE OR REPLACE FUNCTION public.escala_marketplace_expirar_ofertas_2h()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  UPDATE public.escala_marketplace_oferta o
  SET status = 'expirada', atualizado_em = now()
  WHERE o.status IN ('aberta', 'interessado', 'em_analise')
    AND public._escala_marketplace_limite_2h_atingido(
      o.inicio_turno_at,
      o.dia_iso,
      now()
    );

  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.escala_marketplace_expirar_ofertas_2h() IS
  'Expira ofertas aberta/interessado/em_analise quando faltam menos de 2h para o início do turno, ou o dia já passou.';

COMMENT ON COLUMN public.escala_marketplace_oferta.inicio_turno_at IS
  'Início exato do turno ofertado (America/Sao_Paulo), congelado na publicação para expiração automática 2h antes.';

-- Aceite interno: mesmo dia permitido; a janela de 2h fica no wrapper.
CREATE OR REPLACE FUNCTION public._escala_marketplace_oferta_aceitar_sem_limite_2h(
  p_oferta_id uuid,
  p_dia_iso_interesse date DEFAULT NULL,
  p_valor_celula_interesse text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta public.escala_marketplace_oferta%ROWTYPE;
  v_aceitante uuid;
  v_area text;
  v_ref date;
  v_ref_interesse date;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_cel_aceitante text;
  v_cel_aceitante_interesse text;
  v_cel_ofertante_interesse text;
  v_turno_aceitante text;
  v_turno_compra text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_oferta.status NOT IN ('aberta', 'interessado') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;
  IF v_oferta.dia_iso < v_hoje THEN
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  SELECT f.id INTO v_aceitante
  FROM public.rh_funcionarios f
  WHERE f.id = public._rh_funcionario_login_id()
    AND f.status IN ('ativo', 'indisponivel')
  LIMIT 1;

  IF v_aceitante IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'prestador_nao_encontrado');
  END IF;
  IF v_aceitante = v_oferta.ofertante_funcionario_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'mesmo_ofertante');
  END IF;
  IF NOT public._escala_marketplace_mesmo_time(v_oferta.ofertante_funcionario_id, v_aceitante) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'times_diferentes');
  END IF;

  v_area := public._escala_marketplace_area_key(v_oferta.org_time_id);
  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'area_invalida');
  END IF;

  v_ref := date_trunc('month', v_oferta.dia_iso)::date;
  IF NOT EXISTS (
    SELECT 1 FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref AND s.area_key = v_area AND s.status = 'aprovada'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  SELECT g.valor INTO v_cel_aceitante
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area
    AND g.funcionario_id = v_aceitante AND g.dia_iso = v_oferta.dia_iso
  LIMIT 1;

  v_turno_compra := public._escala_marketplace_turno_label_grade(v_oferta.turno_label);
  IF v_turno_compra IS NULL THEN
    v_turno_compra := public._escala_marketplace_turno_label_grade(v_oferta.valor_celula_origem);
  END IF;
  IF v_turno_compra IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'turno_invalido');
  END IF;

  IF v_oferta.tipo = 'venda_turno' THEN
    IF NOT public._escala_marketplace_valor_eh_folga(v_cel_aceitante) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_ja_escalado');
    END IF;
    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_aceitante::text || ':' || v_oferta.dia_iso::text, 0)
    );
    IF public._escala_marketplace_dia_reservado(v_aceitante, v_oferta.dia_iso, v_oferta.id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_reservado');
    END IF;

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area
      AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area, v_aceitante, v_oferta.dia_iso, 'Compra - ' || v_turno_compra)
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();

  ELSIF v_oferta.tipo = 'venda_folga' THEN
    v_turno_aceitante := public._escala_marketplace_turno_label_grade(v_cel_aceitante);
    IF v_turno_aceitante IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_sem_turno');
    END IF;
    IF v_turno_aceitante <> v_turno_compra THEN
      RETURN jsonb_build_object('ok', false, 'error', 'turno_diferente');
    END IF;
    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_aceitante::text || ':' || v_oferta.dia_iso::text, 0)
    );
    IF public._escala_marketplace_dia_reservado(v_aceitante, v_oferta.dia_iso, v_oferta.id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_reservado');
    END IF;

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area
      AND funcionario_id = v_aceitante AND dia_iso = v_oferta.dia_iso;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso, 'Compra - ' || v_turno_compra)
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();

  ELSE
    IF NOT public._escala_marketplace_valor_eh_folga(v_cel_aceitante) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_ja_escalado');
    END IF;
    IF p_dia_iso_interesse IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_interesse_obrigatorio');
    END IF;
    IF p_dia_iso_interesse < v_hoje OR p_dia_iso_interesse = v_oferta.dia_iso THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_interesse_nao_futuro');
    END IF;

    v_ref_interesse := date_trunc('month', p_dia_iso_interesse)::date;
    IF NOT EXISTS (
      SELECT 1 FROM public.rh_gestao_escala_grade_status s
      WHERE s.ref_mes = v_ref_interesse AND s.area_key = v_area AND s.status = 'aprovada'
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'escala_interesse_nao_aprovada');
    END IF;

    SELECT g.valor INTO v_cel_aceitante_interesse
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref_interesse AND g.area_key = v_area
      AND g.funcionario_id = v_aceitante AND g.dia_iso = p_dia_iso_interesse
    LIMIT 1;

    IF public._escala_marketplace_turno_label_grade(v_cel_aceitante_interesse) IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_interesse_sem_turno');
    END IF;
    IF btrim(COALESCE(p_valor_celula_interesse, '')) <> btrim(COALESCE(v_cel_aceitante_interesse, '')) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_interesse_alterado');
    END IF;

    SELECT g.valor INTO v_cel_ofertante_interesse
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref_interesse AND g.area_key = v_area
      AND g.funcionario_id = v_oferta.ofertante_funcionario_id AND g.dia_iso = p_dia_iso_interesse
    LIMIT 1;

    IF NOT public._escala_marketplace_valor_eh_folga(v_cel_ofertante_interesse) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'ofertante_ja_escalado');
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(chave, 0))
    FROM (
      SELECT DISTINCT participante::text || ':' || dia::text AS chave
      FROM (
        VALUES
          (v_aceitante, v_oferta.dia_iso),
          (v_aceitante, p_dia_iso_interesse),
          (v_oferta.ofertante_funcionario_id, v_oferta.dia_iso),
          (v_oferta.ofertante_funcionario_id, p_dia_iso_interesse)
      ) AS reservas(participante, dia)
      ORDER BY chave
    ) AS chaves;

    IF public._escala_marketplace_dia_reservado(v_aceitante, v_oferta.dia_iso, v_oferta.id)
      OR public._escala_marketplace_dia_reservado(v_aceitante, p_dia_iso_interesse, v_oferta.id)
      OR public._escala_marketplace_dia_reservado(v_oferta.ofertante_funcionario_id, p_dia_iso_interesse, v_oferta.id)
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_reservado');
    END IF;

    UPDATE public.escala_marketplace_oferta
    SET
      status = 'em_analise',
      interessado_funcionario_id = v_aceitante,
      dia_iso_interesse = p_dia_iso_interesse,
      valor_celula_interesse = btrim(v_cel_aceitante_interesse),
      atualizado_em = now()
    WHERE id = p_oferta_id;

    RETURN jsonb_build_object('ok', true, 'area_key', v_area, 'em_analise', true);
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET
    status = 'aceita',
    interessado_funcionario_id = v_aceitante,
    dia_iso_interesse = p_dia_iso_interesse,
    valor_celula_interesse = nullif(btrim(COALESCE(p_valor_celula_interesse, '')), ''),
    aceito_em = now(),
    atualizado_em = now()
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object('ok', true, 'area_key', v_area);
END;
$$;

CREATE OR REPLACE FUNCTION public.escala_marketplace_oferta_aceitar(
  p_oferta_id uuid,
  p_dia_iso_interesse date DEFAULT NULL,
  p_valor_celula_interesse text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_inicio timestamptz;
  v_dia date;
BEGIN
  SELECT o.status, o.inicio_turno_at, o.dia_iso
  INTO v_status, v_inicio, v_dia
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF FOUND
     AND v_status IN ('aberta', 'interessado')
     AND public._escala_marketplace_limite_2h_atingido(v_inicio, v_dia, now())
  THEN
    UPDATE public.escala_marketplace_oferta
    SET status = 'expirada', atualizado_em = now()
    WHERE id = p_oferta_id;
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  RETURN public._escala_marketplace_oferta_aceitar_sem_limite_2h(
    p_oferta_id,
    p_dia_iso_interesse,
    p_valor_celula_interesse
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._escala_marketplace_troca_aprovar_sem_limite_2h(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta public.escala_marketplace_oferta%ROWTYPE;
  v_fid uuid := public._rh_funcionario_login_id();
  v_area text;
  v_ref date;
  v_ref_interesse date;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_origem_atual text;
  v_interessado_origem text;
  v_interesse_atual text;
  v_ofertante_interesse text;
  v_turno_origem text;
  v_turno_interesse text;
BEGIN
  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_oferta.tipo <> 'oferta_troca' OR v_oferta.status <> 'em_analise' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;
  IF v_fid IS NULL OR v_fid <> v_oferta.ofertante_funcionario_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_e_ofertante');
  END IF;

  v_area := public._escala_marketplace_area_key(v_oferta.org_time_id);
  v_ref := date_trunc('month', v_oferta.dia_iso)::date;
  v_ref_interesse := date_trunc('month', v_oferta.dia_iso_interesse)::date;
  IF v_oferta.dia_iso < v_hoje OR v_oferta.dia_iso_interesse < v_hoje THEN
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref AND s.area_key = v_area AND s.status = 'aprovada'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref_interesse AND s.area_key = v_area AND s.status = 'aprovada'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  SELECT g.valor INTO v_origem_atual
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area
    AND g.funcionario_id = v_oferta.ofertante_funcionario_id AND g.dia_iso = v_oferta.dia_iso;
  SELECT g.valor INTO v_interessado_origem
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area
    AND g.funcionario_id = v_oferta.interessado_funcionario_id AND g.dia_iso = v_oferta.dia_iso;
  SELECT g.valor INTO v_interesse_atual
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref_interesse AND g.area_key = v_area
    AND g.funcionario_id = v_oferta.interessado_funcionario_id AND g.dia_iso = v_oferta.dia_iso_interesse;
  SELECT g.valor INTO v_ofertante_interesse
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref_interesse AND g.area_key = v_area
    AND g.funcionario_id = v_oferta.ofertante_funcionario_id AND g.dia_iso = v_oferta.dia_iso_interesse;

  v_turno_origem := public._escala_marketplace_turno_label_grade(v_origem_atual);
  v_turno_interesse := public._escala_marketplace_turno_label_grade(v_interesse_atual);
  IF v_turno_origem IS NULL OR btrim(COALESCE(v_origem_atual, '')) <> btrim(v_oferta.valor_celula_origem) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_alterada');
  END IF;
  IF v_turno_interesse IS NULL OR btrim(COALESCE(v_interesse_atual, '')) <> btrim(v_oferta.valor_celula_interesse) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_alterada');
  END IF;
  IF NOT public._escala_marketplace_valor_eh_folga(v_interessado_origem)
    OR NOT public._escala_marketplace_valor_eh_folga(v_ofertante_interesse)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_alterada');
  END IF;

  UPDATE public.rh_gestao_escala_grade
  SET valor = 'Venda', atualizado_em = now()
  WHERE ref_mes = v_ref AND area_key = v_area
    AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;
  INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
  VALUES (v_ref, v_area, v_oferta.interessado_funcionario_id, v_oferta.dia_iso, 'Compra - ' || v_turno_origem)
  ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
  DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();

  UPDATE public.rh_gestao_escala_grade
  SET valor = 'Venda', atualizado_em = now()
  WHERE ref_mes = v_ref_interesse AND area_key = v_area
    AND funcionario_id = v_oferta.interessado_funcionario_id AND dia_iso = v_oferta.dia_iso_interesse;
  INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
  VALUES (
    v_ref_interesse, v_area, v_oferta.ofertante_funcionario_id,
    v_oferta.dia_iso_interesse, 'Compra - ' || v_turno_interesse
  )
  ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
  DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();

  UPDATE public.escala_marketplace_oferta
  SET status = 'aceita', aceito_em = now(), atualizado_em = now()
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object('ok', true, 'area_key', v_area);
END;
$$;

CREATE OR REPLACE FUNCTION public.escala_marketplace_troca_aprovar(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_inicio timestamptz;
  v_dia date;
BEGIN
  SELECT o.status, o.inicio_turno_at, o.dia_iso
  INTO v_status, v_inicio, v_dia
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF FOUND
     AND v_status IN ('aberta', 'interessado', 'em_analise')
     AND public._escala_marketplace_limite_2h_atingido(v_inicio, v_dia, now())
  THEN
    UPDATE public.escala_marketplace_oferta
    SET status = 'expirada', atualizado_em = now()
    WHERE id = p_oferta_id;
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  RETURN public._escala_marketplace_troca_aprovar_sem_limite_2h(p_oferta_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.escala_marketplace_troca_recusar(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_inicio timestamptz;
  v_dia date;
BEGIN
  SELECT o.status, o.inicio_turno_at, o.dia_iso
  INTO v_status, v_inicio, v_dia
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF FOUND
     AND v_status = 'em_analise'
     AND public._escala_marketplace_limite_2h_atingido(v_inicio, v_dia, now())
  THEN
    UPDATE public.escala_marketplace_oferta
    SET status = 'expirada', atualizado_em = now()
    WHERE id = p_oferta_id;
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  RETURN public._escala_marketplace_troca_recusar_sem_limite_2h(p_oferta_id);
END;
$$;

COMMENT ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) IS
  'Marketplace: cria oferta. Exige ≥4h até o início do turno (inicio_turno_at) e congela o horário para expiração 2h.';
COMMENT ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) IS
  'Marketplace: aceita oferta no mesmo dia se restarem ≥2h até o início; abaixo disso expira automaticamente.';

-- Fecha imediatamente o que já está fora da janela (datas antigas ou <2h).
SELECT public.escala_marketplace_expirar_ofertas_2h();

COMMIT;
