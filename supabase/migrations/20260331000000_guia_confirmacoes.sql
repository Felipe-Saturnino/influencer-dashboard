-- ─── guia_confirmacoes: ciência de itens obrigatórios do Playbook (por influencer) ─
-- Permissões de página (can_view, can_editar, etc.) continuam em role_permissions (Gestão de Usuários).

CREATE TABLE public.guia_confirmacoes (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_key        text        NOT NULL,
  confirmed_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (influencer_id, item_key)
);

CREATE INDEX idx_guia_confirmacoes_influencer ON public.guia_confirmacoes(influencer_id);
CREATE INDEX idx_guia_confirmacoes_item_key ON public.guia_confirmacoes(item_key);

COMMENT ON TABLE public.guia_confirmacoes IS 'Registro de ciência do Playbook Influencers (item_key = agendamento_lives, prioridade_jogos, etc.).';

ALTER TABLE public.guia_confirmacoes ENABLE ROW LEVEL SECURITY;

-- Influenciador: CRUD apenas nas próprias linhas
CREATE POLICY "Influencer gerencia próprias confirmações guia"
  ON public.guia_confirmacoes
  FOR ALL
  USING (
    influencer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'influencer')
  )
  WITH CHECK (
    influencer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'influencer')
  );

-- Admin, gestor, executivo: leitura para auditoria
CREATE POLICY "Admin gestor executivo leem guia_confirmacoes"
  ON public.guia_confirmacoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'executivo')
    )
  );

-- Agência: leitura apenas de influencers vinculados (user_scopes agencia_par)
CREATE POLICY "Agencia le guia_confirmacoes do escopo"
  ON public.guia_confirmacoes
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'agencia')
    AND EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = auth.uid()
        AND s.scope_type = 'agencia_par'
        AND split_part(s.scope_ref, ':', 1) = guia_confirmacoes.influencer_id::text
    )
  );
