-- Marketplace: grupo lógico Liderança (Shift Leader + Service Manager).
-- Negociam entre si sem unificar Organograma nem a Escala Estúdio.
-- Cada prestador continua na própria area_key; o aceite grava Compra/Venda
-- na grade de cada um. Ver = Próprios vê o mural do grupo.

BEGIN;

CREATE OR REPLACE FUNCTION public._escala_marketplace_grupo_key(p_area_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(btrim(COALESCE(p_area_key, ''))) IN ('shift_leader', 'service_manager')
      THEN 'lideranca'
    ELSE lower(btrim(COALESCE(p_area_key, '')))
  END;
$$;

COMMENT ON FUNCTION public._escala_marketplace_grupo_key(text) IS
  'Marketplace: grupo de negociação. Shift Leader e Service Manager partilham lideranca; demais áreas ficam isoladas.';

CREATE OR REPLACE FUNCTION public._escala_marketplace_area_key_funcionario(p_fid uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public._escala_marketplace_area_key(f.org_time_id)
  FROM public.rh_funcionarios f
  WHERE f.id = p_fid;
$$;

CREATE OR REPLACE FUNCTION public._escala_marketplace_grade_aprovada(p_ref_mes date, p_area_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = p_ref_mes
      AND s.area_key = p_area_key
      AND s.status = 'aprovada'
  );
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_grupo_key(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_area_key_funcionario(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_grade_aprovada(date, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._escala_marketplace_mesmo_time(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_funcionarios a
    INNER JOIN public.rh_funcionarios b ON b.id = p_b
    WHERE a.id = p_a
      AND a.org_time_id IS NOT NULL
      AND b.org_time_id IS NOT NULL
      AND a.status IN ('ativo', 'indisponivel')
      AND b.status IN ('ativo', 'indisponivel')
      AND public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(a.org_time_id)) <> ''
      AND public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(a.org_time_id))
        = public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(b.org_time_id))
  );
$$;

COMMENT ON FUNCTION public._escala_marketplace_mesmo_time(uuid, uuid) IS
  'Marketplace: true quando os dois prestadores partilham o grupo de negociação (mesmo time, ou Liderança = SL + SM).';

-- Listagem interna (o wrapper público continua a expirar antes de listar).
CREATE OR REPLACE FUNCTION public._escala_marketplace_ofertas_listar_sem_expiracao_2h(p_ref_mes date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := CASE WHEN p_ref_mes IS NULL THEN NULL ELSE date_trunc('month', p_ref_mes)::date END;
  v_escopo text := public._escala_marketplace_escopo_view();
  v_fid uuid;
  v_time uuid;
  v_grupo text;
  v_out jsonb;
BEGIN
  IF v_escopo = 'nao' THEN
    RETURN '[]'::jsonb;
  END IF;

  v_fid := public._rh_funcionario_login_id();
  IF v_fid IS NOT NULL THEN
    SELECT f.org_time_id INTO v_time FROM public.rh_funcionarios f WHERE f.id = v_fid;
    v_grupo := public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(v_time));
  END IF;

  SELECT COALESCE(jsonb_agg(linha ORDER BY criado_em DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT
      o.criado_em,
      jsonb_build_object(
        'id', o.id,
        'tipo', o.tipo,
        'status', o.status,
        'dia_iso', o.dia_iso,
        'valor_celula_origem', o.valor_celula_origem,
        'turno_label', o.turno_label,
        'dia_iso_interesse', o.dia_iso_interesse,
        'valor_celula_interesse', o.valor_celula_interesse,
        'criado_em', o.criado_em,
        'atualizado_em', o.atualizado_em,
        'aceito_em', o.aceito_em,
        'observacao', o.observacao,
        'ofertante_funcionario_id', o.ofertante_funcionario_id,
        'ofertante_nome', fo.nome,
        'estudio_nome', NULLIF(public._escala_marketplace_estudio_label(fo), ''),
        'operadora_slug', btrim(COALESCE(fo.staff_operadora_slug, '')),
        'operadora_nome', op.nome,
        'org_time_id', o.org_time_id,
        'time_nome', t.nome,
        'interessado_funcionario_id', o.interessado_funcionario_id,
        'interessado_nome', fi.nome,
        'sou_ofertante', (v_fid IS NOT NULL AND o.ofertante_funcionario_id = v_fid),
        'sou_interessado', (v_fid IS NOT NULL AND o.interessado_funcionario_id = v_fid),
        'mesmo_time', (
          COALESCE(v_grupo, '') <> ''
          AND public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(o.org_time_id)) = v_grupo
        )
      ) AS linha
    FROM public.escala_marketplace_oferta o
    LEFT JOIN public.rh_funcionarios fo ON fo.id = o.ofertante_funcionario_id
    LEFT JOIN public.rh_funcionarios fi ON fi.id = o.interessado_funcionario_id
    LEFT JOIN public.rh_org_times t ON t.id = o.org_time_id
    LEFT JOIN public.operadoras op ON op.slug = btrim(fo.staff_operadora_slug)
    WHERE (v_ref IS NULL OR date_trunc('month', o.dia_iso)::date = v_ref)
      AND (
        v_escopo = 'sim'
        OR (
          COALESCE(v_grupo, '') <> ''
          AND public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(o.org_time_id)) = v_grupo
        )
        OR (v_fid IS NOT NULL AND o.ofertante_funcionario_id = v_fid)
      )
  ) sub;

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION public._escala_marketplace_ofertas_listar_sem_expiracao_2h(date) IS
  'Marketplace: listagem jsonb. Ver = Próprios devolve o grupo de negociação (Liderança = SL + SM).';

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
    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_aceitante::text || ':' || v_oferta.dia_iso::text, 0)
    );
    IF public._escala_marketplace_dia_reservado(v_aceitante, v_oferta.dia_iso, v_oferta.id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_reservado');
    END IF;

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area_ofertante
      AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area_aceitante, v_aceitante, v_oferta.dia_iso, 'Compra - ' || v_turno_compra)
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
    WHERE ref_mes = v_ref AND area_key = v_area_aceitante
      AND funcionario_id = v_aceitante AND dia_iso = v_oferta.dia_iso;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area_ofertante, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso, 'Compra - ' || v_turno_compra)
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

  RETURN jsonb_build_object('ok', true, 'area_key', v_area_ofertante);
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

  v_area_ofertante := public._escala_marketplace_area_key(v_oferta.org_time_id);
  v_area_interessado := public._escala_marketplace_area_key_funcionario(v_oferta.interessado_funcionario_id);
  v_ref := date_trunc('month', v_oferta.dia_iso)::date;
  v_ref_interesse := date_trunc('month', v_oferta.dia_iso_interesse)::date;
  IF v_oferta.dia_iso < v_hoje OR v_oferta.dia_iso_interesse < v_hoje THEN
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;
  IF v_area_ofertante IS NULL OR v_area_ofertante = ''
     OR v_area_interessado IS NULL OR v_area_interessado = ''
     OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_ofertante)
     OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_interessado)
     OR NOT public._escala_marketplace_grade_aprovada(v_ref_interesse, v_area_ofertante)
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

  UPDATE public.escala_marketplace_oferta
  SET status = 'aceita', aceito_em = now(), atualizado_em = now()
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object('ok', true, 'area_key', v_area_ofertante);
END;
$$;

