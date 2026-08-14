-- Mesas Spin — 2026-08-13 a 2026-08-13: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-13', 'blaze',  1349574,  42434,  99056, 818),
  ('2026-08-13', 'casa_apostas',   559016,  26029,  29306, 163)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-13', 'Blaze', 'blaze', 'Blackjack 1',  -9857,   297170,  10229),
  ('2026-08-13', 'Blaze', 'blaze', 'Blackjack 2',  22815,   242413,   7587),
  ('2026-08-13', 'Blaze', 'blaze', 'Roleta',   9493,   208462,  73569),
  ('2026-08-13', 'Blaze', 'blaze', 'Speed Baccarat',  37408,   358754,   6351),
  ('2026-08-13', 'Blaze', 'blaze', 'Blackjack VIP', -17425,   242775,   1320),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   7745,   150928,   1785),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   5410,    75578,   4211),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'Roleta',  -1263,    34525,  19544),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -9953,   136099,   2826),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  23513,   128010,    232),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    577,    33876,    708)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-13', 'blaze', 'Blackjack', 256),
  ('2026-08-13', 'blaze', 'Speed Baccarat', 309),
  ('2026-08-13', 'blaze', 'Roleta', 323),
  ('2026-08-13', 'casa_apostas', 'Blackjack',  48),
  ('2026-08-13', 'casa_apostas', 'Futebol Brasileiro',  16),
  ('2026-08-13', 'casa_apostas', 'Speed Baccarat',  38),
  ('2026-08-13', 'casa_apostas', 'Roleta',  87)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  718),
  ('2026-08-01', 'blaze', 4701)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
