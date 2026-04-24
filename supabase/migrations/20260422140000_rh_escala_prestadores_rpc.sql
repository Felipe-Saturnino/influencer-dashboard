-- Lista prestadores vinculados aos times da escala (Game Presenter, Shuffler, Shift Leader).
-- Usado pela página rh_escala_mes; bypass RLS via SECURITY DEFINER com checagem explícita de permissão.

BEGIN;

CREATE OR REPLACE FUNCTION public.rh_escala_prestadores_times()
RETURNS TABLE (
  id uuid,
  nome text,
  escala text,
  email text,
  org_time_id uuid,
  nome_time text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key = 'rh_escala_mes'
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.nome,
    f.escala,
    f.email,
    f.org_time_id,
    t.nome AS nome_time
  FROM public.rh_funcionarios f
  INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
  WHERE f.status IN ('ativo', 'indisponivel')
    AND lower(trim(t.nome)) IN ('game presenter', 'shuffler', 'shift leader')
  ORDER BY f.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_escala_prestadores_times() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_prestadores_times() TO authenticated;

COMMENT ON FUNCTION public.rh_escala_prestadores_times() IS
  'RH Escala do Mês: prestadores ativos/indisponíveis nos times Game Presenter, Shuffler e Shift Leader. Requer role_permissions(rh_escala_mes).can_view ou admin.';

COMMIT;
