-- Documentos cadastrais por categoria (compartilhado: Dados de Cadastro + Gestão de Prestadores)

BEGIN;

ALTER TABLE public.rh_funcionario_self_media
  ADD COLUMN IF NOT EXISTS document_category text;

ALTER TABLE public.rh_funcionario_self_media
  DROP CONSTRAINT IF EXISTS rh_funcionario_self_media_document_category_check;

ALTER TABLE public.rh_funcionario_self_media
  ADD CONSTRAINT rh_funcionario_self_media_document_category_check CHECK (
    document_category IS NULL
    OR document_category IN (
      'rg',
      'cpf',
      'comprovante_residencia',
      'cartao_cnpj',
      'carteira_trabalho',
      'comprovante_matricula_faculdade',
      'comprovante_contas_bancarias',
      'outros'
    )
  );

UPDATE public.rh_funcionario_self_media
SET document_category = 'outros'
WHERE kind = 'documento'
  AND document_category IS NULL;

CREATE INDEX IF NOT EXISTS idx_rh_func_self_media_doc_categoria
  ON public.rh_funcionario_self_media (rh_funcionario_id, document_category, created_at DESC)
  WHERE kind = 'documento';

COMMENT ON COLUMN public.rh_funcionario_self_media.document_category IS
  'Categoria do documento cadastral (RG, CPF, …). Compartilhado entre Dados de Cadastro e Gestão de Prestadores.';

-- Gestão de Prestadores: RH com permissão em rh_funcionarios
CREATE POLICY rh_funcionario_self_media_select_gestao_prestadores
  ON public.rh_funcionario_self_media FOR SELECT TO authenticated
  USING (
    public._rh_funcionario_perm('view')
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

CREATE POLICY rh_funcionario_self_media_insert_gestao_prestadores
  ON public.rh_funcionario_self_media FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_funcionario_perm('edit')
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

CREATE POLICY rh_funcionario_self_media_delete_gestao_prestadores
  ON public.rh_funcionario_self_media FOR DELETE TO authenticated
  USING (
    public._rh_funcionario_perm('edit')
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

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
