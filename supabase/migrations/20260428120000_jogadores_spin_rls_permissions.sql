-- Leitura dos dados PLS no app (dashboard Jogadores Spin): políticas SELECT para authenticated.
-- Permissões de menu: espelha mesas_spin em role_permissions, gestor_tipo_pages e operadora_pages.

DROP POLICY IF EXISTS pls_jogador_dados_select_authenticated ON public.pls_jogador_dados;
CREATE POLICY pls_jogador_dados_select_authenticated ON public.pls_jogador_dados
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS pls_jogador_historico_dia_select_authenticated ON public.pls_jogador_historico_dia;
CREATE POLICY pls_jogador_historico_dia_select_authenticated ON public.pls_jogador_historico_dia
  FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'jogadores_spin', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'mesas_spin'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT gestor_tipo_slug, 'jogadores_spin'
FROM public.gestor_tipo_pages
WHERE page_key = 'mesas_spin'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT operadora_slug, 'jogadores_spin'
FROM public.operadora_pages
WHERE page_key = 'mesas_spin'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;
