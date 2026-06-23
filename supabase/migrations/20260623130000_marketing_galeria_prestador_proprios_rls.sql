-- Galeria de Fotos — perfil com Ver (próprios): Gerais = todas; Minhas Fotos = fotos do rh_funcionario vinculado ao login.
-- Remove exigência de visivel_prestador para leitura própria (flag reservada para evolução futura de liberação explícita).

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
  WHERE rf.status IN ('ativo', 'indisponivel')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN auth.users u ON u.id = p.id
      WHERE p.id = auth.uid()
        AND (
          lower(trim(coalesce(rf.email, ''))) = lower(trim(coalesce(u.email, '')))
          OR (
            trim(coalesce(rf.email_spin, '')) <> ''
            AND lower(trim(rf.email_spin)) = lower(trim(coalesce(u.email, '')))
          )
          OR lower(trim(coalesce(rf.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(rf.email_spin, '')) <> ''
            AND lower(trim(rf.email_spin)) = lower(trim(coalesce(p.email, '')))
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public._galeria_fotos_ver_somente_proprio_prestador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public._galeria_fotos_perm('view')
    AND NOT (
      public._galeria_fotos_perm('edit')
      OR public._galeria_fotos_perm('create')
      OR public._galeria_fotos_perm('delete')
    );
$$;

REVOKE ALL ON FUNCTION public._galeria_fotos_ver_somente_proprio_prestador() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._galeria_fotos_ver_somente_proprio_prestador() TO authenticated;

COMMENT ON FUNCTION public._galeria_fotos_ver_somente_proprio_prestador() IS
  'Ver na galeria sem Criar/Editar/Excluir — Minhas Fotos limitadas ao rh_funcionario do login.';

CREATE OR REPLACE FUNCTION public.galeria_fotos_meu_colaborador()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(row)
  FROM (
    SELECT rf.id, rf.nome
    FROM public.rh_funcionarios rf
    WHERE rf.id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
    ORDER BY rf.nome
    LIMIT 1
  ) row;
$$;

REVOKE ALL ON FUNCTION public.galeria_fotos_meu_colaborador() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.galeria_fotos_meu_colaborador() TO authenticated;

COMMENT ON FUNCTION public.galeria_fotos_meu_colaborador() IS
  'Colaborador (rh_funcionarios) vinculado ao login — usado na aba Minhas Fotos (filtro travado).';

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
      AND rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
      AND public._galeria_fotos_ver_somente_proprio_prestador()
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
          AND mf.rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
          AND public._galeria_fotos_ver_somente_proprio_prestador()
      )
    )
  );

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT prestador_tipo_slug, 'galeria_fotos'
FROM public.prestador_tipo_pages
WHERE page_key = 'rh_dados_cadastro'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

COMMENT ON COLUMN public.marketing_fotos.visivel_prestador IS
  'Reservado para liberação explícita futura; leitura própria na galeria usa vínculo rh_funcionario + login.';

COMMIT;
