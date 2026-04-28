-- Renomeia page_key rh_escala_mes → rh_gestao_escala (Gestão de Escala) e alinha RPC de permissão.

BEGIN;

UPDATE public.role_permissions
SET page_key = 'rh_gestao_escala'
WHERE page_key = 'rh_escala_mes';

DROP FUNCTION IF EXISTS public.rh_escala_prestadores_times() CASCADE;

CREATE OR REPLACE FUNCTION public.rh_escala_prestadores_times()
RETURNS TABLE (
  id uuid,
  nome text,
  cargo text,
  escala text,
  staff_turno text,
  email text,
  org_time_id uuid,
  nome_time text,
  staff_nickname text
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
        AND rp.page_key = 'rh_gestao_escala'
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.nome,
    f.cargo,
    f.escala,
    f.staff_turno,
    f.email,
    f.org_time_id,
    t.nome AS nome_time,
    f.staff_nickname
  FROM public.rh_funcionarios f
  INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      (lower(btrim(g.nome)) LIKE '%game floor%')
      OR (
        lower(btrim(g.nome)) LIKE '%operation%'
        AND lower(btrim(g.nome)) LIKE '%management%'
      )
    )
    AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'contador de cartas'
  ORDER BY t.nome, f.nome;
END;
$$;

COMMENT ON FUNCTION public.rh_escala_prestadores_times() IS
  'RH Gestão de Escala: staff com escala e staff_turno (Game Floor / Operation Management), exceto time Contador de Cartas. Requer rh_gestao_escala.can_view ou admin.';

REVOKE ALL ON FUNCTION public.rh_escala_prestadores_times() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_prestadores_times() TO authenticated;

COMMIT;
