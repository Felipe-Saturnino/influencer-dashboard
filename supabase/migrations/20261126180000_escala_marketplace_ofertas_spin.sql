-- Marketplace — Ofertas Spin (operacionais): ofertante Spin Gaming, aceite direto, 1 célula na grade.
-- Executa após o fluxo Marketplace (202611*) para não sobrescrever RPCs com versões antigas.

BEGIN;

ALTER TABLE public.escala_marketplace_oferta
  ADD COLUMN IF NOT EXISTS oferta_spin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS criado_por_funcionario_id uuid NULL
    REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estudio_slug text NULL
    REFERENCES public.estudios_spin (slug) ON UPDATE CASCADE ON DELETE SET NULL;

COMMENT ON COLUMN public.escala_marketplace_oferta.oferta_spin IS
  'Oferta operacional Spin Gaming — aceite altera só a grade do prestador aceitante.';
COMMENT ON COLUMN public.escala_marketplace_oferta.criado_por_funcionario_id IS
  'Autor da oferta Spin (auditoria); ofertante exibido na UI = Spin Gaming.';
COMMENT ON COLUMN public.escala_marketplace_oferta.estudio_slug IS
  'Estúdio escolhido na publicação Spin (horários e exibição).';

ALTER TABLE public.escala_marketplace_oferta
  DROP CONSTRAINT IF EXISTS escala_marketplace_oferta_tipo_check;

ALTER TABLE public.escala_marketplace_oferta
  ADD CONSTRAINT escala_marketplace_oferta_tipo_check
  CHECK (
    tipo IN (
      'venda_turno',
      'venda_folga',
      'oferta_troca',
      'oferta_spin_cobertura',
      'oferta_spin_liberacao'
    )
  );

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
  v_turno text := btrim(COALESCE(p_turno_label, ''));
  v_hora time;
BEGIN
  IF p_estudio_slug IS NULL OR btrim(p_estudio_slug) = '' OR p_dia_iso IS NULL OR v_turno = '' THEN
    RETURN NULL;
  END IF;

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

  IF v_hora IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (p_dia_iso + v_hora) AT TIME ZONE 'America/Sao_Paulo';
