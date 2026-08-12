-- Visibilidade inicial do tutorial Aprovar Atestado e Reunião (Solicitações RH).
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'rh-solicitacoes-aprovar',
  ARRAY['gestor_rh', 'rh']::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
