-- Visibilidade inicial do tutorial Editar Staff (Gestão de Staff).
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'gestao-staff-editar',
  ARRAY[
    'service_manager',
    'shift_leader',
    'performance_coach',
    'customer_service'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
