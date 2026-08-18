-- Marketplace: vendas (turno/folga) passam a Em análise como a troca.
-- Escala só muda após o ofertante aprovar. Recusar/desistir devolve ao mural.
-- Home: RPC de alertas (pendente + lembrete até o início do turno).

BEGIN;

CREATE OR REPLACE FUNCTION public._escala_marketplace_dia_reservado(
  p_funcionario_id uuid,
  p_dia date,
  p_ignorar_oferta_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.escala_marketplace_oferta o
    WHERE o.id IS DISTINCT FROM p_ignorar_oferta_id
      AND o.status IN ('aberta', 'interessado', 'em_analise')
      AND (
        (o.ofertante_funcionario_id = p_funcionario_id AND o.dia_iso = p_dia)
        OR (
          o.status = 'em_analise'
          AND p_funcionario_id IN (o.ofertante_funcionario_id, o.interessado_funcionario_id)
          AND (
            p_dia = o.dia_iso
            OR (o.tipo = 'oferta_troca' AND p_dia = o.dia_iso_interesse)
          )
        )
      )
  );
$$;

COMMENT ON FUNCTION public._escala_marketplace_dia_reservado(uuid, date, uuid) IS
  'Reserva o dia da oferta aberta e, em Em análise, o dia (ou os dois da troca) dos dois participantes.';

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
  v_area_ofertante text;
  v_area_aceitante text;
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

  v_area_ofertante := public._escala_marketplace_area_key(v_oferta.org_time_id);
  v_area_aceitante := public._escala_marketplace_area_key_funcionario(v_aceitante);
  IF v_area_ofertante IS NULL OR v_area_ofertante = ''
     OR v_area_aceitante IS NULL OR v_area_aceitante = ''
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'area_invalida');
  END IF;

  v_ref := date_trunc('month', v_oferta.dia_iso)::date;
  IF NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_ofertante)
     OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_aceitante)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  SELECT g.valor INTO v_cel_aceitante
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area_aceitante
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
    PERFORM pg_advisory_xact_lock(hashtextextended(chave, 0))
    FROM (
      SELECT DISTINCT participante::text || ':' || dia::text AS chave
      FROM (
        VALUES
          (v_aceitante, v_oferta.dia_iso),
          (v_oferta.ofertante_funcionario_id, v_oferta.dia_iso)
      ) AS reservas(participante, dia)
      ORDER BY chave
    ) AS chaves;
    IF public._escala_marketplace_dia_reservado(v_aceitante, v_oferta.dia_iso, v_oferta.id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_reservado');
    END IF;

    UPDATE public.escala_marketplace_oferta
    SET
      status = 'em_analise',
      interessado_funcionario_id = v_aceitante,
      atualizado_em = now()
    WHERE id = p_oferta_id;

    RETURN jsonb_build_object('ok', true, 'area_key', v_area_ofertante, 'em_analise', true);

  ELSIF v_oferta.tipo = 'venda_folga' THEN
    v_turno_aceitante := public._escala_marketplace_turno_label_grade(v_cel_aceitante);
    IF v_turno_aceitante IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_sem_turno');
    END IF;
    IF v_turno_aceitante <> v_turno_compra THEN
      RETURN jsonb_build_object('ok', false, 'error', 'turno_diferente');
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(chave, 0))
    FROM (
      SELECT DISTINCT participante::text || ':' || dia::text AS chave
      FROM (
        VALUES
          (v_aceitante, v_oferta.dia_iso),
          (v_oferta.ofertante_funcionario_id, v_oferta.dia_iso)
      ) AS reservas(participante, dia)
      ORDER BY chave
    ) AS chaves;
    IF public._escala_marketplace_dia_reservado(v_aceitante, v_oferta.dia_iso, v_oferta.id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_reservado');
    END IF;

    UPDATE public.escala_marketplace_oferta
    SET
      status = 'em_analise',
      interessado_funcionario_id = v_aceitante,
      atualizado_em = now()
    WHERE id = p_oferta_id;

    RETURN jsonb_build_object('ok', true, 'area_key', v_area_ofertante, 'em_analise', true);
  END IF;

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
  IF NOT public._escala_marketplace_grade_aprovada(v_ref_interesse, v_area_aceitante)
     OR NOT public._escala_marketplace_grade_aprovada(v_ref_interesse, v_area_ofertante)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_interesse_nao_aprovada');
  END IF;

  SELECT g.valor INTO v_cel_aceitante_interesse
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref_interesse AND g.area_key = v_area_aceitante
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
  WHERE g.ref_mes = v_ref_interesse AND g.area_key = v_area_ofertante
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

  RETURN jsonb_build_object('ok', true, 'area_key', v_area_ofertante, 'em_analise', true);
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
  v_area_ofertante text;
  v_area_interessado text;
  v_ref date;
  v_ref_interesse date;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_origem_atual text;
  v_interessado_origem text;
  v_interesse_atual text;
  v_ofertante_interesse text;
  v_turno_origem text;
  v_turno_interesse text;
  v_turno_compra text;
BEGIN
  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_oferta.status <> 'em_analise' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;
  IF v_fid IS NULL OR v_fid <> v_oferta.ofertante_funcionario_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_e_ofertante');
  END IF;
  IF v_oferta.interessado_funcionario_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;

  v_area_ofertante := public._escala_marketplace_area_key(v_oferta.org_time_id);
  v_area_interessado := public._escala_marketplace_area_key_funcionario(v_oferta.interessado_funcionario_id);
  v_ref := date_trunc('month', v_oferta.dia_iso)::date;
  IF v_oferta.dia_iso < v_hoje THEN
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;
  IF v_area_ofertante IS NULL OR v_area_ofertante = ''
     OR v_area_interessado IS NULL OR v_area_interessado = ''
     OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_ofertante)
     OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_interessado)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  v_turno_compra := public._escala_marketplace_turno_label_grade(v_oferta.turno_label);
  IF v_turno_compra IS NULL THEN
    v_turno_compra := public._escala_marketplace_turno_label_grade(v_oferta.valor_celula_origem);
  END IF;

  IF v_oferta.tipo = 'venda_turno' THEN
    SELECT g.valor INTO v_origem_atual
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area_ofertante
      AND g.funcionario_id = v_oferta.ofertante_funcionario_id AND g.dia_iso = v_oferta.dia_iso;
    SELECT g.valor INTO v_interessado_origem
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area_interessado
      AND g.funcionario_id = v_oferta.interessado_funcionario_id AND g.dia_iso = v_oferta.dia_iso;

    IF v_turno_compra IS NULL
      OR btrim(COALESCE(v_origem_atual, '')) <> btrim(v_oferta.valor_celula_origem)
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'escala_alterada');
    END IF;
    IF NOT public._escala_marketplace_valor_eh_folga(v_interessado_origem) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'escala_alterada');
    END IF;

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area_ofertante
      AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;
    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area_interessado, v_oferta.interessado_funcionario_id, v_oferta.dia_iso, 'Compra - ' || v_turno_compra)
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();

  ELSIF v_oferta.tipo = 'venda_folga' THEN
    SELECT g.valor INTO v_origem_atual
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area_ofertante
      AND g.funcionario_id = v_oferta.ofertante_funcionario_id AND g.dia_iso = v_oferta.dia_iso;
    SELECT g.valor INTO v_interessado_origem
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area_interessado
      AND g.funcionario_id = v_oferta.interessado_funcionario_id AND g.dia_iso = v_oferta.dia_iso;

    v_turno_interesse := public._escala_marketplace_turno_label_grade(v_interessado_origem);
    IF v_turno_compra IS NULL OR v_turno_interesse IS NULL OR v_turno_interesse <> v_turno_compra THEN
      RETURN jsonb_build_object('ok', false, 'error', 'escala_alterada');
    END IF;
    IF NOT public._escala_marketplace_valor_eh_folga(v_origem_atual) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'escala_alterada');
    END IF;

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area_interessado
      AND funcionario_id = v_oferta.interessado_funcionario_id AND dia_iso = v_oferta.dia_iso;
    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area_ofertante, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso, 'Compra - ' || v_turno_compra)
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();

  ELSIF v_oferta.tipo = 'oferta_troca' THEN
    IF v_oferta.dia_iso_interesse IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
    END IF;
    IF v_oferta.dia_iso_interesse < v_hoje THEN
      RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
    END IF;
    v_ref_interesse := date_trunc('month', v_oferta.dia_iso_interesse)::date;
    IF NOT public._escala_marketplace_grade_aprovada(v_ref_interesse, v_area_ofertante)
       OR NOT public._escala_marketplace_grade_aprovada(v_ref_interesse, v_area_interessado)
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
    END IF;

    SELECT g.valor INTO v_origem_atual
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area_ofertante
      AND g.funcionario_id = v_oferta.ofertante_funcionario_id AND g.dia_iso = v_oferta.dia_iso;
    SELECT g.valor INTO v_interessado_origem
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area_interessado
      AND g.funcionario_id = v_oferta.interessado_funcionario_id AND g.dia_iso = v_oferta.dia_iso;
    SELECT g.valor INTO v_interesse_atual
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref_interesse AND g.area_key = v_area_interessado
      AND g.funcionario_id = v_oferta.interessado_funcionario_id AND g.dia_iso = v_oferta.dia_iso_interesse;
    SELECT g.valor INTO v_ofertante_interesse
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref_interesse AND g.area_key = v_area_ofertante
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
    WHERE ref_mes = v_ref AND area_key = v_area_ofertante
      AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;
    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area_interessado, v_oferta.interessado_funcionario_id, v_oferta.dia_iso, 'Compra - ' || v_turno_origem)
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref_interesse AND area_key = v_area_interessado
      AND funcionario_id = v_oferta.interessado_funcionario_id AND dia_iso = v_oferta.dia_iso_interesse;
    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (
      v_ref_interesse, v_area_ofertante, v_oferta.ofertante_funcionario_id,
      v_oferta.dia_iso_interesse, 'Compra - ' || v_turno_interesse
    )
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET status = 'aceita', aceito_em = now(), atualizado_em = now()
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object('ok', true, 'area_key', v_area_ofertante);
END;
$$;

