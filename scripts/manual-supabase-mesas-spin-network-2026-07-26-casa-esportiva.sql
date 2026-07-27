-- Mesas Spin — 26/07/2026: Network — Esportiva Bet + Casa de Apostas (UPSERT).
--
-- Tabelas: relatorio_network_* (não misturar com Dedicado / relatorio_*).
-- Reconciliação: Casa = OK; Esportiva zeros.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-26', 'esportiva_bet',   0,  0,  0, 0),
  ('2026-07-26', 'casa_apostas',  252, 19, 45, 6)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-26', 'Esportiva Bet',   'esportiva_bet', 'Blackjack 1',          0,   0,  0),
  ('2026-07-26', 'Esportiva Bet',   'esportiva_bet', 'Roleta',               0,   0,  0),
  ('2026-07-26', 'Esportiva Bet',   'esportiva_bet', 'Futebol Brasileiro',   0,   0,  0),
  ('2026-07-26', 'Esportiva Bet',   'esportiva_bet', 'Speed Baccarat',       0,   0,  0),
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas',  'Blackjack 1',          0,   0,  0),
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas',  'Futebol Brasileiro',   0,  20,  3),
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas',  'Roleta',              19, 232, 42),
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas',  'Speed Baccarat',       0,   0,  0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-26', 'esportiva_bet', 'Blackjack',           0),
  ('2026-07-26', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-07-26', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-07-26', 'esportiva_bet', 'Roleta',              0),
  ('2026-07-26', 'casa_apostas',  'Blackjack',           0),
  ('2026-07-26', 'casa_apostas',  'Futebol Brasileiro',  1),
  ('2026-07-26', 'casa_apostas',  'Speed Baccarat',      0),
  ('2026-07-26', 'casa_apostas',  'Roleta',              5)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'esportiva_bet',   0),
  ('2026-07-01', 'casa_apostas',  108)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
