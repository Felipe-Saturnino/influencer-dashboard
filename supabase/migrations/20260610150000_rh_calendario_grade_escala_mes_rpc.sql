-- Calendário RH: leitura consolidada da grade de escala por mês (todas as áreas) para quem vê Calendário ou Gestão de Escala.

BEGIN;

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

  RETURN QUERY
  SELECT g.funcionario_id, g.dia_iso, g.valor, g.area_key
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref;
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_escala_mes(date) IS
  'Calendário RH: todas as células gravadas da grade do mês (todas as áreas). Requer rh_calendario ou rh_gestao_escala can_view (ou admin).';

REVOKE ALL ON FUNCTION public.rh_calendario_grade_escala_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_escala_mes(date) TO authenticated;

COMMIT;
