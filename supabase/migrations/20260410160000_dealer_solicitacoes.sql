-- Solicitações contextualizadas (troca de dealer / feedback) + thread de mensagens.
-- Escopo operadora via user_scopes (scope_type = 'operadora', scope_ref = slug) — alinhado a roteiro_mesa_campanhas.

CREATE TABLE public.dealer_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers (id) ON DELETE CASCADE,
  operadora_slug text NOT NULL REFERENCES public.operadoras (slug) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('troca_dealer', 'feedback')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'resolvido', 'cancelado')),
  aguarda_resposta_de text CHECK (aguarda_resposta_de IS NULL OR aguarda_resposta_de IN ('operadora', 'gestor')),
  titulo text,
  resolvido_em timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.solicitacao_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.dealer_solicitacoes (id) ON DELETE CASCADE,
  autor text NOT NULL CHECK (autor IN ('operadora', 'gestor')),
  usuario_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  texto text NOT NULL,
  visto boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dealer_solicitacoes_dealer ON public.dealer_solicitacoes (dealer_id);
CREATE INDEX idx_dealer_solicitacoes_operadora ON public.dealer_solicitacoes (operadora_slug);
CREATE INDEX idx_dealer_solicitacoes_status ON public.dealer_solicitacoes (status);
CREATE INDEX idx_dealer_solicitacoes_aguarda ON public.dealer_solicitacoes (aguarda_resposta_de);
CREATE INDEX idx_solicitacao_mensagens_solicitacao ON public.solicitacao_mensagens (solicitacao_id);
CREATE INDEX idx_solicitacao_mensagens_visto ON public.solicitacao_mensagens (visto);

COMMENT ON TABLE public.dealer_solicitacoes IS 'Solicitações da operadora ao estúdio (troca de dealer / feedback). Campanhas de roteiro permanecem em roteiro_mesa_campanhas.';
COMMENT ON TABLE public.solicitacao_mensagens IS 'Thread de mensagens por solicitação.';

CREATE OR REPLACE FUNCTION public.touch_dealer_solicitacoes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER dealer_solicitacoes_updated_at
  BEFORE UPDATE ON public.dealer_solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_dealer_solicitacoes_updated_at();

-- ─── RLS dealer_solicitacoes ───────────────────────────────────────────────

ALTER TABLE public.dealer_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealer_sol_select_staff"
  ON public.dealer_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'executivo')
    )
  );

CREATE POLICY "dealer_sol_select_operador"
  ON public.dealer_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
  );

CREATE POLICY "dealer_sol_insert_operador"
  ON public.dealer_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
    AND EXISTS (
      SELECT 1 FROM public.dealers d
      WHERE d.id = dealer_id
        AND (d.operadora_slug IS NULL OR d.operadora_slug = operadora_slug)
    )
  );

CREATE POLICY "dealer_sol_update_staff"
  ON public.dealer_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'executivo')
    )
  );

CREATE POLICY "dealer_sol_update_operador"
  ON public.dealer_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
  );

-- ─── RLS solicitacao_mensagens (herda acesso da solicitação + papel na mensagem) ─

ALTER TABLE public.solicitacao_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sol_msg_select"
  ON public.solicitacao_mensagens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dealer_solicitacoes s
      WHERE s.id = solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'executivo')
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

CREATE POLICY "sol_msg_insert"
  ON public.solicitacao_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dealer_solicitacoes s
      WHERE s.id = solicitacao_id
        AND (
          (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'executivo')
            )
            AND autor = 'gestor'
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND autor = 'operadora'
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

CREATE POLICY "sol_msg_update_visto"
  ON public.solicitacao_mensagens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dealer_solicitacoes s
      WHERE s.id = solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'executivo')
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );
