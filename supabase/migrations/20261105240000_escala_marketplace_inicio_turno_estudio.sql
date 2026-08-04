-- Marketplace — horários de início via Estúdio (não só operadora legada).
--
-- Game Presenter / Shuffler 4x2–5x1 têm turno em `estudios_spin`. Shuffler
-- (e SM/SL) gravam `staff_estudio_slugs = {todos}` e `staff_operadora_slug = null`.
-- `_escala_marketplace_inicio_turno` só lia `operadoras` → NULL →
-- `horario_turno_indisponivel` (ou mensagem genérica se o front ainda não
-- mapeava o código). Alinha com `fetchTurnosPorOperadoraSlugs` / Gestão de Staff.

BEGIN;

/** Pick de horários Manhã/Tarde/Noite do prestador (estúdio → junction → operadora). */
CREATE OR REPLACE FUNCTION public._escala_marketplace_turnos_pick(p_funcionario_id uuid)
RETURNS TABLE (
  turno_manha_inicio time,
  turno_tarde_inicio time,
  turno_noite_inicio time
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT
      f.id,
      NULLIF(btrim(COALESCE(f.staff_operadora_slug, '')), '') AS op_slug,
      COALESCE(
        NULLIF(f.staff_estudio_slugs, '{}'::text[]),
        CASE
          WHEN NULLIF(btrim(COALESCE(f.staff_estudio_slug, '')), '') IS NOT NULL
            THEN ARRAY[btrim(f.staff_estudio_slug)]
          ELSE NULL
        END
      ) AS estudio_arr
    FROM public.rh_funcionarios f
    WHERE f.id = p_funcionario_id
  ),
  especificos AS (
    SELECT e.turno_manha_inicio, e.turno_tarde_inicio, e.turno_noite_inicio, 0 AS prio, e.slug
    FROM f
    CROSS JOIN LATERAL unnest(COALESCE(f.estudio_arr, ARRAY[]::text[])) AS u(slug)
    INNER JOIN public.estudios_spin e ON e.slug = btrim(u.slug)
    WHERE lower(btrim(u.slug)) <> 'todos'
      AND e.ativo IS DISTINCT FROM false
  ),
  via_operadora_estudio AS (
    SELECT e.turno_manha_inicio, e.turno_tarde_inicio, e.turno_noite_inicio,
      CASE WHEN e.tipo = 'dedicado' THEN 1 ELSE 2 END AS prio,
      e.slug
    FROM f
    INNER JOIN public.estudios_spin_operadoras eo ON eo.operadora_slug = f.op_slug
    INNER JOIN public.estudios_spin e ON e.slug = eo.estudio_slug
    WHERE f.op_slug IS NOT NULL
      AND e.ativo IS DISTINCT FROM false
  ),
  todos_ou_vazio AS (
    SELECT e.turno_manha_inicio, e.turno_tarde_inicio, e.turno_noite_inicio, 3 AS prio, e.slug
    FROM f
    CROSS JOIN public.estudios_spin e
    WHERE e.ativo IS DISTINCT FROM false
      AND (
        f.estudio_arr IS NULL
        OR cardinality(f.estudio_arr) = 0
        OR 'todos' = ANY (f.estudio_arr)
      )
  ),
  legado_operadora AS (
    SELECT o.turno_manha_inicio, o.turno_tarde_inicio, o.turno_noite_inicio, 10 AS prio, o.slug
    FROM f
    INNER JOIN public.operadoras o ON o.slug = f.op_slug
    WHERE f.op_slug IS NOT NULL
  ),
  candidatos AS (
    SELECT * FROM especificos
    UNION ALL SELECT * FROM via_operadora_estudio
    UNION ALL SELECT * FROM todos_ou_vazio
    UNION ALL SELECT * FROM legado_operadora
  )
  SELECT c.turno_manha_inicio, c.turno_tarde_inicio, c.turno_noite_inicio
  FROM candidatos c
  WHERE c.turno_manha_inicio IS NOT NULL
     OR c.turno_tarde_inicio IS NOT NULL
     OR c.turno_noite_inicio IS NOT NULL
  ORDER BY
    c.prio,
    (c.turno_manha_inicio IS NOT NULL)::int
      + (c.turno_tarde_inicio IS NOT NULL)::int
      + (c.turno_noite_inicio IS NOT NULL)::int DESC,
    c.slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_turnos_pick(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_turnos_pick(uuid) FROM authenticated;

COMMENT ON FUNCTION public._escala_marketplace_turnos_pick(uuid) IS
  'Marketplace: horários Manhã/Tarde/Noite do prestador (estudios_spin, junction ou operadoras).';

CREATE OR REPLACE FUNCTION public._escala_marketplace_inicio_turno(
  p_funcionario_id uuid,
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
  v_escala text;
  v_staff_turno text;
  v_staff_horario text;
  v_turno text := btrim(COALESCE(p_turno_label, ''));
  v_hora time;
  v_hora_key text;
  v_pick record;
BEGIN
  IF p_funcionario_id IS NULL OR p_dia_iso IS NULL OR v_turno = '' THEN
    RETURN NULL;
  END IF;

  SELECT
    lower(regexp_replace(btrim(COALESCE(f.escala, '')), '\s+', '', 'g')),
    btrim(COALESCE(f.staff_turno, '')),
    btrim(COALESCE(f.staff_horario_turno, ''))
  INTO v_escala, v_staff_turno, v_staff_horario
  FROM public.rh_funcionarios f
  WHERE f.id = p_funcionario_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 5x2 Comercial: opções 09-17 / 19-03; default igual ao cliente = 09-17.
  IF v_escala = '5x2'
     AND v_turno = 'Comercial'
     AND v_staff_turno IN ('Comercial', 'Horário Comercial')
  THEN
    v_hora_key := CASE
      WHEN v_staff_horario IN ('09-17', '19-03') THEN v_staff_horario
      ELSE '09-17'
    END;
    v_hora := make_time(split_part(v_hora_key, '-', 1)::integer, 0, 0);

  -- 3x3: opções editáveis da Gestão de Staff; defaults iguais ao cliente.
  ELSIF v_escala = '3x3' AND v_turno = 'Manhã' THEN
    v_hora := make_time(8, 0, 0);
  ELSIF v_escala = '3x3' AND v_turno = 'Noite' THEN
    v_hora_key := CASE
      WHEN v_staff_horario IN ('18-06', '20-08') THEN v_staff_horario
      ELSE '18-06'
    END;
    v_hora := make_time(split_part(v_hora_key, '-', 1)::integer, 0, 0);

  -- 4x2 / 5x1 e fallback: horários do estúdio (ou operadora legada).
  ELSIF v_turno IN ('Manhã', 'Tarde', 'Noite') THEN
    SELECT * INTO v_pick FROM public._escala_marketplace_turnos_pick(p_funcionario_id);
    IF FOUND THEN
      v_hora := CASE v_turno
        WHEN 'Manhã' THEN v_pick.turno_manha_inicio
        WHEN 'Tarde' THEN v_pick.turno_tarde_inicio
        ELSE v_pick.turno_noite_inicio
      END;
    END IF;
  END IF;

  IF v_hora IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (p_dia_iso + v_hora) AT TIME ZONE 'America/Sao_Paulo';
END;
$$;

COMMENT ON FUNCTION public._escala_marketplace_inicio_turno(uuid, date, text) IS
  'Marketplace: início do turno (SP) — 3x3/5x2 via Staff; 4x2/5x1 via estudios_spin ou operadoras.';

-- Backfill ofertas ainda sem início resolvível (ex.: publicadas antes do fix).
UPDATE public.escala_marketplace_oferta o
SET inicio_turno_at = public._escala_marketplace_inicio_turno(
  o.ofertante_funcionario_id,
  o.dia_iso,
  o.turno_label
)
WHERE o.inicio_turno_at IS NULL
  AND o.status IN ('aberta', 'interessado', 'em_analise');

-- Contexto do modal: devolve horários mesmo sem staff_operadora_slug.
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
  v_pick record;
BEGIN
  IF v_escopo = 'nao' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_fid := public._rh_funcionario_login_id();
  IF v_fid IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'escopo', v_escopo, 'funcionario', NULL);
  END IF;

  SELECT * INTO v_pick FROM public._escala_marketplace_turnos_pick(v_fid);

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
      WHEN v_pick.turno_manha_inicio IS NOT NULL
        OR v_pick.turno_tarde_inicio IS NOT NULL
        OR v_pick.turno_noite_inicio IS NOT NULL
        OR o.slug IS NOT NULL
      THEN jsonb_build_object(
        'slug', COALESCE(o.slug, ''),
        'nome', COALESCE(o.nome, ''),
        'turno_manha_inicio', COALESCE(v_pick.turno_manha_inicio, o.turno_manha_inicio),
        'turno_tarde_inicio', COALESCE(v_pick.turno_tarde_inicio, o.turno_tarde_inicio),
        'turno_noite_inicio', COALESCE(v_pick.turno_noite_inicio, o.turno_noite_inicio)
      )
      ELSE NULL
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

COMMENT ON FUNCTION public.escala_marketplace_meu_contexto() IS
  'Marketplace: prestador + horários de turno (estúdio ou operadora) para o modal Ofertar.';

COMMIT;
