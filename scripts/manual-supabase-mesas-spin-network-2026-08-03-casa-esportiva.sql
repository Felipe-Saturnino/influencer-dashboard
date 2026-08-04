-- Mesas Spin — 03/08/2026: Network — Esportiva Bet + Casa de Apostas (UPSERT).
--
-- Tabelas: relatorio_network_* (não misturar com Dedicado / relatorio_*).
-- Reconciliação: Esportiva = OK; Casa turnover −1; demais = OK.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-03', 'esportiva_bet', 1012455, -3701, 70220, 659),
  ('2026-08-03', 'casa_apostas',     3303,   282,  2098,  12)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-03', 'Esportiva Bet',   'esportiva_bet', 'Blackjack 1',           663,   7320,   168),
  ('2026-08-03', 'Esportiva Bet',   'esportiva_bet', 'Futebol Brasileiro',   4136, 184945,  4951),
  ('2026-08-03', 'Esportiva Bet',   'esportiva_bet', 'Speed Baccarat',       1779,   8393,   940),
  ('2026-08-03', 'Esportiva Bet',   'esportiva_bet', 'Roleta',             -10279, 811797, 64161),
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas',  'Blackjack 1',           505,   1145,    46),
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas',  'Futebol Brasileiro',      0,      0,     0),
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas',  'Roleta',                 24,     32,    27),
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas',  'Speed Baccarat',       -247,   2127,  2025)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-03', 'esportiva_bet', 'Blackjack',         15),
  ('2026-08-03', 'esportiva_bet', 'Futebol Brasileiro',288),
  ('2026-08-03', 'esportiva_bet', 'Speed Baccarat',    54),
  ('2026-08-03', 'esportiva_bet', 'Roleta',           315),
  ('2026-08-03', 'casa_apostas',  'Blackjack',          3),
  ('2026-08-03', 'casa_apostas',  'Futebol Brasileiro', 0),
  ('2026-08-03', 'casa_apostas',  'Speed Baccarat',     3),
  ('2026-08-03', 'casa_apostas',  'Roleta',             8)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 1246),
  ('2026-08-01', 'casa_apostas',    36)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
