-- Mesas Spin — 15/07/2026: Network — Esportiva Bet + Casa de Apostas (UPSERT).
--
-- Tabelas: relatorio_network_* (não misturar com Dedicado / relatorio_*).
-- Reconciliação: Casa = OK; Esportiva zeros.
-- UAP por jogo ≠ daily (esperado). Typo OCR «asa de Apostas» → casa_apostas.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-15', 'esportiva_bet',     0,    0,    0,  0),
  ('2026-07-15', 'casa_apostas',  36729, 5969, 1270, 20)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-15', 'Esportiva Bet',   'esportiva_bet', 'Blackjack 1',           0,     0,   0),
  ('2026-07-15', 'Esportiva Bet',   'esportiva_bet', 'Roleta',                0,     0,   0),
  ('2026-07-15', 'Esportiva Bet',   'esportiva_bet', 'Futebol Brasileiro',    0,     0,   0),
  ('2026-07-15', 'Esportiva Bet',   'esportiva_bet', 'Speed Baccarat',        0,     0,   0),
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas',  'Blackjack 1',        3705, 31455, 790),
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas',  'Futebol Brasileiro',   45,    75,   8),
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas',  'Speed Baccarat',      388,   740,  47),
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas',  'Roleta',             1831,  4459, 425)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-15', 'esportiva_bet', 'Blackjack',           0),
  ('2026-07-15', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-07-15', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-07-15', 'esportiva_bet', 'Roleta',              0),
  ('2026-07-15', 'casa_apostas',  'Blackjack',           9),
  ('2026-07-15', 'casa_apostas',  'Futebol Brasileiro',  2),
  ('2026-07-15', 'casa_apostas',  'Speed Baccarat',      4),
  ('2026-07-15', 'casa_apostas',  'Roleta',             11)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'esportiva_bet',  0),
  ('2026-07-01', 'casa_apostas',  38)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
