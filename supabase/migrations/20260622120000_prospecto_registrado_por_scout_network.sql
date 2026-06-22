-- Scout + Network: alinhar created_by de scout_influencer a profiles(id) e backfill legado (exceto site_spin).

BEGIN;

-- ─── Scout: FK created_by → profiles ─────────────────────────────────────────

ALTER TABLE public.scout_influencer
  DROP CONSTRAINT IF EXISTS scout_influencer_created_by_fkey;

ALTER TABLE public.scout_influencer
  ADD CONSTRAINT scout_influencer_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scout_influencer_created_by
  ON public.scout_influencer (created_by);

COMMENT ON COLUMN public.scout_influencer.created_by IS
  'Usuário da plataforma que registrou o prospecto (Novo Influencer ou Atribuir a mim). NULL em envios do site público até atribuição manual.';

-- ─── Backfill legado → Kaue (exceto prospectos site_spin) ───────────────────

DO $$
DECLARE
  v_kaue_id uuid;
BEGIN
  SELECT id INTO v_kaue_id
  FROM public.profiles
  WHERE lower(trim(email)) = lower('kaue.urbano@spingaming.com.br')
  LIMIT 1;

  IF v_kaue_id IS NULL THEN
    RAISE NOTICE 'Backfill prospecto created_by: perfil kaue.urbano@spingaming.com.br não encontrado — ignorado.';
  ELSE
    UPDATE public.scout_influencer
    SET created_by = v_kaue_id
    WHERE created_by IS NULL
      AND (tipo_contato IS NULL OR tipo_contato <> 'site_spin');

    UPDATE public.afiliados_network
    SET created_by = v_kaue_id
    WHERE created_by IS NULL
      AND (tipo_contato IS NULL OR tipo_contato <> 'site_spin');
  END IF;
END $$;

COMMIT;
