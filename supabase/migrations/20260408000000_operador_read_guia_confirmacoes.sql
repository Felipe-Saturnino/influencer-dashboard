-- Operador: leitura de guia_confirmacoes dos influencers vinculados às operadoras do escopo
-- (necessário para validar ciência do Playbook ao agendar lives na agenda).

CREATE POLICY "Operador le guia_confirmacoes dos influencers das operadoras"
  ON public.guia_confirmacoes
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
    AND EXISTS (
      SELECT 1
      FROM public.influencer_operadoras io
      JOIN public.user_scopes s
        ON s.user_id = auth.uid()
        AND s.scope_type = 'operadora'
        AND s.scope_ref = io.operadora_slug
      WHERE io.influencer_id = guia_confirmacoes.influencer_id
    )
  );
