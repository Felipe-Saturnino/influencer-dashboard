-- Mesas Spin — 2026-09-02 a 2026-09-02: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-02', 'blaze',    94718,   3300,   6278,  61),
  ('2026-09-02', 'casa_apostas',     2648,    568,   2561,  12),
  ('2026-09-02', 'esportiva_bet',  2096327,  92567,  96172, 424),
  ('2026-09-02', 'jonbet',    45903,   4778,   5526,  92)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-02', 'Blaze', 'blaze', 'Blackjack 1',   1195,    88168,   2958),
  ('2026-09-02', 'Blaze', 'blaze', 'Futebol Brasileiro',   1402,     3843,    204),
  ('2026-09-02', 'Blaze', 'blaze', 'Speed Baccarat',    -42,      314,     85),
  ('2026-09-02', 'Blaze', 'blaze', 'Roleta',    745,     2393,   3031),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    100,      100,      2),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -25,       25,      1),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     37,      318,    184),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'Roleta',    456,     2205,   2374),
  ('2026-09-02', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',  24038,   137338,    845),
  ('2026-09-02', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',    481,    15844,   2757),
  ('2026-09-02', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  -3662,    57451,   2379),
  ('2026-09-02', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  71710,  1885694,  90191),
  ('2026-09-02', 'Jon Bet', 'jonbet', 'Blackjack 1',   4375,    23075,    499),
  ('2026-09-02', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',     79,     2144,    264),
  ('2026-09-02', 'Jon Bet', 'jonbet', 'Speed Baccarat',    400,     3172,    816),
  ('2026-09-02', 'Jon Bet', 'jonbet', 'Roleta',    -76,    17512,   3947)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-02', 'blaze', 'Blackjack',  34),
  ('2026-09-02', 'blaze', 'Futebol Brasileiro',  10),
  ('2026-09-02', 'blaze', 'Speed Baccarat',   6),
  ('2026-09-02', 'blaze', 'Roleta',  18),
  ('2026-09-02', 'casa_apostas', 'Blackjack',   1),
  ('2026-09-02', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-09-02', 'casa_apostas', 'Speed Baccarat',   4),
  ('2026-09-02', 'casa_apostas', 'Roleta',   7),
  ('2026-09-02', 'esportiva_bet', 'Blackjack',  36),
  ('2026-09-02', 'esportiva_bet', 'Futebol Brasileiro', 103),
  ('2026-09-02', 'esportiva_bet', 'Speed Baccarat',  63),
  ('2026-09-02', 'esportiva_bet', 'Roleta', 268),
  ('2026-09-02', 'jonbet', 'Blackjack',   5),
  ('2026-09-02', 'jonbet', 'Futebol Brasileiro',  27),
  ('2026-09-02', 'jonbet', 'Speed Baccarat',  20),
  ('2026-09-02', 'jonbet', 'Roleta',  48)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 957),
  ('2026-09-01', 'casa_apostas',  24),
  ('2026-09-01', 'blaze', 121),
  ('2026-09-01', 'jonbet', 196)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
