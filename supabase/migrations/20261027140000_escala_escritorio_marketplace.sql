-- Escala Escritório (page + RPC pool) + Marketplace (ofertas) — seeds Não para não-admin.

BEGIN;

-- ─── Permissões: Escala Escritório ───────────────────────────────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role::text, 'escala_escritorio', 'nao', 'nao', 'nao', NULL
FROM (SELECT DISTINCT role FROM public.role_permissions WHERE role IS DISTINCT FROM 'admin') r
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions x
  WHERE x.role::text = r.role::text AND x.page_key = 'escala_escritorio'
);

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT t.prestador_tipo_slug, 'escala_escritorio'
FROM (SELECT DISTINCT prestador_tipo_slug FROM public.prestador_tipo_pages) t
WHERE NOT EXISTS (
  SELECT 1 FROM public.prestador_tipo_pages x
  WHERE x.prestador_tipo_slug = t.prestador_tipo_slug AND x.page_key = 'escala_escritorio'
);

-- ─── Times / prestadores por área de atuação (estudio | escritorio) ─────────────

CREATE OR REPLACE FUNCTION public.rh_escala_times_por_area_atuacao(p_area_atuacao text)
RETURNS TABLE (
  id uuid,
  nome text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area text := lower(btrim(COALESCE(p_area_atuacao, '')));
  v_page text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF v_area NOT IN ('estudio', 'escritorio') THEN
    RETURN;
  END IF;

  v_page := CASE WHEN v_area = 'escritorio' THEN 'escala_escritorio' ELSE 'rh_gestao_escala' END;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm(v_page, 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = v_page
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT t.id, t.nome
  FROM public.rh_org_times t
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  INNER JOIN public.rh_funcionarios f ON f.org_time_id = t.id
  WHERE t.status = 'ativo'
    AND f.status IN ('ativo', 'indisponivel')
    AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = v_area
  ORDER BY t.nome;
END;
$$;

COMMENT ON FUNCTION public.rh_escala_times_por_area_atuacao(text) IS
  'Times do Organograma com pelo menos um prestador na área de atuação (estudio|escritorio).';

REVOKE ALL ON FUNCTION public.rh_escala_times_por_area_atuacao(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_times_por_area_atuacao(text) TO authenticated;

DROP FUNCTION IF EXISTS public.rh_escala_prestadores_por_area_atuacao(text);

CREATE FUNCTION public.rh_escala_prestadores_por_area_atuacao(p_area_atuacao text)
RETURNS TABLE (
  id uuid,
  nome text,
  cargo text,
  escala text,
  staff_turno text,
  email text,
  org_time_id uuid,
  nome_time text,
  staff_nickname text,
  staff_estudio_slug text,
  staff_estudio_slugs text[],
  staff_operadora_slug text,
  staff_live_no_estudio date,
  area_atuacao text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area text := lower(btrim(COALESCE(p_area_atuacao, '')));
  v_page text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF v_area NOT IN ('estudio', 'escritorio') THEN
    RETURN;
  END IF;

  v_page := CASE WHEN v_area = 'escritorio' THEN 'escala_escritorio' ELSE 'rh_gestao_escala' END;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm(v_page, 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = v_page
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.nome,
    f.cargo,
    f.escala,
    f.staff_turno,
    f.email,
    f.org_time_id,
    t.nome AS nome_time,
    f.staff_nickname,
    f.staff_estudio_slug::text,
    f.staff_estudio_slugs,
    f.staff_operadora_slug::text,
    f.staff_live_no_estudio,
    f.area_atuacao::text
  FROM public.rh_funcionarios f
  INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  WHERE f.status IN ('ativo', 'indisponivel')
    AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = v_area
  ORDER BY t.nome, f.nome;
END;
$$;

COMMENT ON FUNCTION public.rh_escala_prestadores_por_area_atuacao(text) IS
  'Pool de prestadores para Escala Estúdio ou Escala Escritório (filtro area_atuacao).';

REVOKE ALL ON FUNCTION public.rh_escala_prestadores_por_area_atuacao(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_prestadores_por_area_atuacao(text) TO authenticated;

-- ─── Marketplace: ofertas ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.escala_marketplace_oferta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('venda_turno', 'venda_folga', 'oferta_troca', 'troca_cassada')),
  status text NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'interessado', 'aceita', 'recusada', 'cancelada', 'expirada')),
  ofertante_funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  org_time_id uuid NOT NULL REFERENCES public.rh_org_times (id),
  dia_iso date NOT NULL,
  valor_celula_origem text NOT NULL,
  turno_label text NULL,
  interessado_funcionario_id uuid NULL REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,
  dia_iso_interesse date NULL,
  valor_celula_interesse text NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  aceito_em timestamptz NULL,
  observacao text NULL
);

CREATE INDEX IF NOT EXISTS escala_marketplace_oferta_time_dia_idx
  ON public.escala_marketplace_oferta (org_time_id, dia_iso);
CREATE INDEX IF NOT EXISTS escala_marketplace_oferta_status_idx
  ON public.escala_marketplace_oferta (status);

COMMENT ON TABLE public.escala_marketplace_oferta IS
  'Ofertas de Marketplace (venda turno/folga, troca). Aceite atualiza rh_gestao_escala_grade.';

ALTER TABLE public.escala_marketplace_oferta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.escala_marketplace_oferta FROM PUBLIC;
REVOKE ALL ON TABLE public.escala_marketplace_oferta FROM authenticated;

-- ─── area_key dinâmico (legado + t_/eo_) + permissão por página ─────────────

CREATE OR REPLACE FUNCTION public._rh_escala_page_for_area(p_area_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(btrim(COALESCE(p_area_key, ''))) LIKE 'eo\_%' ESCAPE '\' THEN 'escala_escritorio'
    ELSE 'rh_gestao_escala'
  END;
$$;

CREATE OR REPLACE FUNCTION public._rh_gestao_escala_prestador_na_area(p_funcionario_id uuid, p_area_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_area text := lower(btrim(COALESCE(p_area_key, '')));
  v_hex text;
  v_time uuid;
BEGIN
  IF p_funcionario_id IS NULL OR v_area = '' THEN
    RETURN false;
  END IF;

  -- Escala Escritório: eo_<uuid32>
  IF v_area LIKE 'eo\_%' ESCAPE '\' THEN
    v_hex := substr(v_area, 4);
    IF v_hex !~ '^[0-9a-f]{32}$' THEN
      RETURN false;
    END IF;
    v_time := (
      substr(v_hex, 1, 8) || '-' ||
      substr(v_hex, 9, 4) || '-' ||
      substr(v_hex, 13, 4) || '-' ||
      substr(v_hex, 17, 4) || '-' ||
      substr(v_hex, 21, 12)
    )::uuid;
    RETURN EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
      WHERE f.id = p_funcionario_id
        AND f.org_time_id = v_time
        AND f.status IN ('ativo', 'indisponivel')
        AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = 'escritorio'
    );
  END IF;

  -- Escala Estúdio: time dinâmico t_<uuid32>
  IF v_area LIKE 't\_%' ESCAPE '\' THEN
    v_hex := substr(v_area, 3);
    IF v_hex !~ '^[0-9a-f]{32}$' THEN
      RETURN false;
    END IF;
    v_time := (
      substr(v_hex, 1, 8) || '-' ||
      substr(v_hex, 9, 4) || '-' ||
      substr(v_hex, 13, 4) || '-' ||
      substr(v_hex, 17, 4) || '-' ||
      substr(v_hex, 21, 12)
    )::uuid;
    RETURN EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
      WHERE f.id = p_funcionario_id
        AND f.org_time_id = v_time
        AND f.status IN ('ativo', 'indisponivel')
        AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = 'estudio'
    );
  END IF;

  -- Legado Estúdio (nome do time)
  RETURN EXISTS (
    SELECT 1
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
    INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
    WHERE f.id = p_funcionario_id
      AND f.status IN ('ativo', 'indisponivel')
      AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = 'estudio'
      AND (
        (lower(btrim(g.nome)) LIKE '%game floor%')
        OR (
          lower(btrim(g.nome)) LIKE '%operation%'
          AND lower(btrim(g.nome)) LIKE '%management%'
        )
      )
      AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'contador de cartas'
      AND (
        CASE v_area
          WHEN 'customer_service' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%customer service%'
          WHEN 'service_manager' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%service manager%'
          WHEN 'shift_leader' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shift leader%'
          WHEN 'game_presenter' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%game presenter%'
          WHEN 'shuffler' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shuffler%'
          ELSE false
        END
      )
  );
END;
$$;

COMMENT ON FUNCTION public._rh_gestao_escala_prestador_na_area(uuid, text) IS
  'Valida prestador na area_key: legado Estúdio, t_<uuid> Estúdio ou eo_<uuid> Escritório.';

-- Helper: permissão efetiva de mutação (create/edit) na página da área
CREATE OR REPLACE FUNCTION public._rh_escala_ok_mutar_area(p_area_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page text := public._rh_escala_page_for_area(p_area_key);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm(v_page, 'create')
    OR public._prestador_page_perm(v_page, 'edit')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = v_page
        AND (
          rp.can_criar IN ('sim', 'proprios')
          OR rp.can_editar IN ('sim', 'proprios')
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public._rh_escala_ok_ver_area(p_area_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page text := public._rh_escala_page_for_area(p_area_key);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm(v_page, 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = v_page
        AND rp.can_view IN ('sim', 'proprios')
    );
END;
$$;

-- Patch carregar / salvar / aprovar / resetar para usar página da área
CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_carregar(p_ref_mes date, p_area_key text)
RETURNS TABLE (funcionario_id uuid, dia_iso date, valor text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT public._rh_escala_ok_ver_area(p_area_key) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT g.funcionario_id, g.dia_iso, g.valor
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = date_trunc('month', p_ref_mes)::date
    AND g.area_key = lower(btrim(p_area_key));
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_salvar(p_ref_mes date, p_area_key text, p_celulas jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  k text;
  v_val text;
  parts text[];
  v_fid uuid;
  v_dia date;
  v_aprovada boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public._rh_escala_ok_mutar_area(v_area) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_area');
  END IF;

  IF p_celulas IS NULL OR jsonb_typeof(p_celulas) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_payload');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref
      AND s.area_key = v_area
      AND s.status = 'aprovada'
  )
  INTO v_aprovada;

  IF coalesce(v_aprovada, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_aprovada');
  END IF;

  FOR k, v_val IN
    SELECT x.key, x.value FROM jsonb_each_text(p_celulas) AS x (key, value)
  LOOP
    parts := string_to_array(k, '|');
    IF coalesce(array_length(parts, 1), 0) <> 2 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_key', 'key', k);
    END IF;
    BEGIN
      v_fid := parts[1]::uuid;
      v_dia := parts[2]::date;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_key', 'key', k);
    END;

    IF NOT public._rh_gestao_escala_prestador_na_area(v_fid, v_area) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'prestador_fora_area', 'funcionario_id', v_fid::text);
    END IF;

    IF length(v_val) > 32 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'valor_too_long');
    END IF;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area, v_fid, v_dia, coalesce(v_val, ''))
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET
      valor = EXCLUDED.valor,
      atualizado_em = now();
  END LOOP;

  INSERT INTO public.rh_gestao_escala_grade_status (ref_mes, area_key, status, aprovado_em, aprovado_por)
  SELECT v_ref, v_area, 'rascunho'::text, NULL::timestamptz, NULL::uuid
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade_status s2
    WHERE s2.ref_mes = v_ref AND s2.area_key = v_area
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_aprovar(p_ref_mes date, p_area_key text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  v_em timestamptz := now();
  v_tem_grade boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public._rh_escala_ok_mutar_area(v_area) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area
  ) INTO v_tem_grade;

  IF NOT coalesce(v_tem_grade, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_grade');
  END IF;

  INSERT INTO public.rh_gestao_escala_grade_status (ref_mes, area_key, status, aprovado_em, aprovado_por)
  VALUES (v_ref, v_area, 'aprovada', v_em, auth.uid())
  ON CONFLICT (ref_mes, area_key) DO UPDATE SET
    status = 'aprovada',
    aprovado_em = EXCLUDED.aprovado_em,
    aprovado_por = EXCLUDED.aprovado_por;

  PERFORM public._rh_gestao_escala_snapshot_turnos_area(v_ref, v_area);
  PERFORM public._rh_gestao_escala_historico_inserir(v_ref, v_area, 'aprovar', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'aprovado_em', v_em, 'aprovado_por', auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_resetar(p_ref_mes date, p_area_key text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public._rh_escala_ok_mutar_area(v_area) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  PERFORM public._rh_gestao_escala_historico_inserir(v_ref, v_area, 'nova_escala', '{}'::jsonb);

  DELETE FROM public.rh_gestao_escala_grade_alteracao a
  WHERE a.ref_mes = v_ref AND a.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_turno_mes t
  WHERE t.ref_mes = v_ref AND t.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref AND s.area_key = v_area;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Calendário: incluir grade Escritório aprovada (eo_*)
DROP FUNCTION IF EXISTS public.rh_calendario_grade_mes(date);
CREATE FUNCTION public.rh_calendario_grade_mes(p_ref_mes date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'funcionario_id', x.funcionario_id,
        'dia_iso', x.dia_iso,
        'valor', x.valor,
        'area_key', x.area_key
      )
      ORDER BY x.funcionario_id, x.dia_iso
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      g.funcionario_id,
      to_char(g.dia_iso, 'YYYY-MM-DD') AS dia_iso,
      g.valor,
      g.area_key
    FROM public.rh_gestao_escala_grade g
    INNER JOIN public.rh_gestao_escala_grade_status s
      ON s.ref_mes = g.ref_mes
      AND s.area_key = g.area_key
      AND s.status = 'aprovada'
    INNER JOIN public.rh_funcionarios f ON f.id = g.funcionario_id
    INNER JOIN public._rh_calendario_funcionarios_escopo() e ON e.funcionario_id = f.id
    WHERE g.ref_mes = date_trunc('month', p_ref_mes)::date
      AND (
        coalesce(nullif(trim(f.area_atuacao), ''), 'estudio') <> 'escritorio'
        OR lower(btrim(g.area_key)) LIKE 'eo\_%' ESCAPE '\'
      )
  ) x;
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_mes(date) IS
  'Calendário RH: grade aprovada Estúdio + Escritório (eo_*) em jsonb.';

REVOKE ALL ON FUNCTION public.rh_calendario_grade_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_mes(date) TO authenticated;

-- ─── Marketplace RPCs ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._escala_marketplace_mesmo_time(
  p_a uuid,
  p_b uuid
)
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
      AND a.org_time_id = b.org_time_id
      AND a.status IN ('ativo', 'indisponivel')
      AND b.status IN ('ativo', 'indisponivel')
  );
$$;

CREATE OR REPLACE FUNCTION public.escala_marketplace_ofertas_listar(p_ref_mes date DEFAULT NULL)
RETURNS SETOF public.escala_marketplace_oferta
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := CASE WHEN p_ref_mes IS NULL THEN NULL ELSE date_trunc('month', p_ref_mes)::date END;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('escala_marketplace_turnos', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'escala_marketplace_turnos'
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT o.*
  FROM public.escala_marketplace_oferta o
  WHERE (v_ref IS NULL OR date_trunc('month', o.dia_iso)::date = v_ref)
  ORDER BY o.criado_em DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_ofertas_listar(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_ofertas_listar(date) TO authenticated;

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
  v_val text := btrim(COALESCE(p_valor_celula, ''));
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

  INSERT INTO public.escala_marketplace_oferta (
    tipo, status, ofertante_funcionario_id, org_time_id, dia_iso,
    valor_celula_origem, turno_label, observacao
  )
  VALUES (
    v_tipo, 'aberta', v_fid, v_time, p_dia_iso,
    v_val, nullif(btrim(COALESCE(p_turno_label, '')), ''), nullif(btrim(COALESCE(p_observacao, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) TO authenticated;

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
  v_aceitante_time uuid;
  v_area text;
  v_ref date;
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

  SELECT f.id, f.org_time_id
  INTO v_aceitante, v_aceitante_time
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

  -- area_key legado a partir do nome do time (Marketplace só Estúdio)
  SELECT CASE
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%game presenter%' THEN 'game_presenter'
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shift leader%' THEN 'shift_leader'
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shuffler%' THEN 'shuffler'
    WHEN lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%service manager%' THEN 'service_manager'
    ELSE 't_' || replace(t.id::text, '-', '')
  END
  INTO v_area
  FROM public.rh_org_times t
  WHERE t.id = v_oferta.org_time_id;

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

  -- Sync bilateral básico: ofertante → Venda/Troca; aceitante → Compra/Troca
  IF v_oferta.tipo IN ('venda_turno', 'venda_folga') THEN
    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Venda', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area
      AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area, v_aceitante, v_oferta.dia_iso, 'Compra')
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET valor = 'Compra', atualizado_em = now();
  ELSIF v_oferta.tipo IN ('oferta_troca', 'troca_cassada') THEN
    UPDATE public.rh_gestao_escala_grade
    SET valor = 'Troca', atualizado_em = now()
    WHERE ref_mes = v_ref AND area_key = v_area
      AND funcionario_id = v_oferta.ofertante_funcionario_id AND dia_iso = v_oferta.dia_iso;

    IF p_dia_iso_interesse IS NOT NULL THEN
      UPDATE public.rh_gestao_escala_grade
      SET valor = 'Troca', atualizado_em = now()
      WHERE ref_mes = date_trunc('month', p_dia_iso_interesse)::date
        AND area_key = v_area
        AND funcionario_id = v_aceitante
        AND dia_iso = p_dia_iso_interesse;

      INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
      VALUES (
        date_trunc('month', p_dia_iso_interesse)::date,
        v_area,
        v_aceitante,
        p_dia_iso_interesse,
        'Troca'
      )
      ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
      DO UPDATE SET valor = 'Troca', atualizado_em = now();

      -- Espelho: aceitante recebe o dia do ofertante como Compra/Troca; ofertante recebe interesse
      INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
      VALUES (v_ref, v_area, v_aceitante, v_oferta.dia_iso, 'Troca')
      ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
      DO UPDATE SET valor = 'Troca', atualizado_em = now();

      UPDATE public.rh_gestao_escala_grade
      SET valor = 'Troca', atualizado_em = now()
      WHERE ref_mes = date_trunc('month', p_dia_iso_interesse)::date
        AND area_key = v_area
        AND funcionario_id = v_oferta.ofertante_funcionario_id
        AND dia_iso = p_dia_iso_interesse;
    END IF;
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

-- Meta / Alterar Escala: permitir página Escala Escritório
CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_meta_listar(p_ref_mes date)
RETURNS TABLE (area_key text, status text, aprovado_em timestamptz, aprovado_por uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_gestao_escala', 'view')
    OR public._prestador_page_perm('escala_escritorio', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key IN ('rh_gestao_escala', 'escala_escritorio')
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.area_key, s.status, s.aprovado_em, s.aprovado_por
  FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_alterar_celula(
  p_ref_mes date,
  p_area_key text,
  p_funcionario_id uuid,
  p_dia_iso date,
  p_valor text,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  v_val text := coalesce(p_valor, '');
  v_obs text := nullif(btrim(p_observacao), '');
  v_aprovada boolean;
  v_anterior text := '';
  v_uid uuid := auth.uid();
  v_nome text;
  v_prestador_nome text;
  v_now timestamptz := now();
  v_page text := public._rh_escala_page_for_area(p_area_key);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.role = 'admin')
    OR public._prestador_page_perm(v_page, 'edit')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = v_uid
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = v_page
        AND rp.can_editar IN ('sim', 'proprios')
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_area');
  END IF;

  IF p_funcionario_id IS NULL OR p_dia_iso IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_payload');
  END IF;

  IF date_trunc('month', p_dia_iso)::date <> v_ref THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_fora_mes');
  END IF;

  IF p_dia_iso < current_date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dia_passado');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref
      AND s.area_key = v_area
      AND s.status = 'aprovada'
  )
  INTO v_aprovada;

  IF NOT coalesce(v_aprovada, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_nao_aprovada');
  END IF;

  IF NOT public._rh_gestao_escala_prestador_na_area(p_funcionario_id, v_area) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'prestador_fora_area');
  END IF;

  IF length(v_val) > 32 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'valor_too_long');
  END IF;

  IF v_obs IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'observacao_obrigatoria');
  END IF;

  IF length(v_obs) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'observacao_too_long');
  END IF;

  SELECT coalesce(g.valor, '')
  INTO v_anterior
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref
    AND g.area_key = v_area
    AND g.funcionario_id = p_funcionario_id
    AND g.dia_iso = p_dia_iso;

  INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
  VALUES (v_ref, v_area, p_funcionario_id, p_dia_iso, v_val)
  ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
  DO UPDATE SET
    valor = EXCLUDED.valor,
    atualizado_em = now();

  INSERT INTO public.rh_gestao_escala_grade_alteracao (
    ref_mes, area_key, funcionario_id, dia_iso,
    valor_anterior, valor_novo, observacao, alterado_por, alterado_em
  )
  VALUES (
    v_ref, v_area, p_funcionario_id, p_dia_iso,
    coalesce(v_anterior, ''), v_val, v_obs, v_uid, v_now
  );

  SELECT coalesce(nullif(btrim(p.nome), ''), 'Usuário')
  INTO v_nome
  FROM public.profiles p
  WHERE p.id = v_uid;

  SELECT coalesce(nullif(btrim(f.nome), ''), '')
  INTO v_prestador_nome
  FROM public.rh_funcionarios f
  WHERE f.id = p_funcionario_id;

  PERFORM public._rh_gestao_escala_historico_inserir(
    v_ref,
    v_area,
    'alterar_escala',
    jsonb_build_object(
      'funcionario_id', p_funcionario_id,
      'prestador_nome', v_prestador_nome,
      'dia_iso', p_dia_iso,
      'valor_anterior', coalesce(v_anterior, ''),
      'valor_novo', v_val,
      'observacao', v_obs
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'valor_anterior', coalesce(v_anterior, ''),
    'observacao', v_obs,
    'alterado_em', v_now,
    'alterado_por_nome', coalesce(v_nome, 'Usuário')
  );
END;
$$;

COMMIT;
