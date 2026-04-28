-- DELETE em rh_funcionarios e rh_vagas alinhado a role_permissions.can_excluir (Gestão de Usuários).

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_funcionario_perm(p_need text)
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
          AND rp.page_key = 'rh_funcionarios'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_staff'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

DROP POLICY IF EXISTS rh_funcionarios_delete ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_delete ON public.rh_funcionarios FOR DELETE TO authenticated
  USING (public._rh_funcionario_perm('delete'));

GRANT DELETE ON TABLE public.rh_funcionarios TO authenticated;

COMMENT ON TABLE public.rh_funcionarios IS
  'RH — cadastro de funcionários; DELETE permitido com can_excluir em rh_funcionarios (RLS). Referências no organograma usam ON DELETE SET NULL.';

CREATE OR REPLACE FUNCTION public._rh_vagas_perm(p_need text)
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
          AND rp.page_key = 'rh_vagas'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

DROP POLICY IF EXISTS rh_vagas_delete ON public.rh_vagas;
CREATE POLICY rh_vagas_delete ON public.rh_vagas FOR DELETE TO authenticated
  USING (public._rh_vagas_perm('delete'));

GRANT DELETE ON TABLE public.rh_vagas TO authenticated;

COMMENT ON TABLE public.rh_vagas IS 'RH — vagas; DELETE permitido com can_excluir em rh_vagas (RLS).';

COMMIT;
