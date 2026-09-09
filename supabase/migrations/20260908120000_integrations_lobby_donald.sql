-- Integração Lobby Donald Bet — Status Técnico e sync_logs (Edge monitor-lobby-donald).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_donald',
  'Lobby Donald Bet',
  'Monitor de posicionamento das mesas Spin na grade Todos os jogos da DonaldBet (games/category offset/limit; Edge monitor-lobby-donald / job Telecom).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
