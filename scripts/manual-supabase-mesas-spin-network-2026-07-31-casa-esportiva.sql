-- Mesas Spin — 31/07/2026: Network — Esportiva Bet + Casa de Apostas (UPSERT).
--
-- Tabelas: relatorio_network_* (não misturar com Dedicado / relatorio_*).
-- Reconciliação: Esportiva e Casa GGR, turnover e apostas = OK.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-31', 'esportiva_bet', 69392, 27539, 1586, 74),
  ('2026-07-31', 'casa_apostas',    618,    67,  398, 12)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-31', 'Esportiva Bet',   'esportiva_bet', 'Blackjack 1',          -45,  1810,  109),
  ('2026-07-31', 'Esportiva Bet',   'esportiva_bet', 'Futebol Brasileiro',    0,     0,    0),
  ('2026-07-31', 'Esportiva Bet',   'esportiva_bet', 'Speed Baccarat',     -796,  8422, 1040),
  ('2026-07-31', 'Esportiva Bet',   'esportiva_bet', 'Roleta',            28380, 59160,  437),
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas',  'Blackjack 1',          45,   175,   16),
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas',  'Futebol Brasileiro',  -10,    20,    3),
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas',  'Roleta',               12,   271,   91),
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas',  'Speed Baccarat',       20,   152,  288)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-31', 'esportiva_bet', 'Blackjack',          9),
  ('2026-07-31', 'esportiva_bet', 'Futebol Brasileiro', 0),
  ('2026-07-31', 'esportiva_bet', 'Speed Baccarat',    57),
  ('2026-07-31', 'esportiva_bet', 'Roleta',            11),
  ('2026-07-31', 'casa_apostas',  'Blackjack',          2),
  ('2026-07-31', 'casa_apostas',  'Futebol Brasileiro', 1),
  ('2026-07-31', 'casa_apostas',  'Speed Baccarat',     5),
  ('2026-07-31', 'casa_apostas',  'Roleta',             6)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'esportiva_bet',  74),
  ('2026-07-01', 'casa_apostas',  139)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
