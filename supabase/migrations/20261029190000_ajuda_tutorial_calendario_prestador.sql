-- Visibilidade inicial do tutorial Calendário para perfis de prestador.
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'calendario-prestador',
  ARRAY[
    'prestador',
    'performance_coach',
    'service_manager',
    'customer_service',
    'shift_leader',
    'shuffler',
    'game_presenter',
    'tech_ops',
    'figurino',
    'comunicacao'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
