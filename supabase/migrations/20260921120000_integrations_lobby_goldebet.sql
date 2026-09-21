-- Integração Lobby Goldebet — Status Técnico e sync_logs (Edge monitor-lobby-goldebet).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_goldebet',
  'Lobby Goldebet',
  'Monitor de posicionamento das mesas Spin na grade Cassino Ao Vivo da Goldebet (v2/casino-games category 2 order=clicks; Edge monitor-lobby-goldebet / job Telecom).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
