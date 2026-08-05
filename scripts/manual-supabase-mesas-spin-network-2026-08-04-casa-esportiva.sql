-- Mesas Spin — 04/08/2026: Network — Esportiva Bet + Casa de Apostas (UPSERT).
--
-- Tabelas: relatorio_network_* (não misturar com Dedicado / relatorio_*).
-- Reconciliação: Esportiva = OK; Casa turnover −1 / apostas +2; GGR = OK.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-04', 'esportiva_bet', 811038, 13771, 60007, 590),
  ('2026-08-04', 'casa_apostas',    6728,   762,  1945,  15)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-04', 'Esportiva Bet',   'esportiva_bet', 'Blackjack 1',          1370,  15255,   899),
  ('2026-08-04', 'Esportiva Bet',   'esportiva_bet', 'Futebol Brasileiro', -18217, 254408,  6664),
  ('2026-08-04', 'Esportiva Bet',   'esportiva_bet', 'Speed Baccarat',       -899,  21198,   343),
  ('2026-08-04', 'Esportiva Bet',   'esportiva_bet', 'Roleta',              31517, 520177, 52101),
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas',  'Blackjack 1',           345,   4240,   283),
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas',  'Futebol Brasileiro',      0,      0,     0),
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas',  'Roleta',                313,   1133,    43),
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas',  'Speed Baccarat',        104,   1356,  1617)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-04', 'esportiva_bet', 'Blackjack',         32),
  ('2026-08-04', 'esportiva_bet', 'Futebol Brasileiro',312),
  ('2026-08-04', 'esportiva_bet', 'Speed Baccarat',    32),
  ('2026-08-04', 'esportiva_bet', 'Roleta',           234),
  ('2026-08-04', 'casa_apostas',  'Blackjack',          4),
  ('2026-08-04', 'casa_apostas',  'Futebol Brasileiro', 0),
  ('2026-08-04', 'casa_apostas',  'Speed Baccarat',     4),
  ('2026-08-04', 'casa_apostas',  'Roleta',             7)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 1422),
  ('2026-08-01', 'casa_apostas',    43)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
