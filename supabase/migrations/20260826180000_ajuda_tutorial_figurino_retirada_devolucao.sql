-- Visibilidade inicial — Retirada e Devolução (Figurinos): liderança de estúdio.
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'figurino-retirada-devolucao',
  ARRAY[
    'shift_leader',
    'service_manager',
    'figurino',
    'gestor_operacoes',
    'rh'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
