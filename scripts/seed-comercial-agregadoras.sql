-- Seed Pipeline Agregadoras — lista estática (prospecção).
-- Idempotente por nome (lower(trim)). Status inicial: conexao. Comercial: null.
-- Rodar no SQL Editor do Supabase (service role / bypass RLS).

BEGIN;

INSERT INTO public.comercial_agregadoras (nome, site, jogos, status_pipeline)
SELECT v.nome, v.site, v.jogos, 'conexao'
FROM (
  VALUES
    ('SoftSwiss',              'https://softswiss.com',        40000),
    ('Alea',                   'https://alea.com',             16000),
    ('BetConstruct',           'https://betconstruct.com',     NULL),
    ('Playtech',               'https://playtech.com',         NULL),
    ('Cactus',                 'https://cactusgaming.net',     NULL),
    ('Cometa Gaming',          'https://cometagaming.com',     NULL),
    ('EveryMatrix',            'https://everymatrix.com',      45000),
    ('Slotegrator',            'https://slotegrator.pro',      30000),
    ('Hub88',                  'https://hub88.io',             12000),
    ('SoftGamings',            'https://softgamings.com',      10000),
    ('Relax Gaming',           'https://relax-gaming.com',     NULL),
    ('Pariplay',               'https://pariplay.com',         NULL),
    ('BlueOcean Gaming',       'https://blueoceangaming.com',  13000),
    ('ESA Gaming',             'https://esagaming.com',        NULL),
    ('NuxGame',                'https://nuxgame.com',          NULL),
    ('Infingame',              'https://infingame.com',        15000),
    ('Relum',                  'https://relum.com',            50000),
    ('Bragg',                  'https://bragg.group',          NULL),
    ('QTech Games',            'https://qtechgames.com',       NULL),
    ('LuckyStreak',            'https://luckystreak.com',      NULL),
    ('GR8 Tech',               'https://gr8.tech',             NULL),
    ('DST Gaming',             'https://dstgaming.com',        NULL),
    ('Upgaming',               'https://upgaming.com',         NULL),
    ('Vyking',                 'https://vyking.io',            NULL),
    ('Pronet Gaming',          'https://pronetgaming.com',     NULL),
    ('Aristocrat Interactive', 'https://aristocrat.com',       NULL),
    ('Aspire Global',          'https://aspireglobal.com',     NULL),
    ('Games Global',           'https://gamesglobal.com',      NULL),
    ('EDICT',                  'https://edict.com',            NULL)
) AS v(nome, site, jogos)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.comercial_agregadoras a
  WHERE lower(trim(a.nome)) = lower(trim(v.nome))
);

-- Sem site na lista (cadastrar depois manualmente ou completar o site):
-- iGaming Deck | Vision Link | Bitville Gaming | Bet Oxygen | Singular | WA.Technology | iGpixel | 1Click Games

COMMIT;
