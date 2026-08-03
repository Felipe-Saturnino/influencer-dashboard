-- Mesas Spin — 01/08/2026: Network — Esportiva Bet + Casa de Apostas (UPSERT).
--
-- Tabelas: relatorio_network_* (não misturar com Dedicado / relatorio_*).
-- Reconciliação: Esportiva GGR/turnover −1; Casa = OK.
-- UAP por jogo ≠ daily (esperado).
-- Monthly agosto conforme print do dia 01.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 29818, -3941, 2142, 57),
  ('2026-08-01', 'casa_apostas',    970,   116,  698, 16)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-01', 'Esportiva Bet',   'esportiva_bet', 'Blackjack 1',          328,  1233,   77),
  ('2026-08-01', 'Esportiva Bet',   'esportiva_bet', 'Futebol Brasileiro',    0,     0,    0),
  ('2026-08-01', 'Esportiva Bet',   'esportiva_bet', 'Speed Baccarat',       42,  8311, 1710),
  ('2026-08-01', 'Esportiva Bet',   'esportiva_bet', 'Roleta',            -4310, 20275,  355),
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas',  'Blackjack 1',         105,   510,   52),
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas',  'Futebol Brasileiro',    5,     5,    1),
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas',  'Roleta',               20,   192,   92),
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas',  'Speed Baccarat',      -14,   263,  553)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 'Blackjack',          8),
  ('2026-08-01', 'esportiva_bet', 'Futebol Brasileiro', 0),
  ('2026-08-01', 'esportiva_bet', 'Speed Baccarat',    40),
  ('2026-08-01', 'esportiva_bet', 'Roleta',             9),
  ('2026-08-01', 'casa_apostas',  'Blackjack',          3),
  ('2026-08-01', 'casa_apostas',  'Futebol Brasileiro', 1),
  ('2026-08-01', 'casa_apostas',  'Speed Baccarat',     5),
  ('2026-08-01', 'casa_apostas',  'Roleta',             9)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 388),
  ('2026-08-01', 'casa_apostas',   27)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
