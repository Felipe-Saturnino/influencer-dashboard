-- Remove dashboard Jogadores Spin: permissões de página e tabelas PLS de jogador.
-- (Políticas RLS são removidas automaticamente com as tabelas.)

DELETE FROM public.role_permissions WHERE page_key = 'jogadores_spin';
DELETE FROM public.gestor_tipo_pages WHERE page_key = 'jogadores_spin';
DELETE FROM public.operadora_pages WHERE page_key = 'jogadores_spin';

DROP TABLE IF EXISTS public.pls_jogador_historico_dia;
DROP TABLE IF EXISTS public.pls_jogador_dados;
