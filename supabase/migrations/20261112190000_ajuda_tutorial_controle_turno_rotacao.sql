-- Visibilidade inicial — tutorial Gerar Rotação (Controle de Turno).
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'controle-turno-rotacao',
  ARRAY[
    'shift_leader',
    'service_manager',
    'gestor_operacoes'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
