-- Portal RH — RH Talks: aplicavel_a (filtro de visibilidade como Políticas).
-- Colar no SQL Editor: scripts/COLE-NO-SUPABASE-rh-portal-rh-talk-aplicavel-a.sql

BEGIN;

ALTER TABLE public.rh_portal_rh_talk
  ADD COLUMN IF NOT EXISTS aplicavel_a text[] NOT NULL DEFAULT ARRAY['Todos os prestadores']::text[];

COMMENT ON COLUMN public.rh_portal_rh_talk.aplicavel_a IS
  'Público-alvo: «Todos os prestadores» ou nomes de diretoria/gerência/time. Filtro de listagem na UI quando Ver = Próprios (sem RLS).';

UPDATE public.rh_portal_rh_talk
SET aplicavel_a = ARRAY['Todos os prestadores']::text[]
WHERE aplicavel_a IS NULL OR cardinality(aplicavel_a) = 0;

COMMIT;