CREATE OR REPLACE FUNCTION public._escala_marketplace_comentarios_registrar(p_oferta_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta public.escala_marketplace_oferta%ROWTYPE;
  v_ofertante public.rh_funcionarios%ROWTYPE;
  v_interessado public.rh_funcionarios%ROWTYPE;
  v_area_ofertante text;
  v_area_interessado text;
  v_nome_ofertante text;
  v_nome_interessado text;
  v_estudio_ofertante text;
  v_estudio_interessado text;
  v_turno_origem text;
  v_turno_interesse text;
BEGIN
  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id AND o.status = 'aceita';

  IF NOT FOUND OR v_oferta.interessado_funcionario_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_ofertante
  FROM public.rh_funcionarios f
  WHERE f.id = v_oferta.ofertante_funcionario_id;
  SELECT * INTO v_interessado
  FROM public.rh_funcionarios f
  WHERE f.id = v_oferta.interessado_funcionario_id;

  v_area_ofertante := public._escala_marketplace_area_key(v_ofertante.org_time_id);
  v_area_interessado := public._escala_marketplace_area_key(v_interessado.org_time_id);
  v_nome_ofertante := COALESCE(NULLIF(btrim(v_ofertante.nome), ''), 'Prestador');
  v_nome_interessado := COALESCE(NULLIF(btrim(v_interessado.nome), ''), 'Prestador');
  v_estudio_ofertante := COALESCE(
    NULLIF(public._escala_marketplace_estudio_label(v_ofertante), ''),
    '—'
  );
  v_estudio_interessado := COALESCE(
    NULLIF(public._escala_marketplace_estudio_label(v_interessado), ''),
    '—'
  );
  v_turno_origem := COALESCE(
    public._escala_marketplace_turno_label_grade(v_oferta.turno_label),
    public._escala_marketplace_turno_label_grade(v_oferta.valor_celula_origem),
    '—'
  );
  v_turno_interesse := COALESCE(
    public._escala_marketplace_turno_label_grade(v_oferta.valor_celula_interesse),
    '—'
  );

  DELETE FROM public.escala_marketplace_celula_comentario c
  WHERE c.oferta_id = p_oferta_id;

  IF v_oferta.tipo = 'venda_turno' THEN
    INSERT INTO public.escala_marketplace_celula_comentario (
      oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
      turno_trabalhar, estudio_trabalhar, valor_esperado
    )
    VALUES
      (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso,
        'venda', v_nome_interessado, NULL, NULL, 'Venda'
      ),
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso,
        'compra', v_nome_ofertante, v_turno_origem, v_estudio_ofertante,
        'Compra - ' || v_turno_origem
      );

  ELSIF v_oferta.tipo = 'venda_folga' THEN
    INSERT INTO public.escala_marketplace_celula_comentario (
      oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
      turno_trabalhar, estudio_trabalhar, valor_esperado
    )
    VALUES
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso,
        'venda', v_nome_ofertante, NULL, NULL, 'Venda'
      ),
      (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso,
        'compra', v_nome_interessado, v_turno_origem, v_estudio_interessado,
        'Compra - ' || v_turno_origem
      );

  ELSIF v_oferta.tipo = 'oferta_troca' AND v_oferta.dia_iso_interesse IS NOT NULL THEN
    INSERT INTO public.escala_marketplace_celula_comentario (
      oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
      turno_trabalhar, estudio_trabalhar, valor_esperado
    )
    VALUES
      (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso,
        'troca', v_nome_interessado, v_turno_interesse, v_estudio_interessado,
        CASE WHEN EXISTS (
          SELECT 1 FROM public.rh_gestao_escala_grade g
          WHERE g.funcionario_id = v_oferta.ofertante_funcionario_id
            AND g.dia_iso = v_oferta.dia_iso
            AND g.area_key = v_area_ofertante
            AND btrim(g.valor) = 'Troca'
        ) THEN 'Troca' ELSE 'Venda' END
      ),
      (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso_interesse,
        'troca', v_nome_interessado, v_turno_interesse, v_estudio_interessado,
        CASE WHEN EXISTS (
          SELECT 1 FROM public.rh_gestao_escala_grade g
          WHERE g.funcionario_id = v_oferta.ofertante_funcionario_id
            AND g.dia_iso = v_oferta.dia_iso_interesse
            AND g.area_key = v_area_ofertante
            AND btrim(g.valor) = 'Troca'
        ) THEN 'Troca' ELSE 'Compra - ' || v_turno_interesse END
      ),
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso,
        'troca', v_nome_ofertante, v_turno_origem, v_estudio_ofertante,
        CASE WHEN EXISTS (
          SELECT 1 FROM public.rh_gestao_escala_grade g
          WHERE g.funcionario_id = v_oferta.interessado_funcionario_id
            AND g.dia_iso = v_oferta.dia_iso
            AND g.area_key = v_area_interessado
            AND btrim(g.valor) = 'Troca'
        ) THEN 'Troca' ELSE 'Compra - ' || v_turno_origem END
      ),
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso_interesse,
        'troca', v_nome_ofertante, v_turno_origem, v_estudio_ofertante,
        CASE WHEN EXISTS (
          SELECT 1 FROM public.rh_gestao_escala_grade g
          WHERE g.funcionario_id = v_oferta.interessado_funcionario_id
            AND g.dia_iso = v_oferta.dia_iso_interesse
            AND g.area_key = v_area_interessado
            AND btrim(g.valor) = 'Troca'
        ) THEN 'Troca' ELSE 'Venda' END
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_marketplace_comentarios(
  p_ref_mes date,
  p_area_key text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(COALESCE(p_area_key, '')));
  v_out jsonb;
