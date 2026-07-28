-- Seed: tutorial Alterar Escala — Service Manager / Shift Leader (e perfis com Editar na Escala Estúdio)
BEGIN;

INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'alterar-escala',
  ARRAY[
    'service_manager',
    'shift_leader'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;

COMMIT;
