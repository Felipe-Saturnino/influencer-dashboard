-- Dashboards — Overview Prestador (dash_overview_prestador) + permissões RPC escala/presença.

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'dash_overview_prestador', 'nao', NULL, NULL, NULL
FROM (
  SELECT unnest(ARRAY[
    'gestor', 'operador', 'agencia', 'influencer', 'afiliado', 'investidor', 'executivo',
    'prestador', 'rh', 'figurino', 'comunicacao', 'performance_coach', 'service_manager', 'shift_leader'
  ]::text[]) AS role
) r
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT DISTINCT pt.prestador_tipo_slug, 'dash_overview_prestador'
FROM public.prestador_tipo_pages pt
WHERE pt.page_key = 'rh_calendario'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT DISTINCT gt.gestor_tipo_slug, 'dash_overview_prestador'
FROM public.gestor_tipo_pages gt
WHERE gt.page_key IN ('rh_calendario', 'rh_gestao_escala')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public._dash_escopo_proprios_prestador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key IN ('rh_calendario', 'dash_overview_prestador')
        AND rp.can_view = 'proprios'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key IN ('rh_calendario', 'rh_gestao_escala', 'dash_overview_prestador')
        AND rp.can_view = 'sim'
    );
$$;

REVOKE ALL ON FUNCTION public._dash_escopo_proprios_prestador() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._dash_escopo_proprios_prestador() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_staff_times_filtrados()
RETURNS TABLE (
  id uuid,
  nome text,
  gerencia_id uuid,
  gerencia_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.nome, t.gerencia_id, g.nome AS gerencia_nome
  FROM public.rh_org_times t
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  WHERE t.status = 'ativo'
    AND (
      (lower(btrim(g.nome)) LIKE '%game floor%')
      OR (
        lower(btrim(g.nome)) LIKE '%operation%'
        AND lower(btrim(g.nome)) LIKE '%management%'
      )
    )
    AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'contador de cartas'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.profiles pr
        INNER JOIN public.role_permissions rp ON rp.role::text = pr.role::text
        WHERE pr.id = auth.uid()
          AND rp.page_key IN ('rh_staff', 'escala_marketplace_turnos', 'escala_solicitacoes', 'dash_overview_prestador')
          AND rp.can_view IN ('sim', 'proprios')
      )
    )
  ORDER BY g.nome, t.nome;
$$;

CREATE OR REPLACE FUNCTION public._rh_calendario_pode_acessar_funcionario(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_meu_funcionario_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_calendario', 'view')
    OR public._prestador_page_perm('dash_overview_prestador', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key IN ('rh_calendario', 'rh_gestao_escala', 'dash_overview_prestador')
        AND rp.can_view IN ('sim', 'proprios')
    )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RETURN true;
  END IF;

  IF NOT public._dash_escopo_proprios_prestador() THEN
    RETURN true;
  END IF;

  SELECT f.id
  INTO v_meu_funcionario_id
  FROM public.rh_funcionarios f
  INNER JOIN public.profiles p ON p.id = auth.uid()
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
      OR (
        trim(coalesce(f.email_spin, '')) <> ''
        AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
      )
    )
  ORDER BY f.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_meu_funcionario_id IS NOT NULL AND p_funcionario_id = v_meu_funcionario_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_calendario_grade_escala_mes(p_ref_mes date)
