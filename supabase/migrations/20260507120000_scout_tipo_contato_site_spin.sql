-- Prospectos vindos do site institucional: novo valor em tipo_contato (UI: "Site Spin").
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'scout_influencer'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%tipo_contato%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.scout_influencer DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.scout_influencer
  ADD CONSTRAINT scout_influencer_tipo_contato_check
  CHECK (
    tipo_contato IS NULL
    OR tipo_contato IN ('agente', 'plataforma', 'direto', 'site_spin')
  );
