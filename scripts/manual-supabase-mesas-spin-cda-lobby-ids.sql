-- IDs CDA para monitor de lobby (competition.id na API de categorias).
-- Mesas Spin no JSON aparecem como provider "GamesGlobal" (não "Spin").
-- Alternativa: usar externalIdentifier.identifier (62082, 62084, …) — a Edge aceita ambos.

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '3304', updated_at = now()
WHERE operadora_slug = 'casa_apostas' AND lower(btrim(nome_mesa)) IN ('roleta');

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '3305', updated_at = now()
WHERE operadora_slug = 'casa_apostas' AND lower(btrim(nome_mesa)) LIKE '%speed baccarat%';

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '3302', updated_at = now()
WHERE operadora_slug = 'casa_apostas' AND lower(btrim(nome_mesa)) = 'blackjack 1';

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '3303', updated_at = now()
WHERE operadora_slug = 'casa_apostas' AND lower(btrim(nome_mesa)) LIKE '%blackjack vip%';

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '3306', updated_at = now()
WHERE operadora_slug = 'casa_apostas' AND lower(btrim(nome_mesa)) = 'blackjack 2';

SELECT nome_mesa, mesa_identificacao, mesa_identificacao_operadora
FROM public.mesas_spin_cadastro
WHERE operadora_slug = 'casa_apostas'
ORDER BY nome_mesa;
