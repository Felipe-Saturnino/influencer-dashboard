-- Permite `rh_staff_times_filtrados` a utilizadores com Marketplace ou Solicitações (sem `rh_staff`).

BEGIN;

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
      OR EXISTS (
        SELECT 1
        FROM public.profiles pr
        INNER JOIN public.role_permissions rp ON rp.role::text = pr.role::text
        WHERE pr.id = auth.uid()
          AND rp.page_key IN ('escala_marketplace_turnos', 'escala_solicitacoes')
          AND rp.can_view IN ('sim', 'proprios')
      )
    )
  ORDER BY g.nome, t.nome;
$$;

COMMENT ON FUNCTION public.rh_staff_times_filtrados() IS
  'Gestão de Staff: times ativos das gerências Game Floor ou Operation Management, exceto Contador de Cartas. Requer rh_staff ou páginas Escala (Marketplace / Solicitações) com can_view, ou admin.';

REVOKE ALL ON FUNCTION public.rh_staff_times_filtrados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_staff_times_filtrados() TO authenticated;

COMMIT;
