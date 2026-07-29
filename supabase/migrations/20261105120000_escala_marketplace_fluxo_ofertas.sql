-- Marketplace de turnos — fluxo funcional das ofertas.
--
-- Listagem passa a devolver jsonb (evita o limite ~1000 linhas do PostgREST) já
-- enriquecida com nomes (prestador com RLS restrita não lê `rh_funcionarios` de
-- colegas) e com o escopo aplicado no servidor: Ver = Sim vê todos os times,
-- Ver = Próprios vê apenas o próprio time.
--
-- Acrescenta contexto do prestador e grade própria do mês (necessários ao modal
-- Ofertar), validações estruturais em criar/aceitar e a RPC de cancelar.

BEGIN;

-- ─── Helpers ────────────────────────────────────────────────────────────────

/** `area_key` da Escala Estúdio a partir do time do Organograma. */
CREATE OR REPLACE FUNCTION public._escala_marketplace_area_key(p_org_time_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%performance coach%' THEN 'academy'
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE 'treinamento%' THEN 'academy'
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) = 'academy' THEN 'academy'
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%game presenter%' THEN 'game_presenter'
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shift leader%' THEN 'shift_leader'
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shuffler%' THEN 'shuffler'
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%service manager%' THEN 'service_manager'
    ELSE 't_' || replace(t.id::text, '-', '')
  END
  FROM public.rh_org_times t
  WHERE t.id = p_org_time_id;
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_area_key(uuid) FROM PUBLIC;

COMMENT ON FUNCTION public._escala_marketplace_area_key(uuid) IS
  'Marketplace: area_key da Escala Estúdio para o time (Performance Coach / Treinamento → academy).';

/** Escopo de leitura do Marketplace: `sim` (todos os times), `proprios` (só o seu) ou `nao`. */
CREATE OR REPLACE FUNCTION public._escala_marketplace_escopo_view()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_valor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'nao';
  END IF;

  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    RETURN 'nao';
  END IF;

  IF v_role = 'admin' THEN
    RETURN 'sim';
  END IF;

  IF v_role = 'prestador'
     AND NOT public._prestador_page_perm('escala_marketplace_turnos', 'view') THEN
    RETURN 'nao';
  END IF;

  SELECT rp.can_view
  INTO v_valor
  FROM public.role_permissions rp
  WHERE rp.role::text = v_role
    AND rp.page_key = 'escala_marketplace_turnos'
  LIMIT 1;

  IF v_valor = 'sim' THEN
    RETURN 'sim';
  END IF;
  IF v_valor = 'proprios' THEN
    RETURN 'proprios';
  END IF;
  RETURN 'nao';
END;
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_escopo_view() FROM PUBLIC;

COMMENT ON FUNCTION public._escala_marketplace_escopo_view() IS
  'Marketplace: sim = ofertas de todos os times; proprios = só o time do prestador; nao = sem acesso.';

-- ─── Contexto do prestador logado ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.escala_marketplace_meu_contexto()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escopo text := public._escala_marketplace_escopo_view();
  v_fid uuid;
  v_out jsonb;
BEGIN
  IF v_escopo = 'nao' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_fid := public._rh_funcionario_login_id();
  IF v_fid IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'escopo', v_escopo, 'funcionario', NULL);
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'escopo', v_escopo,
    'funcionario', jsonb_build_object(
      'id', f.id,
      'nome', f.nome,
      'org_time_id', f.org_time_id,
      'time_nome', t.nome,
      'area_key', public._escala_marketplace_area_key(f.org_time_id),
      'area_atuacao', lower(btrim(COALESCE(f.area_atuacao, 'estudio'))),
      'escala', f.escala,
      'staff_turno', f.staff_turno,
      'staff_horario_turno', f.staff_horario_turno,
      'staff_operadora_slug', f.staff_operadora_slug
    ),
    'operadora', CASE
      WHEN o.slug IS NULL THEN NULL
      ELSE jsonb_build_object(
        'slug', o.slug,
        'nome', o.nome,
        'turno_manha_inicio', o.turno_manha_inicio,
        'turno_tarde_inicio', o.turno_tarde_inicio,
        'turno_noite_inicio', o.turno_noite_inicio
      )
    END
  )
  INTO v_out
  FROM public.rh_funcionarios f
  LEFT JOIN public.rh_org_times t ON t.id = f.org_time_id
  LEFT JOIN public.operadoras o ON o.slug = btrim(f.staff_operadora_slug)
  WHERE f.id = v_fid;

  RETURN COALESCE(v_out, jsonb_build_object('ok', true, 'escopo', v_escopo, 'funcionario', NULL));
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_meu_contexto() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_meu_contexto() TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_meu_contexto() IS
  'Marketplace: prestador ligado ao login (time, area_key, escala/turno) + horários da operadora, para o modal Ofertar.';

