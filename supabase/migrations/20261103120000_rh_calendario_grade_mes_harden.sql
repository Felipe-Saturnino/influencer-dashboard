-- Calendário: endurece rh_calendario_grade_mes e alinha o fallback legado.
-- - jsonb (evita truncar PostgREST ~1000 linhas)
-- - row_security off + statement_timeout
-- - escopo via CTE (organograma)
-- - fallback rh_calendario_grade_escala_mes também em jsonb + mesmo escopo
--   (antes: TABLE + role_permissions sem gestor_tipo/organograma)

BEGIN;

DROP FUNCTION IF EXISTS public.rh_calendario_grade_mes(date);

CREATE FUNCTION public.rh_calendario_grade_mes(p_ref_mes date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
SET statement_timeout = '60s'
AS $$
  WITH
  limites AS (
    SELECT date_trunc('month', p_ref_mes)::date AS ref0
  ),
  escopo AS (
    SELECT e.funcionario_id
    FROM public._rh_calendario_funcionarios_escopo() e
  )
  SELECT coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'funcionario_id', x.funcionario_id,
          'dia_iso', x.dia_iso,
          'valor', x.valor,
          'area_key', x.area_key
        )
        ORDER BY x.funcionario_id, x.dia_iso
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
        INNER JOIN escopo e ON e.funcionario_id = f.id
        CROSS JOIN limites l
        WHERE g.ref_mes = l.ref0
          AND (
            coalesce(nullif(trim(f.area_atuacao), ''), 'estudio') <> 'escritorio'
            OR lower(btrim(g.area_key)) LIKE 'eo\_%' ESCAPE '\'
            OR lower(btrim(g.area_key)) LIKE 'eog\_%' ESCAPE '\'
          )
      ) x
    ),
    '[]'::jsonb
  );
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_mes(date) IS
  'Calendário RH: grade aprovada Estúdio + Escritório (eo_/eog_) em jsonb; timeout 60s; sem RLS no definer.';

REVOKE ALL ON FUNCTION public.rh_calendario_grade_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_mes(date) TO authenticated;

-- Fallback legado: mesma semântica (jsonb + escopo organograma)
DROP FUNCTION IF EXISTS public.rh_calendario_grade_escala_mes(date);

CREATE FUNCTION public.rh_calendario_grade_escala_mes(p_ref_mes date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
SET statement_timeout = '60s'
AS $$
  SELECT public.rh_calendario_grade_mes(p_ref_mes);
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_escala_mes(date) IS
  'Alias de rh_calendario_grade_mes (jsonb + escopo). Mantido para fallback do cliente.';

REVOKE ALL ON FUNCTION public.rh_calendario_grade_escala_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_escala_mes(date) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
