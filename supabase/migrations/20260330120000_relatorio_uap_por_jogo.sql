-- UAP diário por tipo de jogo (gráfico "UAP por Jogo" no dashboard Mesas Spin).
-- Inserir dados via SQL (Supabase SQL Editor ou migração).

CREATE TABLE IF NOT EXISTS public.relatorio_uap_por_jogo (
  data       date        NOT NULL,
  jogo       text        NOT NULL,
  uap        bigint      NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT relatorio_uap_por_jogo_data_jogo_key UNIQUE (data, jogo)
);

COMMENT ON TABLE public.relatorio_uap_por_jogo IS 'UAP diário por jogo (Blackjack, Roleta, Speed Baccarat, etc.) — alimentado por SQL';
COMMENT ON COLUMN public.relatorio_uap_por_jogo.data IS 'Dia (ISO)';
COMMENT ON COLUMN public.relatorio_uap_por_jogo.jogo IS 'Nome do jogo; o gráfico mapeia Blackjack, Roleta e Speed Baccarat';
COMMENT ON COLUMN public.relatorio_uap_por_jogo.uap IS 'Unique active players';

CREATE INDEX IF NOT EXISTS idx_relatorio_uap_por_jogo_data ON public.relatorio_uap_por_jogo (data DESC);

ALTER TABLE public.relatorio_uap_por_jogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY relatorio_uap_por_jogo_select_auth ON public.relatorio_uap_por_jogo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY relatorio_uap_por_jogo_all_service ON public.relatorio_uap_por_jogo
  FOR ALL TO service_role USING (true) WITH CHECK (true);