BEGIN
  IF auth.uid() IS NULL OR v_area = '' THEN
    RETURN '[]'::jsonb;
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
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'funcionario_id', c.funcionario_id,
        'dia_iso', c.dia_iso,
        'tipo', c.tipo,
        'contraparte_nome', c.contraparte_nome,
        'turno_trabalhar', c.turno_trabalhar,
        'estudio_trabalhar', c.estudio_trabalhar
      )
      ORDER BY c.dia_iso, c.funcionario_id
    ),
    '[]'::jsonb
  )
  INTO v_out
  FROM public.escala_marketplace_celula_comentario c
  INNER JOIN public.escala_marketplace_oferta o ON o.id = c.oferta_id
  INNER JOIN public.rh_gestao_escala_grade g
    ON g.funcionario_id = c.funcionario_id
   AND g.dia_iso = c.dia_iso
   AND g.ref_mes = v_ref
   AND g.area_key = v_area
   AND btrim(g.valor) = btrim(c.valor_esperado)
  WHERE date_trunc('month', c.dia_iso)::date = v_ref
    AND public._escala_marketplace_area_key_funcionario(c.funcionario_id) = v_area
    AND o.status = 'aceita';

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_marketplace_comentarios(date, text) IS
  'Comentários de Compra, Venda e Troca do Marketplace na área da Escala do próprio prestador (Liderança cruzada inclusa).';

COMMIT;
