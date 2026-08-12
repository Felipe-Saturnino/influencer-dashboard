-- Visibilidade inicial do tutorial Imprimir IDs (Gestão de Staff).
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'imprimir-ids-staff',
  ARRAY[
    'service_manager',
    'shift_leader',
    'performance_coach',
    'customer_service'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
