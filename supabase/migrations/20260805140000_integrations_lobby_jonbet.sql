-- Integração Lobby Jonbet — Status Técnico e sync_logs (Edge monitor-lobby-jonbet).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_jonbet',
  'Lobby Jonbet',
  'Monitor de posicionamento das mesas Spin no Cassino Ao Vivo da Jonbet (SoftSwiss /api/games/search; Edge monitor-lobby-jonbet / job Telecom).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
