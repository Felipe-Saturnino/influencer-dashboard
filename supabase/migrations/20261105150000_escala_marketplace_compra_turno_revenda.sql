-- Marketplace — Compra/Venda preservam comportamento operacional.
--
-- Grade:
--   Compra - Manhã/Tarde/Noite/Comercial = dia trabalhado naquele turno.
--   Venda                                  = dia livre (equivalente operacional a Folga).
--
-- Isso permite revender um turno comprado e negociar novamente um dia vendido.

BEGIN;

CREATE OR REPLACE FUNCTION public._escala_marketplace_turno_label_grade(p_valor text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(btrim(COALESCE(p_valor, ''))) IN ('mrn', 'manhã', 'manha') THEN 'Manhã'
    WHEN lower(btrim(COALESCE(p_valor, ''))) IN ('aft', 'tarde') THEN 'Tarde'
    WHEN lower(btrim(COALESCE(p_valor, ''))) IN ('ngt', 'noite') THEN 'Noite'
    WHEN lower(btrim(COALESCE(p_valor, ''))) = 'comercial' THEN 'Comercial'
    WHEN lower(btrim(COALESCE(p_valor, ''))) ~ '^compra[[:space:]]*-[[:space:]]*(manhã|manha)$' THEN 'Manhã'
    WHEN lower(btrim(COALESCE(p_valor, ''))) ~ '^compra[[:space:]]*-[[:space:]]*tarde$' THEN 'Tarde'
    WHEN lower(btrim(COALESCE(p_valor, ''))) ~ '^compra[[:space:]]*-[[:space:]]*noite$' THEN 'Noite'
    WHEN lower(btrim(COALESCE(p_valor, ''))) ~ '^compra[[:space:]]*-[[:space:]]*comercial$' THEN 'Comercial'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public._escala_marketplace_valor_eh_folga(p_valor text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(btrim(COALESCE(p_valor, ''))) IN ('', 'folga', 'f', 'venda');
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_turno_label_grade(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_valor_eh_folga(text) FROM PUBLIC;

-- Publicação: Compra - Turno pode ser vendida/trocada; Venda pode publicar Venda de Folga.
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

  IF v_tipo NOT IN ('venda_turno', 'venda_folga', 'oferta_troca') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tipo');
  END IF;

  v_primeiro_dia := v_hoje + 2;
  IF p_dia_iso IS NULL OR p_dia_iso < v_primeiro_dia THEN
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

-- Aceite: comprador recebe Compra - Turno; vendedor recebe Venda.
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
  WHERE g.ref_mes = v_ref
    AND g.area_key = v_area
    AND g.funcionario_id = v_aceitante
    AND g.dia_iso = v_oferta.dia_iso
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

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area
      AND funcionario_id = v_aceitante AND dia_iso = v_oferta.dia_iso;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (
      v_ref, v_area, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso,
      'Compra - ' || v_turno_compra
    )
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();

  ELSE
    IF NOT public._escala_marketplace_valor_eh_folga(v_cel_aceitante) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_ja_escalado');
    END IF;
    IF p_dia_iso_interesse IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_interesse_obrigatorio');
    END IF;
    IF p_dia_iso_interesse <= v_hoje THEN
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
    WHERE g.ref_mes = v_ref_interesse
      AND g.area_key = v_area
      AND g.funcionario_id = v_aceitante
      AND g.dia_iso = p_dia_iso_interesse
    LIMIT 1;

    IF public._escala_marketplace_turno_label_grade(v_cel_aceitante_interesse) IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_interesse_sem_turno');
    END IF;

    SELECT g.valor INTO v_cel_ofertante_interesse
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref_interesse
      AND g.area_key = v_area
      AND g.funcionario_id = v_oferta.ofertante_funcionario_id
      AND g.dia_iso = p_dia_iso_interesse
    LIMIT 1;

    IF NOT public._escala_marketplace_valor_eh_folga(v_cel_ofertante_interesse) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'ofertante_ja_escalado');
    END IF;

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Troca', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area
      AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area, v_aceitante, v_oferta.dia_iso, 'Troca')
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = 'Troca', atualizado_em = now();

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Troca', atualizado_em = now()
    WHERE ref_mes = v_ref_interesse AND area_key = v_area
      AND funcionario_id = v_aceitante AND dia_iso = p_dia_iso_interesse;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref_interesse, v_area, v_oferta.ofertante_funcionario_id, p_dia_iso_interesse, 'Troca')
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = 'Troca', atualizado_em = now();
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

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) IS
  'Marketplace: publica oferta com >=24h. Compra - Turno conta como escalado; Venda conta como folga.';
COMMENT ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) IS
  'Marketplace: aceite direto. Comprador recebe Compra - Turno e vendedor recebe Venda; comportamentos operacionais são preservados em futuras negociações.';

COMMIT;
