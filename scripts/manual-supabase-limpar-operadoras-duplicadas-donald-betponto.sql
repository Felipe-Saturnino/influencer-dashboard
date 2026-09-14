-- Limpeza de operadoras duplicadas — Bet.Bet e Donald Bet
--
-- Manter (canónicas do extract Mesas Spin / Overview Spin):
--   betponto_bet  → Bet.Bet
--   donald_bet    → Donald Bet
--
-- Excluir (legado / duplicata):
--   bet_bet_bet   → Bet.Bet Bet
--   donaldbet     → DonaldBet
--
-- Antes do DELETE: migrar IDs de lobby em mesas_spin_operadora_identificacao
-- (FK ON DELETE RESTRICT). Relatórios já estão nas slugs canónicas.
--
-- Colar no SQL Editor do Supabase (postgres).

BEGIN;

-- 1) Conferência prévia
SELECT slug, nome, ativo
FROM public.operadoras
WHERE slug IN ('betponto_bet', 'bet_bet_bet', 'donald_bet', 'donaldbet')
ORDER BY slug;

SELECT operadora_slug, COUNT(*) AS ids
FROM public.mesas_spin_operadora_identificacao
WHERE operadora_slug IN ('betponto_bet', 'bet_bet_bet', 'donald_bet', 'donaldbet')
GROUP BY operadora_slug
ORDER BY operadora_slug;

-- 2) Migrar IDs de lobby das slugs legadas → canónicas
UPDATE public.mesas_spin_operadora_identificacao
SET operadora_slug = 'betponto_bet',
    updated_at = now()
WHERE operadora_slug = 'bet_bet_bet';

UPDATE public.mesas_spin_operadora_identificacao
SET operadora_slug = 'donald_bet',
    updated_at = now()
WHERE operadora_slug = 'donaldbet';

-- 3) Excluir duplicatas (não usadas pelo processo de carga)
DELETE FROM public.operadoras
WHERE slug IN ('bet_bet_bet', 'donaldbet');

-- 4) Conferência final — deve restar só betponto_bet e donald_bet
SELECT slug, nome, ativo
FROM public.operadoras
WHERE slug IN ('betponto_bet', 'bet_bet_bet', 'donald_bet', 'donaldbet')
ORDER BY slug;

SELECT operadora_slug, COUNT(*) AS ids
FROM public.mesas_spin_operadora_identificacao
WHERE operadora_slug IN ('betponto_bet', 'bet_bet_bet', 'donald_bet', 'donaldbet')
GROUP BY operadora_slug
ORDER BY operadora_slug;

COMMIT;
