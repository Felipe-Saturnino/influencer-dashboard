-- Visibilidade dos tutoriais de Solicitações RH (visão gestor): Reuniões, Vagas e Feedback.
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES
  (
    'rh-solicitacoes-reunioes',
    ARRAY[
      'shift_leader',
      'service_manager',
      'gestor_operacoes',
      'gestor_rh',
      'rh'
    ]::text[]
  ),
  (
    'rh-solicitacoes-vagas',
    ARRAY[
      'shift_leader',
      'service_manager',
      'gestor_operacoes',
      'gestor_rh',
      'rh'
    ]::text[]
  ),
  (
    'rh-solicitacoes-feedback',
    ARRAY[
      'shift_leader',
      'service_manager',
      'gestor_operacoes',
      'gestor_rh',
      'rh'
    ]::text[]
  )
ON CONFLICT (tutorial_id) DO NOTHING;
