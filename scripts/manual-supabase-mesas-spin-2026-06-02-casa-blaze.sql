-- Mesas Spin — 02/06/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação: Casa GGR/turnover +1; Blaze turnover +1 — arredondamento; apostas = OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-02', 'casa_apostas', 401020,  4769, 35774, 216),
  ('2026-06-02', 'blaze',        854699, 32271,121303, 748)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-02', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',         618,  36398,  1275),
  ('2026-06-02', 'Casa de Apostas', 'casa_apostas', 'Roleta',          -1105,  64672, 24608),
  ('2026-06-02', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',     -1565,  60315,  2148),
  ('2026-06-02', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  2928,  30115,   293),
  ('2026-06-02', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   1407, 141115,  5294),
  ('2026-06-02', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 2487,  68406,  2156),
  ('2026-06-02', 'Blaze',           'blaze',        'Blackjack 1',      5330, 170980,  9693),
  ('2026-06-02', 'Blaze',           'blaze',        'Roleta',          23871, 258542, 95117),
  ('2026-06-02', 'Blaze',           'blaze',        'Blackjack 2',      2800, 121108,  6824),
  ('2026-06-02', 'Blaze',           'blaze',        'Blackjack VIP',   -1888,  28425,   119),
  ('2026-06-02', 'Blaze',           'blaze',        'Speed Baccarat',   2158, 275645,  9550)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-02', 'casa_apostas', 'Blackjack',          41),
  ('2026-06-02', 'casa_apostas', 'Futebol Brasileiro', 65),
  ('2026-06-02', 'casa_apostas', 'Speed Baccarat',     55),
  ('2026-06-02', 'casa_apostas', 'Roleta',             98),
  ('2026-06-02', 'blaze',        'Blackjack',         203),
  ('2026-06-02', 'blaze',        'Speed Baccarat',    266),
  ('2026-06-02', 'blaze',        'Roleta',            339)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 381),
  ('2026-06-01', 'blaze',        1531)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
