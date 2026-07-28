-- Escala Estúdio / Escritório: grade_carregar como jsonb (um único valor).
-- RETURNS TABLE estourava o limite PostgREST (~1000 linhas = N×31 dias),
-- deixando Escala Diária com "—" em prestadores sem localStorage (não-admin).

BEGIN;

DROP FUNCTION IF EXISTS public.rh_gestao_escala_grade_carregar(date, text);

CREATE FUNCTION public.rh_gestao_escala_grade_carregar(p_ref_mes date, p_area_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF NOT public._rh_escala_ok_ver_area(p_area_key) THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'funcionario_id', x.funcionario_id,
          'dia_iso', x.dia_iso,
          'valor', x.valor
        )
        ORDER BY x.funcionario_id, x.dia_iso
      )
      FROM (
        SELECT
          g.funcionario_id,
          to_char(g.dia_iso, 'YYYY-MM-DD') AS dia_iso,
          g.valor
        FROM public.rh_gestao_escala_grade g
        WHERE g.ref_mes = date_trunc('month', p_ref_mes)::date
          AND g.area_key = lower(btrim(p_area_key))
      ) x
    ),
    '[]'::jsonb
  );
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_carregar(date, text) IS
  'Carrega células da grade (Estúdio/Escritório) em jsonb — evita truncar ~1000 linhas do PostgREST.';

REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_carregar(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_carregar(date, text) TO authenticated;

COMMIT;
