-- =============================================================================
-- SUPABASE → SQL Editor → New query → cole TUDO → Run
--
-- Marketplace — fix compra Spin gestão (versão definitiva, 2026-11-27)
-- Idempotente: pode executar mais de uma vez.
-- Pré-requisito: compra Spin gestão já instalada (migration 26200000 no banco).
--
-- Corrige:
--   • sou_interessado na listagem = só P2P (não gestão Spin)
--   • aprovar compra Spin mantém proposta_spin_gestao + comentário na célula
--   • repara aceitas afetadas por script anterior
-- =============================================================================

BEGIN;

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
        'estudio_nome', CASE
          WHEN lower(btrim(COALESCE(o.estudio_slug, ''))) = 'todos' THEN 'Todos Estúdios'
          ELSE COALESCE(
            NULLIF(btrim(es.nome), ''),
            NULLIF(public._escala_marketplace_estudio_label(fo), ''),
            ''
          )
        END,
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

COMMENT ON FUNCTION public._escala_marketplace_ofertas_listar_sem_expiracao_2h(date) IS
  'Listagem Marketplace (jsonb). sou_interessado = prestador P2P; proposta Spin gestão não usa esta flag.';

UPDATE public.escala_marketplace_oferta o
SET proposta_spin_gestao = true, atualizado_em = now()
WHERE o.status = 'aceita'
  AND COALESCE(o.proposta_spin_gestao, false) = false
  AND o.interessado_funcionario_id IS NULL
  AND NOT COALESCE(o.oferta_spin, false)
  AND o.tipo IN ('venda_turno', 'venda_folga');

DO $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN
    SELECT o.id
    FROM public.escala_marketplace_oferta o
    WHERE o.status = 'aceita'
      AND COALESCE(o.proposta_spin_gestao, false) = true
      AND o.interessado_funcionario_id IS NULL
      AND NOT COALESCE(o.oferta_spin, false)
      AND o.tipo IN ('venda_turno', 'venda_folga')
      AND NOT EXISTS (
        SELECT 1
        FROM public.escala_marketplace_celula_comentario c
        WHERE c.oferta_id = o.id
      )
  LOOP
    PERFORM public._escala_marketplace_comentarios_registrar(v_id);
  END LOOP;
END $$;

COMMIT;
