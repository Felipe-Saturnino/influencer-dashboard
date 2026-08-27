-- Marketplace — gestão Spin propõe compra sobre venda P2P (GP/Shuffler): em_analise, aprovação do ofertante, 1 célula.

BEGIN;

ALTER TABLE public.escala_marketplace_oferta
  ADD COLUMN IF NOT EXISTS proposta_spin_gestao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proposta_spin_por_funcionario_id uuid NULL
    REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.escala_marketplace_oferta.proposta_spin_gestao IS
  'Proposta de compra em nome da Spin Gaming (Ver = Sim); interessado_funcionario_id fica NULL até aceite.';
COMMENT ON COLUMN public.escala_marketplace_oferta.proposta_spin_por_funcionario_id IS
  'Gestor que registrou a proposta Spin (auditoria).';

CREATE OR REPLACE FUNCTION public.escala_marketplace_oferta_propor_spin_gestao(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta public.escala_marketplace_oferta%ROWTYPE;
  v_gestor uuid;
  v_grupo text;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_area_ofertante text;
  v_ref date;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public._escala_marketplace_pode_gestao_spin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;

  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF COALESCE(v_oferta.oferta_spin, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tipo');
  END IF;

  IF v_oferta.tipo NOT IN ('venda_turno', 'venda_folga') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tipo');
  END IF;

  IF v_oferta.status NOT IN ('aberta', 'interessado') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;

  IF v_oferta.dia_iso < v_hoje THEN
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  IF v_oferta.inicio_turno_at IS NOT NULL AND v_oferta.inicio_turno_at < now() + interval '2 hours' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  v_grupo := public._escala_marketplace_grupo_key(
    public._escala_marketplace_area_key(v_oferta.org_time_id)
  );
  IF v_grupo NOT IN ('game_presenter', 'shuffler') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'time_nao_gp_shuffler');
  END IF;

  v_gestor := public._rh_funcionario_login_id();
  v_area_ofertante := public._escala_marketplace_area_key(v_oferta.org_time_id);
  v_ref := date_trunc('month', v_oferta.dia_iso)::date;

  IF v_area_ofertante IS NULL OR v_area_ofertante = ''
     OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_ofertante)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(chave, 0))
  FROM (
    SELECT DISTINCT v_oferta.ofertante_funcionario_id::text || ':' || v_oferta.dia_iso::text AS chave
  ) AS chaves;

  IF public._escala_marketplace_dia_reservado(
    v_oferta.ofertante_funcionario_id, v_oferta.dia_iso, v_oferta.id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_reservado');
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET
    status = 'em_analise',
    interessado_funcionario_id = NULL,
    dia_iso_interesse = NULL,
    valor_celula_interesse = NULL,
    proposta_spin_gestao = true,
    proposta_spin_por_funcionario_id = v_gestor,
    atualizado_em = now()
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object('ok', true, 'area_key', v_area_ofertante, 'em_analise', true);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_propor_spin_gestao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_propor_spin_gestao(uuid) TO authenticated;

-- Aprovar: ramo proposta Spin (só célula do ofertante).
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

  v_area_ofertante := public._escala_marketplace_area_key(v_oferta.org_time_id);
  v_ref := date_trunc('month', v_oferta.dia_iso)::date;
  IF v_oferta.dia_iso < v_hoje THEN
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  v_turno_compra := public._escala_marketplace_turno_label_grade(v_oferta.turno_label);
  IF v_turno_compra IS NULL THEN
    v_turno_compra := public._escala_marketplace_turno_label_grade(v_oferta.valor_celula_origem);
  END IF;

  IF COALESCE(v_oferta.proposta_spin_gestao, false) THEN
    IF v_oferta.tipo NOT IN ('venda_turno', 'venda_folga') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
    END IF;
    IF v_area_ofertante IS NULL OR v_area_ofertante = ''
       OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_ofertante)
       OR v_turno_compra IS NULL
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
    END IF;

    SELECT g.valor INTO v_origem_atual
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area_ofertante
      AND g.funcionario_id = v_oferta.ofertante_funcionario_id AND g.dia_iso = v_oferta.dia_iso;

    IF v_oferta.tipo = 'venda_turno' THEN
      IF btrim(COALESCE(v_origem_atual, '')) <> btrim(v_oferta.valor_celula_origem) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'escala_alterada');
      END IF;
      UPDATE public.rh_gestao_escala_grade
      SET valor = 'Venda', atualizado_em = now()
      WHERE ref_mes = v_ref AND area_key = v_area_ofertante
        AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;

    ELSIF v_oferta.tipo = 'venda_folga' THEN
      IF NOT public._escala_marketplace_valor_eh_folga(v_origem_atual) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'escala_alterada');
      END IF;
      INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
      VALUES (v_ref, v_area_ofertante, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso, 'Compra - ' || v_turno_compra)
      ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
      DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();
    END IF;

    UPDATE public.escala_marketplace_oferta
    SET status = 'aceita', aceito_em = now(), atualizado_em = now()
    WHERE id = p_oferta_id;

    PERFORM public._escala_marketplace_comentarios_registrar(p_oferta_id);

    RETURN jsonb_build_object('ok', true, 'area_key', v_area_ofertante);
  END IF;

  IF v_oferta.interessado_funcionario_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;

  v_area_interessado := public._escala_marketplace_area_key_funcionario(v_oferta.interessado_funcionario_id);
  IF v_area_ofertante IS NULL OR v_area_ofertante = ''
     OR v_area_interessado IS NULL OR v_area_interessado = ''
     OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_ofertante)
     OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_interessado)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
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

  PERFORM public._escala_marketplace_comentarios_registrar(p_oferta_id);

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
    proposta_spin_gestao = false,
    proposta_spin_por_funcionario_id = NULL,
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

  IF COALESCE(v_oferta.proposta_spin_gestao, false) THEN
    IF NOT public._escala_marketplace_pode_gestao_spin() THEN
      RETURN jsonb_build_object('ok', false, 'error', 'nao_e_interessado');
    END IF;
  ELSIF v_fid IS NULL OR v_fid <> v_oferta.interessado_funcionario_id THEN
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
    proposta_spin_gestao = false,
    proposta_spin_por_funcionario_id = NULL,
    atualizado_em = now()
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Listagem: interessado Spin Gaming quando proposta_spin_gestao.
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
        'inicio_turno_at', o.inicio_turno_at,
        'inicio_turno_interesse_at', CASE
          WHEN o.status = 'aceita'
           AND o.tipo = 'oferta_troca'
           AND o.dia_iso_interesse IS NOT NULL THEN
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
        'criado_em', o.criado_em,
        'atualizado_em', o.atualizado_em,
        'aceito_em', o.aceito_em,
        'observacao', o.observacao,
        'oferta_spin', COALESCE(o.oferta_spin, false),
        'proposta_spin_gestao', COALESCE(o.proposta_spin_gestao, false),
        'criado_por_funcionario_id', o.criado_por_funcionario_id,
        'estudio_slug', o.estudio_slug,
        'ofertante_funcionario_id', o.ofertante_funcionario_id,
        'ofertante_nome', CASE
          WHEN COALESCE(o.oferta_spin, false) THEN 'Spin Gaming'
          ELSE fo.nome
        END,
        'estudio_nome', COALESCE(
          NULLIF(btrim(es.nome), ''),
          NULLIF(public._escala_marketplace_estudio_label(fo), ''),
          ''
        ),
        'operadora_slug', btrim(COALESCE(fo.staff_operadora_slug, '')),
        'operadora_nome', op.nome,
        'org_time_id', o.org_time_id,
        'time_nome', t.nome,
        'interessado_funcionario_id', o.interessado_funcionario_id,
        'interessado_nome', CASE
          WHEN COALESCE(o.proposta_spin_gestao, false) THEN 'Spin Gaming'
          ELSE fi.nome
        END,
        'sou_ofertante', (
          v_fid IS NOT NULL
          AND NOT COALESCE(o.oferta_spin, false)
          AND o.ofertante_funcionario_id = v_fid
        ),
        'sou_criador_spin', (v_fid IS NOT NULL AND o.criado_por_funcionario_id = v_fid),
        'sou_interessado', (
          v_fid IS NOT NULL
          AND NOT COALESCE(o.proposta_spin_gestao, false)
          AND o.interessado_funcionario_id = v_fid
        ),
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
    LEFT JOIN public.estudios_spin es ON es.slug = o.estudio_slug
    WHERE (v_ref IS NULL OR date_trunc('month', o.dia_iso)::date = v_ref)
      AND (
        v_escopo = 'sim'
        OR (
          COALESCE(v_grupo, '') <> ''
          AND public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(o.org_time_id)) = v_grupo
        )
        OR (v_fid IS NOT NULL AND o.ofertante_funcionario_id = v_fid AND NOT COALESCE(o.oferta_spin, false))
      )
  ) sub;

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