RETURNS TABLE (funcionario_id uuid, dia_iso date, valor text, area_key text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_ok boolean;
  v_meu_funcionario_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_calendario', 'view')
    OR public._prestador_page_perm('dash_overview_prestador', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key IN ('rh_calendario', 'rh_gestao_escala', 'dash_overview_prestador')
        AND rp.can_view IN ('sim', 'proprios')
    )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN;
  END IF;

  IF public._dash_escopo_proprios_prestador() THEN
    SELECT f.id
    INTO v_meu_funcionario_id
    FROM public.rh_funcionarios f
    INNER JOIN public.profiles p ON p.id = auth.uid()
    WHERE f.status IN ('ativo', 'indisponivel')
      AND (
        lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
        OR (
          trim(coalesce(f.email_spin, '')) <> ''
          AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
        )
      )
    ORDER BY f.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_meu_funcionario_id IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT g.funcionario_id, g.dia_iso, g.valor, g.area_key
  FROM public.rh_gestao_escala_grade g
  INNER JOIN public.rh_gestao_escala_grade_status s
    ON s.ref_mes = g.ref_mes
    AND s.area_key = g.area_key
    AND s.status = 'aprovada'
  WHERE g.ref_mes = v_ref
    AND (
      v_meu_funcionario_id IS NULL
      OR g.funcionario_id = v_meu_funcionario_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_calendario_ponto_registros_mes(
  p_funcionario_id uuid,
  p_ref_mes date
)
RETURNS TABLE (
  dia_sp date,
  check_in_at timestamptz,
  check_out_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref0 date := date_trunc('month', p_ref_mes)::date;
  v_ref1 date := (date_trunc('month', p_ref_mes) + interval '1 month - 1 day')::date;
  v_ok boolean;
  v_meu_funcionario_id uuid;
  v_uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_calendario', 'view')
    OR public._prestador_page_perm('dash_overview_prestador', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key IN ('rh_calendario', 'rh_gestao_escala', 'dash_overview_prestador')
        AND rp.can_view IN ('sim', 'proprios')
    )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN;
  END IF;

  IF public._dash_escopo_proprios_prestador() THEN
    SELECT f.id
    INTO v_meu_funcionario_id
    FROM public.rh_funcionarios f
    INNER JOIN public.profiles p ON p.id = auth.uid()
    WHERE f.status IN ('ativo', 'indisponivel')
      AND (
        lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
        OR (
          trim(coalesce(f.email_spin, '')) <> ''
          AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
        )
      )
    ORDER BY f.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_meu_funcionario_id IS NULL OR p_funcionario_id <> v_meu_funcionario_id THEN
      RETURN;
    END IF;
  END IF;

  SELECT u.id
  INTO v_uid
  FROM auth.users u
  INNER JOIN public.rh_funcionarios f ON f.id = p_funcionario_id
  WHERE lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(u.email::text, '')))
     OR (
       trim(coalesce(f.email_spin, '')) <> ''
       AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(u.email::text, '')))
     )
  ORDER BY f.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN QUERY
  WITH days AS (
    SELECT gs::date AS dia
    FROM generate_series(v_ref0, v_ref1, interval '1 day') AS gs
  ),
  agg AS (
    SELECT r.dia_sp,
      min(r.created_at) FILTER (WHERE r.tipo = 'check_in') AS ci,
      max(r.created_at) FILTER (WHERE r.tipo = 'check_out') AS co
    FROM public.prestador_ponto_registros r
    WHERE v_uid IS NOT NULL
      AND r.user_id = v_uid
      AND r.dia_sp >= v_ref0
      AND r.dia_sp <= v_ref1
    GROUP BY r.dia_sp
  )
  SELECT days.dia, agg.ci, agg.co
  FROM days
  LEFT JOIN agg ON agg.dia_sp = days.dia
  ORDER BY 1;
END;
$$;

COMMENT ON FUNCTION public._dash_escopo_proprios_prestador() IS
  'True quando o utilizador só deve ver dados do próprio prestador (Overview Prestador ou Calendário em proprios, sem sim).';

COMMENT ON FUNCTION public.rh_calendario_grade_escala_mes(date) IS
  'Grade aprovada do mês — Calendário RH e Overview Prestador. Prestador exige matriz efetiva.';

COMMENT ON FUNCTION public.rh_calendario_ponto_registros_mes(uuid, date) IS
  'Check-in/check-out do mês — Calendário RH e Overview Prestador.';

COMMIT;
