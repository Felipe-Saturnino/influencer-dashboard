-- Mesas Spin — 02/08/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa e Blaze GGR, turnover e apostas = OK.
-- Blaze mesa VIP gravada como «Blackjack VIP» (canónico; print veio «VIP Blackjack 1»).
-- UAP por jogo ≠ daily (esperado).
-- Monthly: não veio no print deste dia — não atualizado aqui (usar script 01/08 ou print novo).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-02', 'casa_apostas', 200877,  835,  44612, 126),
  ('2026-08-02', 'blaze',        959857, 59130, 107072, 637)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',           -35,    3470,   205),
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',          1160,    6940,   622),
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas', 'Roleta',               -820,  182212, 42157),
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',       -316,    5046,  1522),
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',       125,     225,     9),
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    721,    2984,    97),
  ('2026-08-02', 'Blaze',           'blaze',        'Blackjack 1',         20538,  217510, 10456),
  ('2026-08-02', 'Blaze',           'blaze',        'Blackjack 2',          2745,  114813,  8388),
  ('2026-08-02', 'Blaze',           'blaze',        'Roleta',              15990,  422272, 82206),
  ('2026-08-02', 'Blaze',           'blaze',        'Speed Baccarat',      10807,  159187,  5773),
  ('2026-08-02', 'Blaze',           'blaze',        'Blackjack VIP',        9050,   46075,   249)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-02', 'casa_apostas', 'Blackjack',          22),
  ('2026-08-02', 'casa_apostas', 'Futebol Brasileiro',  8),
  ('2026-08-02', 'casa_apostas', 'Speed Baccarat',     19),
  ('2026-08-02', 'casa_apostas', 'Roleta',             89),
  ('2026-08-02', 'blaze',        'Blackjack',         199),
  ('2026-08-02', 'blaze',        'Speed Baccarat',    252),
  ('2026-08-02', 'blaze',        'Roleta',            237)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
