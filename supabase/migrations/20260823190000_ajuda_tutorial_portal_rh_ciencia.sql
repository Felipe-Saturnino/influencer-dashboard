-- Tutorial Portal de RH — ciência em Políticas e normativas.
BEGIN;

INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'portal-rh-ciencia-politicas',
  ARRAY[
    'prestador',
    'game_presenter',
    'shuffler',
    'shift_leader',
    'service_manager',
    'customer_service',
    'tech_ops',
    'figurino',
    'comunicacao',
    'performance_coach',
    'rh',
    'gestor_rh'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;

COMMIT;
