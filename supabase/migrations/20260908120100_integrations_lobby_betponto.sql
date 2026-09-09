-- Integração Lobby BetPontoBet — Status Técnico e sync_logs (Edge monitor-lobby-betponto).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_betponto',
  'Lobby BetPontoBet',
  'Monitor de posicionamento das mesas Spin na grade Todos os jogos da BetPontoBet (games/category offset/limit; Edge monitor-lobby-betponto / job Telecom).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
