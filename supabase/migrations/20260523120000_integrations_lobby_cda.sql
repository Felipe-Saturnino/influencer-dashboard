-- Integração Lobby CDA — Status Técnico e sync_logs (Edge monitor-lobby-cda).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_cda',
  'Lobby Casa de Apostas',
  'Monitor de posicionamento das mesas Spin nas categorias ao vivo da CDA (Edge monitor-lobby-cda / job agendado).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
