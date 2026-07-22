-- Calendário: grade Estúdio aprovada como jsonb (um único valor).
-- RETURNS TABLE estourava o limite PostgREST (~1000 linhas = N×31 dias),
-- deixando Situação "—" mesmo com Escala Diária aprovada.

BEGIN;

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
      AND coalesce(nullif(trim(f.area_atuacao), ''), 'estudio') <> 'escritorio'
  ) x;
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_mes(date) IS
  'Calendário RH: grade aprovada do Estúdio em jsonb (evita truncar ~1000 linhas). Escritório é sintético no cliente.';

REVOKE ALL ON FUNCTION public.rh_calendario_grade_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_mes(date) TO authenticated;

COMMIT;
