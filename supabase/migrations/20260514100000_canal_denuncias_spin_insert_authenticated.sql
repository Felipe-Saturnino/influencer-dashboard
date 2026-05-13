-- Formulário público: quem já tem sessão na app usa JWT role `authenticated`, não `anon`.
-- Antes só havia INSERT (GRANT + RLS) para `anon` → 42501 em utilizadores logados.

BEGIN;

GRANT INSERT ON TABLE public.canal_denuncias_spin TO authenticated;

DROP POLICY IF EXISTS canal_denuncias_spin_authenticated_public_insert ON public.canal_denuncias_spin;
CREATE POLICY canal_denuncias_spin_authenticated_public_insert
  ON public.canal_denuncias_spin FOR INSERT TO authenticated
  WITH CHECK (true);

-- Paridade com canal_denuncia_anexos_anon_insert (upload logo após criar a denúncia).
DROP POLICY IF EXISTS canal_denuncia_anexos_auth_public_upload ON public.canal_denuncia_anexos;
CREATE POLICY canal_denuncia_anexos_auth_public_upload
  ON public.canal_denuncia_anexos FOR INSERT TO authenticated
  WITH CHECK (
    anotacao_id IS NULL
    AND public._denuncia_spin_anexo_anon_ok(denuncia_id)
  );

-- Paridade com canal_denuncias_spin_storage_insert_anon (OR com insert via RH).
DROP POLICY IF EXISTS canal_denuncias_spin_storage_insert_auth_public ON storage.objects;
CREATE POLICY canal_denuncias_spin_storage_insert_auth_public
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'canal-denuncias-spin'
    AND public._denuncia_spin_anexo_anon_ok(split_part(name, '/', 1)::uuid)
  );

COMMIT;
