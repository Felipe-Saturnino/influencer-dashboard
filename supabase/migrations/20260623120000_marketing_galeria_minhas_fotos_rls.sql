-- Galeria de Fotos — Minhas Fotos: view-only vê fotos de colaborador vinculadas ao login (visivel_prestador).

BEGIN;

CREATE OR REPLACE FUNCTION public._galeria_fotos_meus_rh_funcionario_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rf.id
  FROM public.rh_funcionarios rf
  INNER JOIN auth.users u ON u.id = auth.uid()
  WHERE rf.status IN ('ativo', 'indisponivel')
    AND (
      lower(trim(coalesce(rf.email, ''))) = lower(trim(coalesce(u.email, '')))
      OR (
        trim(coalesce(rf.email_spin, '')) <> ''
        AND lower(trim(rf.email_spin)) = lower(trim(coalesce(u.email, '')))
      )
    );
$$;

REVOKE ALL ON FUNCTION public._galeria_fotos_meus_rh_funcionario_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._galeria_fotos_meus_rh_funcionario_ids() TO authenticated;

COMMENT ON FUNCTION public._galeria_fotos_meus_rh_funcionario_ids() IS
  'rh_funcionarios ativo/indisponível cujo e-mail ou e-mail Spin coincide com auth.users do login.';

DROP POLICY IF EXISTS marketing_fotos_select ON public.marketing_fotos;
CREATE POLICY marketing_fotos_select ON public.marketing_fotos
  FOR SELECT TO authenticated
  USING (
    (
      tipo = 'geral'
      AND public._galeria_fotos_perm('view')
    )
    OR (
      tipo = 'prestador'
      AND (
        public._galeria_fotos_perm('edit')
        OR public._galeria_fotos_perm('create')
        OR public._galeria_fotos_perm('delete')
      )
    )
    OR (
      tipo = 'prestador'
      AND visivel_prestador = true
      AND rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
      AND public._galeria_fotos_perm('view')
    )
  );

DROP POLICY IF EXISTS marketing_fotos_prestadores_storage_select ON storage.objects;
CREATE POLICY marketing_fotos_prestadores_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'marketing-fotos-prestadores'
    AND (
      public._galeria_fotos_perm('edit')
      OR public._galeria_fotos_perm('create')
      OR public._galeria_fotos_perm('delete')
      OR EXISTS (
        SELECT 1
        FROM public.marketing_fotos mf
        WHERE mf.storage_path = objects.name
          AND mf.tipo = 'prestador'
          AND mf.visivel_prestador = true
          AND mf.rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
          AND public._galeria_fotos_perm('view')
      )
    )
  );

COMMIT;
