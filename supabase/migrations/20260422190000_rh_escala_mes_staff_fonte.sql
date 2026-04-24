-- Escala do Mês: mesma base de pessoas/times que Gestão de Staff (Studio Operations + Customer Service).
-- Retorna staff_nickname para a coluna Nickname. Permissão continua rh_escala_mes.

BEGIN;

DROP FUNCTION IF EXISTS public.rh_escala_prestadores_times();

CREATE OR REPLACE FUNCTION public.rh_escala_prestadores_times()
RETURNS TABLE (
  id uuid,
  nome text,
  escala text,
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
    f.escala,
    f.email,
    f.org_time_id,
    t.nome AS nome_time,
    f.staff_nickname
  FROM public.rh_funcionarios f
  INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      (
        lower(btrim(g.nome)) LIKE '%studio%'
        AND lower(btrim(g.nome)) LIKE '%operations%'
      )
      OR (
        lower(btrim(g.nome)) LIKE '%customer%'
        AND lower(btrim(g.nome)) LIKE '%service%'
      )
    )
  ORDER BY t.nome, f.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_escala_prestadores_times() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_prestadores_times() TO authenticated;

COMMENT ON FUNCTION public.rh_escala_prestadores_times() IS
  'RH Escala do Mês: prestadores ativos/indisponíveis nos times de Staff (mesma regra de rh_staff_times_filtrados). Requer role_permissions(rh_escala_mes).can_view ou admin.';

COMMIT;
