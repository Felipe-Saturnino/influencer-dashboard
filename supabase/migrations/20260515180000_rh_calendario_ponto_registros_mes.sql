-- Calendário RH: leitura de check-in/check-out do mês por funcionário (para aba Controle de Presença).

BEGIN;

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
  v_calendario_proprios boolean := false;
  v_meu_funcionario_id uuid;
  v_uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key IN ('rh_calendario', 'rh_gestao_escala')
        AND rp.can_view IN ('sim', 'proprios')
    )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    SELECT (rp.can_view = 'proprios')
    INTO v_calendario_proprios
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND rp.page_key = 'rh_calendario'
    LIMIT 1;
    v_calendario_proprios := coalesce(v_calendario_proprios, false);
  END IF;

  IF coalesce(v_calendario_proprios, false) THEN
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

COMMENT ON FUNCTION public.rh_calendario_ponto_registros_mes(uuid, date) IS
  'Calendário RH: por dia do mês, primeiro check-in e último check-out (America/Sao_Paulo dia_sp). Utilizador auth.users alinhado ao e-mail do rh_funcionarios. Permissões alinhadas a rh_calendario_grade_escala_mes.';

REVOKE ALL ON FUNCTION public.rh_calendario_ponto_registros_mes(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_ponto_registros_mes(uuid, date) TO authenticated;

COMMIT;
