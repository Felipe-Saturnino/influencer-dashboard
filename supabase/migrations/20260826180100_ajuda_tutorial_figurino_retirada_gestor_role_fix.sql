-- Corrige seed com role legado `gestor` (removido) → `gestor_operacoes` (ROLES canónico).
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
ON CONFLICT (tutorial_id) DO UPDATE SET roles = EXCLUDED.roles;
