-- Visibilidade inicial — tutoriais Controle de Turno (liderança de estúdio).
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES
  (
    'controle-turno-aprovacao-escala',
    ARRAY[
      'shift_leader',
      'service_manager',
      'gestor_operacoes'
    ]::text[]
  ),
  (
    'controle-turno-relatorio',
    ARRAY[
      'shift_leader',
      'service_manager',
      'gestor_operacoes'
    ]::text[]
  ),
  (
    'controle-turno-notificacoes',
    ARRAY[
      'shift_leader',
      'service_manager',
      'gestor_operacoes'
    ]::text[]
  )
ON CONFLICT (tutorial_id) DO NOTHING;
