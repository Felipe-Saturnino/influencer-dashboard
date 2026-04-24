-- RH Organograma: permitir DELETE autenticado quando role_permissions.can_excluir (page_key rh_organograma).

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_organograma_perm(p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_organograma'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

DROP POLICY IF EXISTS rh_org_diretorias_delete ON public.rh_org_diretorias;
DROP POLICY IF EXISTS rh_org_gerencias_delete ON public.rh_org_gerencias;
DROP POLICY IF EXISTS rh_org_times_delete ON public.rh_org_times;

CREATE POLICY rh_org_diretorias_delete ON public.rh_org_diretorias FOR DELETE TO authenticated
  USING (public._rh_organograma_perm('delete'));

CREATE POLICY rh_org_gerencias_delete ON public.rh_org_gerencias FOR DELETE TO authenticated
  USING (public._rh_organograma_perm('delete'));

CREATE POLICY rh_org_times_delete ON public.rh_org_times FOR DELETE TO authenticated
  USING (public._rh_organograma_perm('delete'));

GRANT DELETE ON TABLE public.rh_org_diretorias TO authenticated;
GRANT DELETE ON TABLE public.rh_org_gerencias TO authenticated;
GRANT DELETE ON TABLE public.rh_org_times TO authenticated;

COMMIT;