CREATE OR REPLACE FUNCTION public._escala_marketplace_troca_recusar_sem_limite_2h(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta public.escala_marketplace_oferta%ROWTYPE;
  v_fid uuid := public._rh_funcionario_login_id();
BEGIN
  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_oferta.status <> 'em_analise' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;
  IF v_fid IS NULL OR v_fid <> v_oferta.ofertante_funcionario_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_e_ofertante');
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET
    status = 'aberta',
    interessado_funcionario_id = NULL,
    dia_iso_interesse = NULL,
    valor_celula_interesse = NULL,
    atualizado_em = now()
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.escala_marketplace_oferta_desistir(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta public.escala_marketplace_oferta%ROWTYPE;
  v_fid uuid := public._rh_funcionario_login_id();
  v_inicio timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_oferta.status <> 'em_analise' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;
  IF v_fid IS NULL OR v_fid <> v_oferta.interessado_funcionario_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_e_interessado');
  END IF;

  v_inicio := v_oferta.inicio_turno_at;
  IF public._escala_marketplace_limite_2h_atingido(v_inicio, v_oferta.dia_iso, now()) THEN
    UPDATE public.escala_marketplace_oferta
    SET status = 'expirada', atualizado_em = now()
    WHERE id = p_oferta_id;
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET
    status = 'aberta',
    interessado_funcionario_id = NULL,
    dia_iso_interesse = NULL,
    valor_celula_interesse = NULL,
    atualizado_em = now()
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_desistir(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_desistir(uuid) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) IS
  'Marketplace: aceite vira proposta Em análise (venda e troca). Escala só muda após o ofertante aprovar.';
COMMENT ON FUNCTION public.escala_marketplace_troca_aprovar(uuid) IS
  'Marketplace: ofertante aprova venda ou troca e aplica Compra - Turno / Venda na grade de cada participante.';
COMMENT ON FUNCTION public.escala_marketplace_troca_recusar(uuid) IS
  'Marketplace: ofertante recusa a proposta; a oferta volta ao mural.';
COMMENT ON FUNCTION public.escala_marketplace_oferta_desistir(uuid) IS
  'Marketplace: interessado desiste da compra/proposta; a oferta volta ao mural.';

CREATE OR REPLACE FUNCTION public.home_marketplace_alertas()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fid uuid := public._rh_funcionario_login_id();
BEGIN
  IF auth.uid() IS NULL OR v_fid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(x.item ORDER BY x.ordem, x.dia_iso, x.id)
    FROM (
      SELECT
        1 AS ordem,
        o.dia_iso,
        o.id,
        jsonb_build_object(
          'id', o.id,
          'kind', 'pendente',
          'tipo', o.tipo,
          'dia_iso', o.dia_iso
        ) AS item
      FROM public.escala_marketplace_oferta o
      WHERE o.ofertante_funcionario_id = v_fid
        AND o.status = 'em_analise'

      UNION ALL

      SELECT
        2 AS ordem,
        o.dia_iso,
        o.id,
        jsonb_build_object(
          'id', o.id,
          'kind', 'lembrete',
          'tipo', o.tipo,
          'dia_iso', o.dia_iso
        ) AS item
      FROM public.escala_marketplace_oferta o
      WHERE o.status = 'aceita'
        AND v_fid IN (o.ofertante_funcionario_id, o.interessado_funcionario_id)
        AND GREATEST(
          COALESCE(o.inicio_turno_at, ((o.dia_iso + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')),
          COALESCE(
            CASE
              WHEN o.tipo = 'oferta_troca' AND o.dia_iso_interesse IS NOT NULL THEN
                public._escala_marketplace_inicio_turno(
                  o.interessado_funcionario_id,
                  o.dia_iso_interesse,
                  COALESCE(
                    public._escala_marketplace_turno_label_grade(o.valor_celula_interesse),
                    o.turno_label
                  )
                )
              ELSE NULL
            END,
            '-infinity'::timestamptz
          )
        ) > now()
    ) x
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.home_marketplace_alertas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.home_marketplace_alertas() TO authenticated;

COMMENT ON FUNCTION public.home_marketplace_alertas() IS
  'Home: cards do prestador — propostas Em análise (ofertante) e aceitas até o início do turno (ambos).';

COMMIT;
