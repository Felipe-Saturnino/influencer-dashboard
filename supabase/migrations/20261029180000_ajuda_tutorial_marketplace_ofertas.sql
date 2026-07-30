-- Seed: tutorial Marketplace — Game Presenter e Shuffler
BEGIN;

INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'marketplace-ofertas',
  ARRAY[
    'game_presenter',
    'shuffler'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;

COMMIT;