-- Comentários: proposta Spin gestão (1 célula, contraparte Spin Gaming).
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
  v_estudio_spin text;
  v_turno_origem text;
  v_turno_interesse text;
BEGIN
  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id AND o.status = 'aceita';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_turno_origem := COALESCE(
    public._escala_marketplace_turno_label_grade(v_oferta.turno_label),
    public._escala_marketplace_turno_label_grade(v_oferta.valor_celula_origem),
    '—'
  );

  DELETE FROM public.escala_marketplace_celula_comentario c
  WHERE c.oferta_id = p_oferta_id;

  IF COALESCE(v_oferta.proposta_spin_gestao, false) THEN
    SELECT * INTO v_ofertante
    FROM public.rh_funcionarios f
    WHERE f.id = v_oferta.ofertante_funcionario_id;

    IF v_oferta.tipo = 'venda_turno' THEN
      INSERT INTO public.escala_marketplace_celula_comentario (
        oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
        turno_trabalhar, estudio_trabalhar, valor_esperado
      )
      VALUES (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso,
        'venda', 'Spin Gaming', NULL, NULL, 'Venda'
      );
    ELSIF v_oferta.tipo = 'venda_folga' THEN
      v_estudio_ofertante := COALESCE(
        NULLIF(public._escala_marketplace_estudio_label(v_ofertante), ''),
        '—'
      );
      INSERT INTO public.escala_marketplace_celula_comentario (
        oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
        turno_trabalhar, estudio_trabalhar, valor_esperado
      )
      VALUES (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso,
        'compra', 'Spin Gaming', v_turno_origem, v_estudio_ofertante,
        'Compra - ' || v_turno_origem
      );
    END IF;
    RETURN;
  END IF;

  IF v_oferta.interessado_funcionario_id IS NULL THEN
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
  v_turno_interesse := COALESCE(
    public._escala_marketplace_turno_label_grade(v_oferta.valor_celula_interesse),
    '—'
  );

  SELECT NULLIF(btrim(es.nome), '') INTO v_estudio_spin
  FROM public.estudios_spin es
  WHERE es.slug = v_oferta.estudio_slug;

  IF COALESCE(v_oferta.oferta_spin, false) AND v_oferta.tipo = 'oferta_spin_cobertura' THEN
    INSERT INTO public.escala_marketplace_celula_comentario (
      oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
      turno_trabalhar, estudio_trabalhar, valor_esperado
    )
    VALUES (
      v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso,
      'compra', 'Spin Gaming', v_turno_origem,
      COALESCE(v_estudio_spin, '—'),
      'Compra - ' || v_turno_origem
    );

  ELSIF COALESCE(v_oferta.oferta_spin, false) AND v_oferta.tipo = 'oferta_spin_liberacao' THEN
    INSERT INTO public.escala_marketplace_celula_comentario (
      oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
      turno_trabalhar, estudio_trabalhar, valor_esperado
    )
    VALUES (
      v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso,
      'venda', 'Spin Gaming', NULL, NULL, 'Venda'
    );

  ELSIF v_oferta.tipo = 'venda_turno' THEN
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
            AND btrim(COALESCE(g.valor, '')) LIKE 'Compra - %'
        ) THEN 'Compra - ' || v_turno_origem ELSE 'Venda' END
      ),
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso,
        'troca', v_nome_ofertante, v_turno_origem, v_estudio_ofertante,
        'Compra - ' || v_turno_origem
      ),
      (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso_interesse,
        'troca', v_nome_interessado, v_turno_interesse, v_estudio_interessado,
        'Compra - ' || v_turno_interesse
      ),
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso_interesse,
        'troca', v_nome_ofertante, v_turno_origem, v_estudio_ofertante,
        'Venda'
      );
  END IF;
END;
$$;

COMMIT;
