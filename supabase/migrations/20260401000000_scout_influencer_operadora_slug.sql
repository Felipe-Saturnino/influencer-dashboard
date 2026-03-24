-- Scout: operadora principal do fechamento (copiada para influencer_operadoras + user_scopes via Edge Function)
ALTER TABLE public.scout_influencer
  ADD COLUMN IF NOT EXISTS operadora_slug TEXT REFERENCES public.operadoras (slug) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scout_influencer_operadora_slug ON public.scout_influencer (operadora_slug);