-- ─── Grade própria do mês (escala aprovada) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.escala_marketplace_minha_grade_mes(p_ref_mes date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', COALESCE(p_ref_mes, CURRENT_DATE))::date;
  v_fid uuid;
  v_time uuid;
  v_area text;
  v_aprovada boolean;
  v_dias jsonb;
BEGIN
  IF public._escala_marketplace_escopo_view() = 'nao' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_fid := public._rh_funcionario_login_id();
  IF v_fid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'prestador_nao_encontrado');
  END IF;

  SELECT f.org_time_id INTO v_time FROM public.rh_funcionarios f WHERE f.id = v_fid;
  v_area := public._escala_marketplace_area_key(v_time);

  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'area_invalida');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref AND s.area_key = v_area AND s.status = 'aprovada'
  ) INTO v_aprovada;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('dia_iso', g.dia_iso, 'valor', g.valor) ORDER BY g.dia_iso),
    '[]'::jsonb
  )
  INTO v_dias
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref
    AND g.area_key = v_area
    AND g.funcionario_id = v_fid
    AND COALESCE(v_aprovada, false);

  RETURN jsonb_build_object(
    'ok', true,
    'ref_mes', v_ref,
    'area_key', v_area,
    'aprovada', COALESCE(v_aprovada, false),
    'dias', COALESCE(v_dias, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_minha_grade_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_minha_grade_mes(date) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_minha_grade_mes(date) IS
  'Marketplace: células da escala aprovada do mês do prestador logado (dia_iso + valor) para montar as opções de oferta.';

-- ─── Listagem com escopo e nomes resolvidos ─────────────────────────────────

DROP FUNCTION IF EXISTS public.escala_marketplace_ofertas_listar(date);

CREATE FUNCTION public.escala_marketplace_ofertas_listar(p_ref_mes date DEFAULT NULL)
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
  v_out jsonb;
BEGIN
  IF v_escopo = 'nao' THEN
    RETURN '[]'::jsonb;
  END IF;

  v_fid := public._rh_funcionario_login_id();
  IF v_fid IS NOT NULL THEN
    SELECT f.org_time_id INTO v_time FROM public.rh_funcionarios f WHERE f.id = v_fid;
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
        'operadora_slug', btrim(COALESCE(fo.staff_operadora_slug, '')),
        'operadora_nome', op.nome,
        'org_time_id', o.org_time_id,
        'time_nome', t.nome,
        'interessado_funcionario_id', o.interessado_funcionario_id,
        'interessado_nome', fi.nome,
        'sou_ofertante', (v_fid IS NOT NULL AND o.ofertante_funcionario_id = v_fid),
        'sou_interessado', (v_fid IS NOT NULL AND o.interessado_funcionario_id = v_fid),
        'mesmo_time', (v_time IS NOT NULL AND o.org_time_id = v_time)
      ) AS linha
    FROM public.escala_marketplace_oferta o
    LEFT JOIN public.rh_funcionarios fo ON fo.id = o.ofertante_funcionario_id
    LEFT JOIN public.rh_funcionarios fi ON fi.id = o.interessado_funcionario_id
    LEFT JOIN public.rh_org_times t ON t.id = o.org_time_id
    LEFT JOIN public.operadoras op ON op.slug = btrim(fo.staff_operadora_slug)
    WHERE (v_ref IS NULL OR date_trunc('month', o.dia_iso)::date = v_ref)
      AND (
        v_escopo = 'sim'
        OR (v_time IS NOT NULL AND o.org_time_id = v_time)
        OR (v_fid IS NOT NULL AND o.ofertante_funcionario_id = v_fid)
      )
  ) sub;

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_ofertas_listar(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_ofertas_listar(date) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_ofertas_listar(date) IS
  'Marketplace: ofertas do mês (ou todas quando p_ref_mes é NULL) em jsonb. Ver = Sim devolve todos os times; Ver = Próprios só o time do prestador.';

-- ─── Criar oferta (validações estruturais) ──────────────────────────────────

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

  IF v_tipo NOT IN ('venda_turno', 'venda_folga', 'oferta_troca', 'troca_cassada') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tipo');
  END IF;

  IF p_dia_iso IS NULL OR p_dia_iso <= v_hoje THEN
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
  'Marketplace: publica oferta do prestador logado. Exige dia futuro, escala do mês aprovada, célula coerente com o tipo e nenhuma oferta ativa no mesmo dia.';

-- ─── Cancelar oferta própria ────────────────────────────────────────────────

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

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ) INTO v_admin;

  v_fid := public._rh_funcionario_login_id();

  IF NOT COALESCE(v_admin, false) AND (v_fid IS NULL OR v_fid <> v_oferta.ofertante_funcionario_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_e_ofertante');
  END IF;

  IF v_oferta.status NOT IN ('aberta', 'interessado') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status_invalido');
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET status = 'cancelada', atualizado_em = now()
  WHERE id = p_oferta_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_cancelar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_cancelar(uuid) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_oferta_cancelar(uuid) IS
  'Marketplace: o ofertante (ou admin) cancela a própria oferta ainda aberta. Não altera a escala.';

-- ─── Aceitar oferta (validações de conflito na escala) ──────────────────────

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
  v_cel_aceitante_norm text;
  v_cel_aceitante_interesse text;
  v_cel_ofertante_interesse text;
  v_sigla_ofertada text;
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

  SELECT f.id
  INTO v_aceitante
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

  SELECT g.valor
  INTO v_cel_aceitante
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref
    AND g.area_key = v_area
    AND g.funcionario_id = v_aceitante
    AND g.dia_iso = v_oferta.dia_iso
  LIMIT 1;

  v_cel_aceitante_norm := lower(btrim(COALESCE(v_cel_aceitante, '')));

  -- Venda de Turno: o ofertante sai do turno (Venda) e quem aceita assume (Compra).
  IF v_oferta.tipo = 'venda_turno' THEN
    IF v_cel_aceitante_norm NOT IN ('', 'folga', 'f') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_ja_escalado');
    END IF;

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area
      AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area, v_aceitante, v_oferta.dia_iso, 'Compra')
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = 'Compra', atualizado_em = now();

  -- Venda de Folga: o ofertante está de folga e assume o turno (Compra); quem
  -- aceita é o colega escalado que deixa o turno (Venda).
  ELSIF v_oferta.tipo = 'venda_folga' THEN
    IF v_cel_aceitante_norm IN ('', 'folga', 'f') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_sem_turno');
    END IF;
    IF v_cel_aceitante_norm IN ('compra', 'venda', 'troca') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'aceitante_em_negociacao');
    END IF;

    v_sigla_ofertada := CASE lower(btrim(COALESCE(v_oferta.turno_label, '')))
      WHEN 'manhã' THEN 'mrn'
      WHEN 'manha' THEN 'mrn'
      WHEN 'tarde' THEN 'aft'
      WHEN 'noite' THEN 'ngt'
      WHEN 'comercial' THEN 'comercial'
      ELSE NULL
    END;

    IF v_sigla_ofertada IS NOT NULL AND v_cel_aceitante_norm <> v_sigla_ofertada THEN
      RETURN jsonb_build_object('ok', false, 'error', 'turno_diferente');
    END IF;

    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area
      AND funcionario_id = v_aceitante AND dia_iso = v_oferta.dia_iso;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso, 'Compra')
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = 'Compra', atualizado_em = now();

  -- Troca: cada um assume o dia do outro.
  ELSE
    IF v_cel_aceitante_norm NOT IN ('', 'folga', 'f') THEN
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

    SELECT g.valor
    INTO v_cel_aceitante_interesse
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref_interesse
      AND g.area_key = v_area
      AND g.funcionario_id = v_aceitante
      AND g.dia_iso = p_dia_iso_interesse
    LIMIT 1;

    IF lower(btrim(COALESCE(v_cel_aceitante_interesse, ''))) IN ('', 'folga', 'f') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_interesse_sem_turno');
    END IF;
    IF lower(btrim(COALESCE(v_cel_aceitante_interesse, ''))) IN ('compra', 'venda', 'troca') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'dia_interesse_em_negociacao');
    END IF;

    SELECT g.valor
    INTO v_cel_ofertante_interesse
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref_interesse
      AND g.area_key = v_area
      AND g.funcionario_id = v_oferta.ofertante_funcionario_id
      AND g.dia_iso = p_dia_iso_interesse
    LIMIT 1;

    IF lower(btrim(COALESCE(v_cel_ofertante_interesse, ''))) NOT IN ('', 'folga', 'f') THEN
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

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) IS
  'Marketplace: aceite entre prestadores do mesmo time. Exige dia futuro, escala aprovada e ausência de conflito na escala; grava Venda/Compra ou Troca na grade.';

COMMIT;
