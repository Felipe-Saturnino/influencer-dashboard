-- Mesas Spin — 26/05/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação:
--   Casa: turnover soma mesas +1 vs daily (arredondamento); GGR e apostas = OK após correção daily.
--   Blaze: GGR soma −1 vs daily (arredondamento); turnover e apostas = OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-05-26', 'casa_apostas', 294328, 27029, 31666, 239),
  ('2026-05-26', 'blaze',        931578, -21294, 96740, 839)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-05-26', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        1518,   8968,    590),
  ('2026-05-26', 'Casa de Apostas', 'casa_apostas', 'Roleta',           8027,  84655,  23020),
  ('2026-05-26', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      7095,  74370,   3707),
  ('2026-05-26', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   725,   7315,    111),
  ('2026-05-26', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  7090,  93335,   1928),
  ('2026-05-26', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 2574, 25686,   2310),
  ('2026-05-26', 'Blaze',           'blaze',        'Blackjack 1',      9570, 186620,  10544),
  ('2026-05-26', 'Blaze',           'blaze',        'Roleta',        -17817, 189572,  70308),
  ('2026-05-26', 'Blaze',           'blaze',        'Blackjack 2',     1055, 106865,   7496),
  ('2026-05-26', 'Blaze',           'blaze',        'Blackjack VIP', -11650, 141000,    497),
  ('2026-05-26', 'Blaze',           'blaze',        'Speed Baccarat', -2453, 307521,   7895)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-05-26', 'casa_apostas', 'Blackjack',          56),
  ('2026-05-26', 'casa_apostas', 'Futebol Brasileiro', 109),
  ('2026-05-26', 'casa_apostas', 'Speed Baccarat',     45),
  ('2026-05-26', 'casa_apostas', 'Roleta',             72),
  ('2026-05-26', 'blaze',        'Blackjack',         209),
  ('2026-05-26', 'blaze',        'Speed Baccarat',    312),
  ('2026-05-26', 'blaze',        'Roleta',            376)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-05-01', 'casa_apostas', 1674),
  ('2026-05-01', 'blaze',        11229)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