END;
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_inicio_turno_por_estudio(text, date, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._escala_marketplace_aceitante_no_grupo_oferta(
  p_org_time_id uuid,
  p_aceitante uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p_org_time_id, NULL::uuid) IS NOT NULL
    AND COALESCE(p_aceitante, NULL::uuid) IS NOT NULL
    AND public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(p_org_time_id)) <> ''
    AND public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(p_org_time_id))
      = public._escala_marketplace_grupo_key(
          public._escala_marketplace_area_key_funcionario(p_aceitante)
        );
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_aceitante_no_grupo_oferta(uuid, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._escala_marketplace_pode_gestao_spin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._escala_marketplace_escopo_view() = 'sim'
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_pode_gestao_spin() FROM PUBLIC;

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

  IF v_estudio IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'estudio_obrigatorio');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.estudios_spin e WHERE e.slug = v_estudio AND e.ativo = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'estudio_invalido');
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

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_spin_criar(text, uuid, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_spin_criar(text, uuid, date, text, text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.escala_marketplace_oferta_spin_aceitar(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta public.escala_marketplace_oferta%ROWTYPE;
  v_aceitante uuid;
  v_area_aceitante text;
  v_area_oferta text;
  v_ref date;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_cel_aceitante text;
  v_turno_compra text;
  v_turno_aceitante text;
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

  IF COALESCE(v_oferta.oferta_spin, false) IS NOT TRUE THEN
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

  SELECT f.id INTO v_aceitante
  FROM public.rh_funcionarios f
  WHERE f.id = public._rh_funcionario_login_id()
    AND f.status IN ('ativo', 'indisponivel')
    AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = 'estudio'
  LIMIT 1;

  IF v_aceitante IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'prestador_nao_encontrado');
  END IF;

  IF v_aceitante = v_oferta.criado_por_funcionario_id
     AND NOT public._escala_marketplace_pode_gestao_spin()
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'mesmo_ofertante');
  END IF;

  IF NOT public._escala_marketplace_aceitante_no_grupo_oferta(v_oferta.org_time_id, v_aceitante) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'times_diferentes');
  END IF;

  v_area_oferta := public._escala_marketplace_area_key(v_oferta.org_time_id);
  v_area_aceitante := public._escala_marketplace_area_key_funcionario(v_aceitante);
  v_ref := date_trunc('month', v_oferta.dia_iso)::date;

  IF v_area_oferta IS NULL OR v_area_oferta = ''
     OR v_area_aceitante IS NULL OR v_area_aceitante = ''
     OR NOT public._escala_marketplace_grade_aprovada(v_ref, v_area_aceitante)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  v_turno_compra := public._escala_marketplace_turno_label_grade(v_oferta.turno_label);
  IF v_turno_compra IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'turno_invalido');
  END IF;

  SELECT g.valor INTO v_cel_aceitante
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area_aceitante
    AND g.funcionario_id = v_aceitante AND g.dia_iso = v_oferta.dia_iso
  LIMIT 1;

  IF public._escala_marketplace_dia_reservado(v_aceitante, v_oferta.dia_iso, v_oferta.id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_reservado');
  END IF;

  IF v_oferta.tipo = 'oferta_spin_cobertura' THEN
    IF NOT public._escala_marketplace_valor_eh_folga(v_cel_aceitante) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_ja_escalado');
    END IF;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area_aceitante, v_aceitante, v_oferta.dia_iso, 'Compra - ' || v_turno_compra)
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();

  ELSIF v_oferta.tipo = 'oferta_spin_liberacao' THEN
    v_turno_aceitante := public._escala_marketplace_turno_label_grade(v_cel_aceitante);
    IF v_turno_aceitante IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_sem_turno');
    END IF;
    IF v_turno_aceitante <> v_turno_compra THEN
      RETURN jsonb_build_object('ok', false, 'error', 'turno_diferente');
    END IF;
    IF NOT public._escala_marketplace_valor_eh_folga(v_cel_aceitante)
       AND btrim(COALESCE(v_cel_aceitante, '')) NOT IN ('Compra', 'Venda', 'Troca')
       AND btrim(COALESCE(v_cel_aceitante, '')) NOT LIKE 'Compra - %'
    THEN
      UPDATE public.rh_gestao_escala_grade
      SET valor = 'Venda', atualizado_em = now()
      WHERE ref_mes = v_ref AND area_key = v_area_aceitante
        AND funcionario_id = v_aceitante AND dia_iso = v_oferta.dia_iso;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_em_negociacao');
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tipo');
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET
    status = 'aceita',
    interessado_funcionario_id = v_aceitante,
    aceito_em = now(),
    atualizado_em = now()
  WHERE id = p_oferta_id;

  PERFORM public._escala_marketplace_comentarios_registrar(p_oferta_id);

  RETURN jsonb_build_object('ok', true, 'area_key', v_area_aceitante, 'em_analise', false);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_spin_aceitar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_spin_aceitar(uuid) TO authenticated;

-- Listagem: base 20261120130000 + campos Spin.
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
        'interessado_nome', fi.nome,
        'sou_ofertante', (
          v_fid IS NOT NULL
          AND NOT COALESCE(o.oferta_spin, false)
          AND o.ofertante_funcionario_id = v_fid
        ),
        'sou_criador_spin', (v_fid IS NOT NULL AND o.criado_por_funcionario_id = v_fid),
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

-- Cancelar: base troca_em_analise + gestão Spin / criador.
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

  IF COALESCE(v_oferta.oferta_spin, false) THEN
    IF NOT COALESCE(v_admin, false)
       AND NOT public._escala_marketplace_pode_gestao_spin()
       AND (v_fid IS NULL OR v_fid <> v_oferta.criado_por_funcionario_id)
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'nao_e_ofertante');
    END IF;
  ELSE
    IF NOT COALESCE(v_admin, false) AND (v_fid IS NULL OR v_fid <> v_oferta.ofertante_funcionario_id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'nao_e_ofertante');
    END IF;
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

-- Comentários: base grupo_lideranca + ramos Spin (1 célula).
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

  SELECT NULLIF(btrim(es.nome), '') INTO v_estudio_spin
  FROM public.estudios_spin es
  WHERE es.slug = v_oferta.estudio_slug;

  DELETE FROM public.escala_marketplace_celula_comentario c
  WHERE c.oferta_id = p_oferta_id;

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

COMMENT ON FUNCTION public.escala_marketplace_oferta_spin_criar(text, uuid, date, text, text, text) IS
  'Ofertas Spin operacionais — Ver = Sim; aceite altera 1 célula na grade do prestador.';
COMMENT ON FUNCTION public.escala_marketplace_oferta_spin_aceitar(uuid) IS
  'Aceite direto de oferta Spin (sem em_analise) — cobertura = Compra; liberação = Venda.';

COMMIT;
