-- Tutoriais Performance Hub — avaliação (Gerenciamento) e pesos (Configuração).
BEGIN;

INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES
  (
    'performance-hub-avaliar',
    ARRAY['performance_coach']::text[]
  ),
  (
    'performance-hub-configuracao-pesos',
    ARRAY['performance_coach']::text[]
  )
ON CONFLICT (tutorial_id) DO NOTHING;

COMMIT;
