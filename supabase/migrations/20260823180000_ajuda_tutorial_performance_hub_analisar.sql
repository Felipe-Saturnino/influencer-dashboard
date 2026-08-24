-- Tutorial Performance Hub — analisar avaliação (prestador GP / Shuffler).
BEGIN;

INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'performance-hub-analisar-avaliacao',
  ARRAY['game_presenter', 'shuffler']::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;

COMMIT;
