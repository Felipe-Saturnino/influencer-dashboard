-- Marketplace: Oferta de Troca passa por proposta e aprovação do ofertante.
-- Enquanto em análise, os dois prestadores e os dois dias ficam reservados.

BEGIN;

ALTER TABLE public.escala_marketplace_oferta
  DROP CONSTRAINT IF EXISTS escala_marketplace_oferta_status_check;

ALTER TABLE public.escala_marketplace_oferta
  ADD CONSTRAINT escala_marketplace_oferta_status_check
  CHECK (status IN ('aberta', 'interessado', 'em_analise', 'aceita', 'recusada', 'cancelada', 'expirada'));

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
          AND o.tipo = 'oferta_troca'
          AND p_funcionario_id IN (o.ofertante_funcionario_id, o.interessado_funcionario_id)
          AND p_dia IN (o.dia_iso, o.dia_iso_interesse)
        )
      )
  );
$$;

COMMENT ON FUNCTION public._escala_marketplace_dia_reservado(uuid, date, uuid) IS
  'Impede que os dias de uma negociação ativa sejam usados em outra oferta/proposta.';

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

  IF v_tipo NOT IN ('venda_turno', 'venda_folga', 'oferta_troca') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tipo');
  END IF;
  IF p_dia_iso IS NULL OR p_dia_iso < v_hoje THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_nao_futuro');
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

  PERFORM pg_advisory_xact_lock(hashtextextended(v_fid::text || ':' || p_dia_iso::text, 0));
  IF public._escala_marketplace_dia_reservado(v_fid, p_dia_iso) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_reservado');
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
    IF v_celula_norm NOT IN ('folga', 'f', 'venda') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_nao_folga');
    END IF;
    IF v_turno IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'turno_obrigatorio');
    END IF;
  ELSE
    v_turno := public._escala_marketplace_turno_label_grade(v_celula);
    IF v_turno IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_sem_turno');
    END IF;
  END IF;

  v_valor_origem := btrim(COALESCE(v_celula, ''));
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
  IF v_oferta.dia_iso <= v_hoje THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_nao_futuro');
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
    IF p_dia_iso_interesse <= v_hoje OR p_dia_iso_interesse = v_oferta.dia_iso THEN
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

CREATE OR REPLACE FUNCTION public.escala_marketplace_troca_aprovar(p_oferta_id uuid)
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
  IF v_oferta.dia_iso <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    OR v_oferta.dia_iso_interesse <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_nao_futuro');
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

CREATE OR REPLACE FUNCTION public.escala_marketplace_troca_recusar(p_oferta_id uuid)
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
  IF v_oferta.tipo <> 'oferta_troca' OR v_oferta.status <> 'em_analise' THEN
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

CREATE OR REPLACE FUNCTION public.escala_marketplace_oferta_cancelar(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta public.escala_marketplace_oferta%ROWTYPE;
  v_fid uuid;
  v_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;

  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  INTO v_admin;
  v_fid := public._rh_funcionario_login_id();
  IF NOT COALESCE(v_admin, false) AND (v_fid IS NULL OR v_fid <> v_oferta.ofertante_funcionario_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_e_ofertante');
  END IF;
  IF v_oferta.status NOT IN ('aberta', 'interessado', 'em_analise') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET status = 'cancelada', atualizado_em = now()
  WHERE id = p_oferta_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_troca_aprovar(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.escala_marketplace_troca_recusar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_troca_aprovar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_troca_recusar(uuid) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) IS
  'Marketplace: vendas têm aceite direto; troca registra proposta em análise sem alterar a grade.';
COMMENT ON FUNCTION public.escala_marketplace_troca_aprovar(uuid) IS
  'Marketplace: ofertante aprova proposta e aplica Compra - Turno / Venda nos dois dias.';
COMMENT ON FUNCTION public.escala_marketplace_troca_recusar(uuid) IS
  'Marketplace: ofertante recusa proposta, libera os dias e devolve a oferta ao mural.';

COMMIT;
