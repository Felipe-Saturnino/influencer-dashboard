-- Escala Estúdio: area_key `academy` = Performance Coach + Treinamento (rótulo Academy).

BEGIN;

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

  -- Academy: time Performance Coach OU gerência/time Treinamento (Estúdio)
  IF v_area = 'academy' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      LEFT JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
      LEFT JOIN public.rh_org_gerencias g ON g.id = COALESCE(f.org_gerencia_id, t.gerencia_id) AND g.status = 'ativo'
      WHERE f.id = p_funcionario_id
        AND f.status IN ('ativo', 'indisponivel')
        AND lower(btrim(COALESCE(f.area_atuacao, 'estudio'))) = 'estudio'
        AND (
          lower(regexp_replace(btrim(COALESCE(t.nome, '')), '\s+', ' ', 'g')) LIKE '%performance coach%'
          OR lower(regexp_replace(btrim(COALESCE(t.nome, '')), '\s+', ' ', 'g')) = 'treinamento'
          OR lower(regexp_replace(btrim(COALESCE(t.nome, '')), '\s+', ' ', 'g')) LIKE 'treinamento %'
          OR (
            f.org_time_id IS NULL
            AND (
              lower(regexp_replace(btrim(COALESCE(g.nome, '')), '\s+', ' ', 'g')) = 'treinamento'
              OR lower(regexp_replace(btrim(COALESCE(g.nome, '')), '\s+', ' ', 'g')) LIKE 'treinamento %'
              OR lower(regexp_replace(btrim(COALESCE(g.nome, '')), '\s+', ' ', 'g')) LIKE '%performance coach%'
            )
          )
        )
    );
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
        AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'arte'
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
        -- Treinamento entra em academy, não em g_
        AND lower(regexp_replace(btrim(g.nome), '\s+', ' ', 'g')) <> 'treinamento'
        AND lower(regexp_replace(btrim(g.nome), '\s+', ' ', 'g')) NOT LIKE 'treinamento %'
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
        AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) NOT LIKE '%performance coach%'
        AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'treinamento'
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
  'Valida prestador na area_key: legado, academy (PC+Treinamento), t_/g_ (Estúdio), eo_/eog_ (Escritório).';

COMMIT;
