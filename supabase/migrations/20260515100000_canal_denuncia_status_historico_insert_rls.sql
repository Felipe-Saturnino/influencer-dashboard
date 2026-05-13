-- Ao atualizar status em canal_denuncias_spin, o trigger insere em canal_denuncia_status_historico.
-- Faltava GRANT INSERT + política RLS → 42501 para admin / quem tem edição na Central.

BEGIN;

GRANT INSERT ON TABLE public.canal_denuncia_status_historico TO authenticated;

DROP POLICY IF EXISTS canal_denuncia_status_hist_insert_auth ON public.canal_denuncia_status_historico;
CREATE POLICY canal_denuncia_status_hist_insert_auth
  ON public.canal_denuncia_status_historico FOR INSERT TO authenticated
  WITH CHECK (public._rh_central_denuncias_perm('edit'));

COMMIT;
