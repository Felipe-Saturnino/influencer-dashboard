-- Observações de dealers: INSERT/DELETE conforme role_permissions (Gestão de Usuários → central_notificacoes).
-- SELECT mantém-se para authenticated (filtros na aplicação).

DROP POLICY IF EXISTS "Allow authenticated to manage dealer_observacoes" ON public.dealer_observacoes;

CREATE POLICY "dealer_observacoes_select_authenticated"
  ON public.dealer_observacoes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "dealer_observacoes_insert_central_can_editar"
  ON public.dealer_observacoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key = 'central_notificacoes'
        AND rp.can_editar IN ('sim', 'proprios')
    )
  );

CREATE POLICY "dealer_observacoes_delete_central_can_excluir"
  ON public.dealer_observacoes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key = 'central_notificacoes'
        AND rp.can_excluir IN ('sim', 'proprios')
    )
  );

COMMENT ON TABLE public.dealer_observacoes IS 'Observações sobre dealers. INSERT: role_permissions(central_notificacoes).can_editar. DELETE: can_excluir. SELECT: authenticated.';
