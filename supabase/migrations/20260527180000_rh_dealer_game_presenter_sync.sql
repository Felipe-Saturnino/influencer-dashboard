-- Vínculo prestador (Game Presenter) ↔ dealer + campos espelhados editáveis na Gestão de Staff.

BEGIN;

ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS rh_funcionario_id uuid UNIQUE REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dealers_rh_funcionario_id ON public.dealers (rh_funcionario_id)
  WHERE rh_funcionario_id IS NOT NULL;

COMMENT ON COLUMN public.dealers.rh_funcionario_id IS
  'Prestador RH (time Game Presenter) que gera/atualiza este dealer automaticamente.';

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS staff_dealer_genero text,
  ADD COLUMN IF NOT EXISTS staff_dealer_bio text,
  ADD COLUMN IF NOT EXISTS staff_dealer_fotos jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rh_funcionarios_staff_dealer_genero_check'
  ) THEN
    ALTER TABLE public.rh_funcionarios
      ADD CONSTRAINT rh_funcionarios_staff_dealer_genero_check
      CHECK (staff_dealer_genero IS NULL OR staff_dealer_genero IN ('feminino', 'masculino'));
  END IF;
END $$;

COMMENT ON COLUMN public.rh_funcionarios.staff_dealer_genero IS 'Gênero exibido no dealer (Gestão de Staff > Gestão de dealer).';
COMMENT ON COLUMN public.rh_funcionarios.staff_dealer_bio IS 'Bio do dealer (perfil_influencer).';
COMMENT ON COLUMN public.rh_funcionarios.staff_dealer_fotos IS 'URLs das fotos do dealer (JSON array de strings).';

COMMIT;
