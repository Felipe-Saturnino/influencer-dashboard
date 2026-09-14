-- Mesas Spin — 2026-09-10 a 2026-09-10: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-10', 'blaze',  2043245,   6630, 146151, 951),
  ('2026-09-10', 'casa_apostas',   500071,  51018,  34290, 129)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-10', 'Blaze', 'blaze', 'Blackjack 1',  37538,   264565,  11749),
  ('2026-09-10', 'Blaze', 'blaze', 'Blackjack 2',  -5022,   221143,  10229),
  ('2026-09-10', 'Blaze', 'blaze', 'Roleta', -60613,   844386, 113277),
  ('2026-09-10', 'Blaze', 'blaze', 'Speed Baccarat',  27302,   465801,   9589),
  ('2026-09-10', 'Blaze', 'blaze', 'Blackjack VIP',   7425,   247350,   1307),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   7203,   119708,    621),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',  10083,    53120,   1124),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'Roleta',  18627,   137462,  30859),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -8896,   103015,   1215),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  24035,    84255,    304),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -34,     2511,    167)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-10', 'blaze', 'Blackjack', 305),
  ('2026-09-10', 'blaze', 'Speed Baccarat', 385),
  ('2026-09-10', 'blaze', 'Roleta', 347),
  ('2026-09-10', 'casa_apostas', 'Blackjack',  18),
  ('2026-09-10', 'casa_apostas', 'Futebol Brasileiro',  11),
  ('2026-09-10', 'casa_apostas', 'Speed Baccarat',  18),
  ('2026-09-10', 'casa_apostas', 'Roleta',  90)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  550),
  ('2026-09-01', 'blaze', 4754)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
