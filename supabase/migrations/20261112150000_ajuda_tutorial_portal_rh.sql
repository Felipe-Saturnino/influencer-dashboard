-- Visibilidade inicial dos tutoriais do Portal de RH (Gerenciamento + Ver Lidos).
-- Público típico com permissão de Editar na página; Admin vê todos e pode ajustar na UI.
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'portal-rh-gerenciamento-postagens',
  ARRAY['gestor_rh', 'rh']::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;

INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'portal-rh-comunicados-lidos',
  ARRAY['gestor_rh', 'rh']::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
