-- Aplicar no SQL Editor do Supabase se o upload na aba Documentos (Gestão de Prestadores)
-- falhar para perfis RH / Gestor de RH com permissão de Editar.
-- Espelho de: supabase/migrations/20261030120000_rh_prestador_documentos_gestao_rls.sql

BEGIN;

DROP POLICY IF EXISTS rh_funcionario_self_media_select_gestao_prestadores ON public.rh_funcionario_self_media;
CREATE POLICY rh_funcionario_self_media_select_gestao_prestadores
  ON public.rh_funcionario_self_media FOR SELECT TO authenticated
  USING (
    public._rh_funcionario_perm('view')
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

DROP POLICY IF EXISTS rh_funcionario_self_media_insert_gestao_prestadores ON public.rh_funcionario_self_media;
CREATE POLICY rh_funcionario_self_media_insert_gestao_prestadores
  ON public.rh_funcionario_self_media FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_funcionario_perm('edit')
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

DROP POLICY IF EXISTS rh_funcionario_self_media_delete_gestao_prestadores ON public.rh_funcionario_self_media;
CREATE POLICY rh_funcionario_self_media_delete_gestao_prestadores
  ON public.rh_funcionario_self_media FOR DELETE TO authenticated
  USING (
    public._rh_funcionario_perm('edit')
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_select_gestao_prestadores ON storage.objects;
CREATE POLICY rh_self_media_storage_select_gestao_prestadores
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_funcionario_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_insert_gestao_prestadores ON storage.objects;
CREATE POLICY rh_self_media_storage_insert_gestao_prestadores
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_funcionario_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_update_gestao_prestadores ON storage.objects;
CREATE POLICY rh_self_media_storage_update_gestao_prestadores
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_funcionario_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_delete_gestao_prestadores ON storage.objects;
CREATE POLICY rh_self_media_storage_delete_gestao_prestadores
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_funcionario_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

COMMIT;
