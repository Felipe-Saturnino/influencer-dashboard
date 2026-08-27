-- Ofertas Spin: Shuffler / Liderança usam estudio_slug = «todos» (Todos Estúdios).
-- Idempotente se 20261126180000 / 20261126200000 já trouxerem a regra.

BEGIN;

ALTER TABLE public.escala_marketplace_oferta
  DROP CONSTRAINT IF EXISTS escala_marketplace_oferta_estudio_slug_fkey;

COMMENT ON COLUMN public.escala_marketplace_oferta.estudio_slug IS
  'Estúdio da publicação Spin: slug de estudios_spin ou «todos» (Shuffler/Liderança — Todos Estúdios).';

CREATE OR REPLACE FUNCTION public._escala_marketplace_inicio_turno_por_estudio(
  p_estudio_slug text,
  p_dia_iso date,
  p_turno_label text
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text := lower(btrim(COALESCE(p_estudio_slug, '')));
  v_turno text := btrim(COALESCE(p_turno_label, ''));
  v_hora time;
BEGIN
  IF v_slug = '' OR p_dia_iso IS NULL OR v_turno = '' THEN
    RETURN NULL;
  END IF;

  IF v_slug = 'todos' THEN
    SELECT CASE v_turno
      WHEN 'Manhã' THEN e.turno_manha_inicio
      WHEN 'Tarde' THEN e.turno_tarde_inicio
      WHEN 'Noite' THEN e.turno_noite_inicio
      ELSE NULL
    END
    INTO v_hora
    FROM public.estudios_spin e
    WHERE e.ativo = true
      AND CASE v_turno
        WHEN 'Manhã' THEN e.turno_manha_inicio
        WHEN 'Tarde' THEN e.turno_tarde_inicio
        WHEN 'Noite' THEN e.turno_noite_inicio
        ELSE NULL
      END IS NOT NULL
    ORDER BY e.nome
    LIMIT 1;
  ELSE
    SELECT CASE v_turno
      WHEN 'Manhã' THEN e.turno_manha_inicio
      WHEN 'Tarde' THEN e.turno_tarde_inicio
      WHEN 'Noite' THEN e.turno_noite_inicio
      ELSE NULL
    END
    INTO v_hora
    FROM public.estudios_spin e
    WHERE e.slug = btrim(p_estudio_slug)
      AND e.ativo = true
    LIMIT 1;
  END IF;

  IF v_hora IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (p_dia_iso + v_hora) AT TIME ZONE 'America/Sao_Paulo';
END;
$$;

CREATE OR REPLACE FUNCTION public.escala_marketplace_oferta_spin_criar(
  p_tipo text,
  p_org_time_id uuid,
  p_dia_iso date,
  p_turno_label text,
  p_estudio_slug text,
  p_observacao text DEFAULT NULL
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
  v_area text;
  v_grupo text;
  v_ref date;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_fid uuid;
  v_inicio timestamptz;
  v_id uuid;
  v_valor_origem text;
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

  IF EXISTS (
    SELECT 1 FROM public.escala_marketplace_oferta o
    WHERE o.oferta_spin = true
      AND o.org_time_id = p_org_time_id
      AND o.dia_iso = p_dia_iso
      AND o.turno_label = v_turno
      AND o.tipo = v_tipo
      AND o.status IN ('aberta', 'interessado', 'em_analise')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_duplicada');
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

  INSERT INTO public.escala_marketplace_oferta (
    tipo, status, ofertante_funcionario_id, org_time_id, dia_iso,
    valor_celula_origem, turno_label, observacao,
    oferta_spin, criado_por_funcionario_id, estudio_slug, inicio_turno_at
  )
  VALUES (
    v_tipo, 'aberta', v_fid, p_org_time_id, p_dia_iso,
    v_valor_origem, v_turno, nullif(btrim(COALESCE(p_observacao, '')), ''),
    true, v_fid, v_estudio, v_inicio
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- Rótulo «Todos Estúdios» na listagem (função interna usada por escala_marketplace_ofertas_listar).
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

COMMIT;
