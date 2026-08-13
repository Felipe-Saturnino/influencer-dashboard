-- Visibilidade inicial do tutorial Justificativa de Presença (Calendário).
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'justificativa-presenca',
  ARRAY[
    'performance_coach',
    'service_manager',
    'customer_service',
    'shift_leader',
    'shuffler',
    'game_presenter'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
