-- Thread de conversa por campanha de roteiro de mesa (operadora ↔ estúdio), espelhando dealer_solicitacoes.

CREATE TABLE public.roteiro_campanha_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.roteiro_mesa_campanhas (id) ON DELETE CASCADE,
  operadora_slug text NOT NULL REFERENCES public.operadoras (slug) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'resolvido', 'cancelado')),
  aguarda_resposta_de text CHECK (aguarda_resposta_de IS NULL OR aguarda_resposta_de IN ('operadora', 'gestor')),
  titulo text,
  resolvido_em timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roteiro_campanha_solicitacao_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.roteiro_campanha_solicitacoes (id) ON DELETE CASCADE,
  autor text NOT NULL CHECK (autor IN ('operadora', 'gestor')),
  usuario_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  texto text NOT NULL,
  visto boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roteiro_camp_sol_campanha ON public.roteiro_campanha_solicitacoes (campanha_id);
CREATE INDEX idx_roteiro_camp_sol_operadora ON public.roteiro_campanha_solicitacoes (operadora_slug);
CREATE INDEX idx_roteiro_camp_sol_status ON public.roteiro_campanha_solicitacoes (status);
CREATE INDEX idx_roteiro_camp_sol_aguarda ON public.roteiro_campanha_solicitacoes (aguarda_resposta_de);
CREATE INDEX idx_roteiro_camp_sol_msg_solic ON public.roteiro_campanha_solicitacao_mensagens (solicitacao_id);

COMMENT ON TABLE public.roteiro_campanha_solicitacoes IS 'Solicitação de conversa vinculada a campanha de roteiro de mesa (nova campanha).';
COMMENT ON TABLE public.roteiro_campanha_solicitacao_mensagens IS 'Mensagens da thread de roteiro_campanha_solicitacoes.';

CREATE OR REPLACE FUNCTION public.touch_roteiro_campanha_solicitacoes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER roteiro_campanha_solicitacoes_updated_at
  BEFORE UPDATE ON public.roteiro_campanha_solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_roteiro_campanha_solicitacoes_updated_at();

-- ─── RLS roteiro_campanha_solicitacoes ───────────────────────────────────────

ALTER TABLE public.roteiro_campanha_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roteiro_camp_sol_select_staff"
  ON public.roteiro_campanha_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'executivo')
    )
  );

CREATE POLICY "roteiro_camp_sol_select_operador"
  ON public.roteiro_campanha_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
  );

CREATE POLICY "roteiro_camp_sol_insert_operador"
  ON public.roteiro_campanha_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
    AND EXISTS (
      SELECT 1 FROM public.roteiro_mesa_campanhas c
      WHERE c.id = campanha_id AND c.operadora_slug = operadora_slug
    )
  );

CREATE POLICY "roteiro_camp_sol_insert_staff"
  ON public.roteiro_campanha_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'executivo')
    )
    AND EXISTS (
      SELECT 1 FROM public.roteiro_mesa_campanhas c
      WHERE c.id = campanha_id AND c.operadora_slug = operadora_slug
    )
  );

CREATE POLICY "roteiro_camp_sol_update_staff"
  ON public.roteiro_campanha_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'executivo')
    )
  );

CREATE POLICY "roteiro_camp_sol_update_operador"
  ON public.roteiro_campanha_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
  );

-- ─── RLS mensagens ───────────────────────────────────────────────────────────

ALTER TABLE public.roteiro_campanha_solicitacao_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roteiro_camp_sol_msg_select"
  ON public.roteiro_campanha_solicitacao_mensagens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_campanha_solicitacoes s
      WHERE s.id = roteiro_campanha_solicitacao_mensagens.solicitacao_id
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

CREATE POLICY "roteiro_camp_sol_msg_insert"
  ON public.roteiro_campanha_solicitacao_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roteiro_campanha_solicitacoes s
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

CREATE POLICY "roteiro_camp_sol_msg_update_visto"
  ON public.roteiro_campanha_solicitacao_mensagens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_campanha_solicitacoes s
      WHERE s.id = roteiro_campanha_solicitacao_mensagens.solicitacao_id
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
