-- Gestão de Staff / Escala do Mês: não listar o time "Contador de Cartas" (nome normalizado).

BEGIN;

DROP FUNCTION IF EXISTS public.rh_escala_prestadores_times() CASCADE;

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
          AND rp.page_key = 'rh_staff'
          AND rp.can_view IN ('sim', 'proprios')
      )
    )
  ORDER BY g.nome, t.nome;
$$;

COMMENT ON FUNCTION public.rh_staff_times_filtrados() IS
  'Gestão de Staff: times ativos das gerências Game Floor ou Operation Management, exceto o time Contador de Cartas. Requer rh_staff.can_view ou admin.';

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
  'RH Escala do Mês: staff com escala e staff_turno (Game Floor / Operation Management), exceto time Contador de Cartas. Mesma exclusão que rh_staff_times_filtrados. Requer rh_escala_mes.can_view ou admin.';

REVOKE ALL ON FUNCTION public.rh_escala_prestadores_times() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_prestadores_times() TO authenticated;

REVOKE ALL ON FUNCTION public.rh_staff_times_filtrados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_staff_times_filtrados() TO authenticated;

COMMIT;
