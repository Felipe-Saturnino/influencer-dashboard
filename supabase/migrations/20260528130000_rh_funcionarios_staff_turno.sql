-- Turno operacional (Gestão de Staff), separado de escala de trabalho (Gestão de Prestadores, ex. 4x2).

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS staff_turno text;

COMMENT ON COLUMN public.rh_funcionarios.staff_turno IS
  'Turno de operação (Manhã/Tarde/Noite etc.) — Gestão de Staff. A coluna escala permanece o padrão 4x2/3x3 cadastrado na Gestão de Prestadores.';

DROP FUNCTION IF EXISTS public.rh_escala_prestadores_times();

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
  'RH Escala do Mês: staff com escala (prestador) e staff_turno (operacional). Requer rh_escala_mes.can_view ou admin.';

COMMIT;
