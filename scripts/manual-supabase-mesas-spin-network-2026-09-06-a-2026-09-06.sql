-- Mesas Spin — 2026-09-06 a 2026-09-06: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-06', 'blaze',    55283,   3114,  11185,  56),
  ('2026-09-06', 'casa_apostas',    26030,   5527,   5985,  20),
  ('2026-09-06', 'esportiva_bet',   341220,   9739,  98162, 399),
  ('2026-09-06', 'jonbet',    72846,   5793,  11072,  88)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-06', 'Blaze', 'blaze', 'Blackjack 1',   2423,    38270,   3033),
  ('2026-09-06', 'Blaze', 'blaze', 'Futebol Brasileiro',    227,     7619,    254),
  ('2026-09-06', 'Blaze', 'blaze', 'Speed Baccarat',    162,     1342,    212),
  ('2026-09-06', 'Blaze', 'blaze', 'Roleta',    302,     8052,   7686),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    165,     6828,    687),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   -490,     3760,    286),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -129,     2072,    637),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'Roleta',   5981,    13370,   4375),
  ('2026-09-06', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   3420,    29500,   1867),
  ('2026-09-06', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',  -1047,    46967,   4256),
  ('2026-09-06', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',    690,     9942,   2420),
  ('2026-09-06', 'Esportiva Bet', 'esportiva_bet', 'Roleta',   6676,   254811,  89619),
  ('2026-09-06', 'Jon Bet', 'jonbet', 'Blackjack 1',  -1910,    24530,   1150),
  ('2026-09-06', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    600,     6498,    336),
  ('2026-09-06', 'Jon Bet', 'jonbet', 'Speed Baccarat',    245,     1593,    720),
  ('2026-09-06', 'Jon Bet', 'jonbet', 'Roleta',   6858,    40225,   8866)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-06', 'blaze', 'Blackjack',  32),
  ('2026-09-06', 'blaze', 'Futebol Brasileiro',   7),
  ('2026-09-06', 'blaze', 'Speed Baccarat',  11),
  ('2026-09-06', 'blaze', 'Roleta',  12),
  ('2026-09-06', 'casa_apostas', 'Blackjack',   6),
  ('2026-09-06', 'casa_apostas', 'Futebol Brasileiro',   3),
  ('2026-09-06', 'casa_apostas', 'Speed Baccarat',   8),
  ('2026-09-06', 'casa_apostas', 'Roleta',  11),
  ('2026-09-06', 'esportiva_bet', 'Blackjack',  45),
  ('2026-09-06', 'esportiva_bet', 'Futebol Brasileiro', 107),
  ('2026-09-06', 'esportiva_bet', 'Speed Baccarat',  58),
  ('2026-09-06', 'esportiva_bet', 'Roleta', 228),
  ('2026-09-06', 'jonbet', 'Blackjack',  12),
  ('2026-09-06', 'jonbet', 'Futebol Brasileiro',  23),
  ('2026-09-06', 'jonbet', 'Speed Baccarat',  19),
  ('2026-09-06', 'jonbet', 'Roleta',  46)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 2023),
  ('2026-09-01', 'casa_apostas',   52),
  ('2026-09-01', 'blaze',  213),
  ('2026-09-01', 'jonbet',  376)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
