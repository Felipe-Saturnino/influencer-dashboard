-- RH Solicitações — corrigir SELECT: admin e can_view=sim devem ver todas as linhas
-- (antes admin via _rh_solicitacoes_perm mas _rh_solicitacoes_view_row bloqueava sem vínculo).

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_solicitacoes_view_row(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key = 'rh_solicitacoes'
        AND rp.can_view = 'sim'
    )
    OR (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_view = 'proprios'
      )
      AND public._rh_funcionario_vinculado_ao_login(p_funcionario_id)
    );
$$;

COMMENT ON FUNCTION public._rh_solicitacoes_view_row(uuid) IS
  'RLS rh_solicitacoes SELECT: admin ou Ver=sim (todas); Ver=proprios só do prestador vinculado ao login.';

COMMIT;
