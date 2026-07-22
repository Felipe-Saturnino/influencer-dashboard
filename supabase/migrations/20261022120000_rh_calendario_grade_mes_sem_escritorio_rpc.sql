-- Calendário: grade RPC só Estúdio aprovado.
-- Escritório (seg–sex Comercial / sáb–dom Folga) passa a ser gerado no cliente
-- para não estourar o limite PostgREST de ~1000 linhas (N funcionários × 31 dias).

BEGIN;

DROP FUNCTION IF EXISTS public.rh_calendario_grade_mes(date);
CREATE FUNCTION public.rh_calendario_grade_mes(p_ref_mes date)
RETURNS TABLE (funcionario_id uuid, dia_iso date, valor text, area_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  limites AS (
    SELECT date_trunc('month', p_ref_mes)::date AS ref0
  ),
  visiveis AS (
    SELECT f.id, f.area_atuacao
    FROM public.rh_funcionarios f
    INNER JOIN public._rh_calendario_funcionarios_escopo() e ON e.funcionario_id = f.id
  )
  SELECT g.funcionario_id, g.dia_iso, g.valor, g.area_key
  FROM public.rh_gestao_escala_grade g
  INNER JOIN public.rh_gestao_escala_grade_status s
    ON s.ref_mes = g.ref_mes
    AND s.area_key = g.area_key
    AND s.status = 'aprovada'
  INNER JOIN visiveis f ON f.id = g.funcionario_id
  CROSS JOIN limites l
  WHERE g.ref_mes = l.ref0
    AND coalesce(nullif(trim(f.area_atuacao), ''), 'estudio') <> 'escritorio'
  ORDER BY g.funcionario_id, g.dia_iso
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_mes(date) IS
  'Calendário RH: grade aprovada do Estúdio. Escritório é sintético no cliente (evita truncar em 1000 linhas).';

REVOKE ALL ON FUNCTION public.rh_calendario_grade_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_mes(date) TO authenticated;

COMMIT;
