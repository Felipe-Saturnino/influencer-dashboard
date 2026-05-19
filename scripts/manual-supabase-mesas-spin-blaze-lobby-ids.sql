-- Preenche mesa_identificacao_operadora (IDs na API Blaze) nas mesas já cadastradas.
-- Ajuste mesa_identificacao (ID Spin) no WHERE se os seus valores internos forem outros.
-- Requer migration 20260518150000_mesas_spin_identificacao_operadora.sql aplicada.

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '500617', updated_at = now()
WHERE operadora_slug = 'blaze' AND lower(btrim(nome_mesa)) IN ('roleta');

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '500616', updated_at = now()
WHERE operadora_slug = 'blaze' AND lower(btrim(nome_mesa)) LIKE '%speed baccarat%';

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '501109', updated_at = now()
WHERE operadora_slug = 'blaze' AND lower(btrim(nome_mesa)) = 'blackjack 1';

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '501110', updated_at = now()
WHERE operadora_slug = 'blaze' AND lower(btrim(nome_mesa)) LIKE '%blackjack vip%';

UPDATE public.mesas_spin_cadastro
SET mesa_identificacao_operadora = '500615', updated_at = now()
WHERE operadora_slug = 'blaze' AND lower(btrim(nome_mesa)) = 'blackjack 2';

SELECT nome_mesa, mesa_identificacao, mesa_identificacao_operadora
FROM public.mesas_spin_cadastro
WHERE operadora_slug = 'blaze'
ORDER BY nome_mesa;
