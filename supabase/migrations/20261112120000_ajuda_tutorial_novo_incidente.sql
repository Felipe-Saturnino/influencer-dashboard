-- Visibilidade inicial do tutorial Novo Incidente — Service Manager / Shift Leader.
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'novo-incidente',
  ARRAY[
    'service_manager',
    'shift_leader'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
