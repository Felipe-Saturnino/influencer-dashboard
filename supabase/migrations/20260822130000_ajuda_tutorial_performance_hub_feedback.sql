-- Tutorial Performance Hub — aplicar feedback (aba Feedback).
BEGIN;

INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'performance-hub-aplicar-feedback',
  ARRAY['shift_leader']::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;

COMMIT;
