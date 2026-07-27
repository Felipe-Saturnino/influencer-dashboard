-- Escala Estúdio / Escritório: abas para gerências sem times ativos
-- (prestadores com org_gerencia_id e org_time_id NULL — mesmo padrão do Calendário).

BEGIN;

-- ─── Lista de abas: times reais + gerências sem times ─────────────────────────

DROP FUNCTION IF EXISTS public.rh_escala_times_por_area_atuacao(text);

CREATE FUNCTION public.rh_escala_times_por_area_atuacao(p_area_atuacao text)
RETURNS TABLE (
  id uuid,
  nome text,
  tipo text
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
  SELECT x.id, x.nome, x.tipo
  FROM (
    -- Times com pelo menos um prestador na área
    SELECT DISTINCT t.id, t.nome, 'time'::text AS tipo
    FROM public.rh_org_times t
    INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
    INNER JOIN public.rh_funcionarios f ON f.org_time_id = t.id
    WHERE t.status = 'ativo'
      AND f.status IN ('ativo', 'indisponivel')
      AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = v_area

    UNION ALL

    -- Gerências sem times ativos, com prestador vinculado só à gerência na área
    SELECT DISTINCT g.id, g.nome, 'gerencia'::text AS tipo
    FROM public.rh_org_gerencias g
    INNER JOIN public.rh_funcionarios f
      ON f.org_gerencia_id = g.id
     AND f.org_time_id IS NULL
    WHERE g.status = 'ativo'
      AND f.status IN ('ativo', 'indisponivel')
      AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = v_area
      AND NOT EXISTS (
        SELECT 1
        FROM public.rh_org_times t
        WHERE t.gerencia_id = g.id
          AND t.status = 'ativo'
      )
  ) x
  ORDER BY x.nome;
END;
$$;

COMMENT ON FUNCTION public.rh_escala_times_por_area_atuacao(text) IS
  'Abas da Escala: times do Organograma + gerências sem times (cascata), filtrados por area_atuacao.';

REVOKE ALL ON FUNCTION public.rh_escala_times_por_area_atuacao(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_times_por_area_atuacao(text) TO authenticated;

-- ─── Pool de prestadores: com time OU só gerência (sem time) ──────────────────

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
  org_gerencia_id uuid,
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
    x.id,
    x.nome,
    x.cargo,
    x.escala,
    x.staff_turno,
    x.email,
    x.org_time_id,
    x.org_gerencia_id,
    x.nome_time,
    x.staff_nickname,
    x.staff_estudio_slug,
    x.staff_estudio_slugs,
    x.staff_operadora_slug,
    x.staff_live_no_estudio,
    x.area_atuacao
  FROM (
    -- Prestadores em time ativo
    SELECT
      f.id,
      f.nome,
      f.cargo,
      f.escala,
      f.staff_turno,
      f.email,
      f.org_time_id,
      f.org_gerencia_id,
      t.nome AS nome_time,
      f.staff_nickname,
      f.staff_estudio_slug::text AS staff_estudio_slug,
      f.staff_estudio_slugs,
      f.staff_operadora_slug::text AS staff_operadora_slug,
      f.staff_live_no_estudio,
      f.area_atuacao::text AS area_atuacao
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
    INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
    WHERE f.status IN ('ativo', 'indisponivel')
      AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = v_area

    UNION ALL

    -- Prestadores só na gerência (sem time), quando a gerência não tem times ativos
    SELECT
      f.id,
      f.nome,
      f.cargo,
      f.escala,
      f.staff_turno,
      f.email,
      f.org_time_id,
      f.org_gerencia_id,
      g.nome AS nome_time,
      f.staff_nickname,
      f.staff_estudio_slug::text,
      f.staff_estudio_slugs,
      f.staff_operadora_slug::text,
      f.staff_live_no_estudio,
      f.area_atuacao::text
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_gerencias g ON g.id = f.org_gerencia_id AND g.status = 'ativo'
    WHERE f.status IN ('ativo', 'indisponivel')
      AND f.org_time_id IS NULL
      AND f.org_gerencia_id IS NOT NULL
      AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = v_area
      AND NOT EXISTS (
        SELECT 1
        FROM public.rh_org_times t
        WHERE t.gerencia_id = g.id
          AND t.status = 'ativo'
      )
  ) x
  ORDER BY x.nome_time, x.nome;
END;
$$;

COMMENT ON FUNCTION public.rh_escala_prestadores_por_area_atuacao(text) IS
  'Pool Escala Estúdio/Escritório: prestadores em time ou só em gerência sem times.';

REVOKE ALL ON FUNCTION public.rh_escala_prestadores_por_area_atuacao(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_prestadores_por_area_atuacao(text) TO authenticated;

-- ─── Página da área: g_/eog_ ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._rh_escala_page_for_area(p_area_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(btrim(COALESCE(p_area_key, ''))) LIKE 'eo\_%' ESCAPE '\' THEN 'escala_escritorio'
    WHEN lower(btrim(COALESCE(p_area_key, ''))) LIKE 'eog\_%' ESCAPE '\' THEN 'escala_escritorio'
    ELSE 'rh_gestao_escala'
  END;
$$;

-- ─── Validação prestador na área (inclui gerência) ────────────────────────────

CREATE OR REPLACE FUNCTION public._rh_gestao_escala_prestador_na_area(p_funcionario_id uuid, p_area_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_area text := lower(btrim(COALESCE(p_area_key, '')));
  v_hex text;
  v_id uuid;
BEGIN
  IF p_funcionario_id IS NULL OR v_area = '' THEN
    RETURN false;
  END IF;

  -- Escritório: gerência sem time eog_<uuid32>
  IF v_area LIKE 'eog\_%' ESCAPE '\' THEN
    v_hex := substr(v_area, 5);
    IF v_hex !~ '^[0-9a-f]{32}$' THEN
      RETURN false;
    END IF;
    v_id := (
      substr(v_hex, 1, 8) || '-' ||
      substr(v_hex, 9, 4) || '-' ||
      substr(v_hex, 13, 4) || '-' ||
      substr(v_hex, 17, 4) || '-' ||
      substr(v_hex, 21, 12)
    )::uuid;
    RETURN EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.rh_org_gerencias g ON g.id = f.org_gerencia_id AND g.status = 'ativo'
      WHERE f.id = p_funcionario_id
        AND f.org_gerencia_id = v_id
        AND f.org_time_id IS NULL
        AND f.status IN ('ativo', 'indisponivel')
        AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = 'escritorio'
        AND NOT EXISTS (
          SELECT 1 FROM public.rh_org_times t
          WHERE t.gerencia_id = v_id AND t.status = 'ativo'
        )
    );
  END IF;

  -- Escritório: time eo_<uuid32>
  IF v_area LIKE 'eo\_%' ESCAPE '\' THEN
    v_hex := substr(v_area, 4);
    IF v_hex !~ '^[0-9a-f]{32}$' THEN
      RETURN false;
    END IF;
    v_id := (
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
        AND f.org_time_id = v_id
        AND f.status IN ('ativo', 'indisponivel')
        AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = 'escritorio'
    );
  END IF;

  -- Estúdio: gerência sem time g_<uuid32>
  IF v_area LIKE 'g\_%' ESCAPE '\' THEN
    v_hex := substr(v_area, 3);
    IF v_hex !~ '^[0-9a-f]{32}$' THEN
      RETURN false;
    END IF;
    v_id := (
      substr(v_hex, 1, 8) || '-' ||
      substr(v_hex, 9, 4) || '-' ||
      substr(v_hex, 13, 4) || '-' ||
      substr(v_hex, 17, 4) || '-' ||
      substr(v_hex, 21, 12)
    )::uuid;
    RETURN EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.rh_org_gerencias g ON g.id = f.org_gerencia_id AND g.status = 'ativo'
      WHERE f.id = p_funcionario_id
        AND f.org_gerencia_id = v_id
        AND f.org_time_id IS NULL
        AND f.status IN ('ativo', 'indisponivel')
        AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = 'estudio'
        AND NOT EXISTS (
          SELECT 1 FROM public.rh_org_times t
          WHERE t.gerencia_id = v_id AND t.status = 'ativo'
        )
    );
  END IF;

  -- Escala Estúdio: time dinâmico t_<uuid32>
  IF v_area LIKE 't\_%' ESCAPE '\' THEN
    v_hex := substr(v_area, 3);
    IF v_hex !~ '^[0-9a-f]{32}$' THEN
      RETURN false;
    END IF;
    v_id := (
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
        AND f.org_time_id = v_id
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
  'Valida prestador na area_key: legado, t_/g_ (Estúdio), eo_/eog_ (Escritório).';

-- Calendário: grade Escritório incluiida (eo_* e eog_*)
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
        OR lower(btrim(g.area_key)) LIKE 'eog\_%' ESCAPE '\'
      )
  ) x;
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_mes(date) IS
  'Calendário RH: grade aprovada Estúdio + Escritório (eo_/eog_) em jsonb.';

REVOKE ALL ON FUNCTION public.rh_calendario_grade_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_mes(date) TO authenticated;

COMMIT;
