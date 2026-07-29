-- Seed: tutorial Postagem Academy com aprovação (Editar = Próprios → Enviar para aprovação)
BEGIN;

INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'postagem-academy-aprovacao',
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

COMMIT;
