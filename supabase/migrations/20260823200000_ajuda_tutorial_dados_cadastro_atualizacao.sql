-- Tutorial Dados de Cadastro — atualização cadastral obrigatória.
BEGIN;

INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'dados-cadastro-atualizacao-cadastral',
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
