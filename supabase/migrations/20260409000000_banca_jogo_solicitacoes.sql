-- Solicitações de pagamento de banca de jogo (influencers / agência solicitam; staff aprova e libera).

CREATE TABLE IF NOT EXISTS public.banca_jogo_solicitacoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  operadora_slug        text NOT NULL REFERENCES public.operadoras (slug),
  id_operadora_exibicao text,
  valor                 numeric(14, 2) NOT NULL CHECK (valor > 0),
  status                text NOT NULL DEFAULT 'solicitado'
    CHECK (status IN ('solicitado', 'aprovado', 'liberado')),
  solicitado_em         timestamptz NOT NULL DEFAULT now(),
  aprovado_em           timestamptz,
  aprovado_por          uuid REFERENCES public.profiles (id),
  liberado_em           timestamptz,
  liberado_por          uuid REFERENCES public.profiles (id),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banca_jogo_influencer ON public.banca_jogo_solicitacoes (influencer_id);
CREATE INDEX IF NOT EXISTS idx_banca_jogo_operadora ON public.banca_jogo_solicitacoes (operadora_slug);
CREATE INDEX IF NOT EXISTS idx_banca_jogo_solicitado_em ON public.banca_jogo_solicitacoes (solicitado_em);
CREATE INDEX IF NOT EXISTS idx_banca_jogo_status ON public.banca_jogo_solicitacoes (status);

COMMENT ON TABLE public.banca_jogo_solicitacoes IS 'Fluxo: solicitado → aprovado → liberado. Influencer ou agência insere; admin/gestor/executivo/operador atualiza status.';

ALTER TABLE public.banca_jogo_solicitacoes ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "banca_jogo_select_admin_gestor"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
  );

CREATE POLICY "banca_jogo_select_influencer"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'influencer')
    AND influencer_id = auth.uid()
  );

CREATE POLICY "banca_jogo_select_agencia"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'agencia')
    AND EXISTS (
      SELECT 1 FROM  public.user_scopes s
      WHERE s.user_id = auth.uid()
        AND s.scope_type = 'agencia_par'
        AND s.scope_ref = (banca_jogo_solicitacoes.influencer_id::text || ':' || banca_jogo_solicitacoes.operadora_slug)
    )
  );

CREATE POLICY "banca_jogo_select_executivo"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
  );

CREATE POLICY "banca_jogo_select_operador"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
    AND operadora_slug IN (
      SELECT s.scope_ref FROM public.user_scopes s
      WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
    )
  );

-- INSERT: influencer (próprio) ou agência (par no escopo)
CREATE POLICY "banca_jogo_insert_influencer"
  ON public.banca_jogo_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'influencer')
    AND influencer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.influencer_operadoras io
      WHERE io.influencer_id = auth.uid()
        AND io.operadora_slug = banca_jogo_solicitacoes.operadora_slug
        AND io.ativo IS TRUE
    )
  );

CREATE POLICY "banca_jogo_insert_agencia"
  ON public.banca_jogo_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'agencia')
    AND EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = auth.uid()
        AND s.scope_type = 'agencia_par'
        AND s.scope_ref = (banca_jogo_solicitacoes.influencer_id::text || ':' || banca_jogo_solicitacoes.operadora_slug)
    )
    AND EXISTS (
      SELECT 1 FROM public.influencer_operadoras io
      WHERE io.influencer_id = banca_jogo_solicitacoes.influencer_id
        AND io.operadora_slug = banca_jogo_solicitacoes.operadora_slug
        AND io.ativo IS TRUE
    )
  );

-- UPDATE: aprovar / liberar (staff)
CREATE POLICY "banca_jogo_update_staff"
  ON public.banca_jogo_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor'))
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
  );
