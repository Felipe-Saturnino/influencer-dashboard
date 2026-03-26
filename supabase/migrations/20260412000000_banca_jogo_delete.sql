-- Exclusão de solicitações (alinhar com permissão can_excluir na Gestão de Usuários).
-- Mesmo escopo de visibilidade do UPDATE para staff; influencer/agência removem apenas linhas já permitidas por INSERT.

CREATE POLICY "banca_jogo_delete_admin_gestor"
  ON public.banca_jogo_solicitacoes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
  );

CREATE POLICY "banca_jogo_delete_executivo"
  ON public.banca_jogo_solicitacoes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
  );

CREATE POLICY "banca_jogo_delete_operador"
  ON public.banca_jogo_solicitacoes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
  );

CREATE POLICY "banca_jogo_delete_influencer"
  ON public.banca_jogo_solicitacoes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'influencer')
    AND influencer_id = auth.uid()
  );

CREATE POLICY "banca_jogo_delete_agencia"
  ON public.banca_jogo_solicitacoes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'agencia')
    AND EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = auth.uid()
        AND s.scope_type = 'agencia_par'
        AND s.scope_ref = (banca_jogo_solicitacoes.influencer_id::text || ':' || banca_jogo_solicitacoes.operadora_slug)
    )
  );
