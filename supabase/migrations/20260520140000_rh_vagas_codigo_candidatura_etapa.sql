-- Código único da vaga + etapa do processo seletivo na candidatura.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.rh_vaga_code_seq;

ALTER TABLE public.rh_vagas
  ADD COLUMN IF NOT EXISTS codigo_vaga text;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.rh_vagas WHERE codigo_vaga IS NULL OR trim(codigo_vaga) = '' ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.rh_vagas
    SET codigo_vaga = 'VAG-' || lpad(nextval('public.rh_vaga_code_seq')::text, 6, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.rh_vagas
  ALTER COLUMN codigo_vaga SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_vagas_codigo_vaga ON public.rh_vagas (codigo_vaga);

CREATE OR REPLACE FUNCTION public.rh_vagas_atribuir_codigo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_vaga IS NULL OR trim(NEW.codigo_vaga) = '' THEN
    NEW.codigo_vaga := 'VAG-' || lpad(nextval('public.rh_vaga_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_vagas_codigo ON public.rh_vagas;
CREATE TRIGGER trg_rh_vagas_codigo
  BEFORE INSERT ON public.rh_vagas
  FOR EACH ROW EXECUTE PROCEDURE public.rh_vagas_atribuir_codigo();

COMMENT ON COLUMN public.rh_vagas.codigo_vaga IS 'Código único legível da vaga (ex.: VAG-000042).';

ALTER TABLE public.rh_vaga_candidaturas
  ADD COLUMN IF NOT EXISTS etapa text NOT NULL DEFAULT 'inscritos';

ALTER TABLE public.rh_vaga_candidaturas DROP CONSTRAINT IF EXISTS rh_vaga_candidaturas_etapa_check;
ALTER TABLE public.rh_vaga_candidaturas
  ADD CONSTRAINT rh_vaga_candidaturas_etapa_check CHECK (
    etapa IN (
      'inscritos',
      'aguardando_retorno',
      'agendado',
      'em_avaliacao',
      'aprovado',
      'stand_by',
      'contratado',
      'dispensado'
    )
  );

CREATE INDEX IF NOT EXISTS idx_rh_vaga_candidaturas_etapa ON public.rh_vaga_candidaturas (etapa);

DROP POLICY IF EXISTS rh_vaga_candidaturas_update ON public.rh_vaga_candidaturas;
CREATE POLICY rh_vaga_candidaturas_update ON public.rh_vaga_candidaturas FOR UPDATE TO authenticated
  USING (public._rh_vagas_perm('edit'))
  WITH CHECK (public._rh_vagas_perm('edit'));

GRANT UPDATE ON TABLE public.rh_vaga_candidaturas TO authenticated;

COMMENT ON COLUMN public.rh_vaga_candidaturas.etapa IS 'Etapa do funil: inscritos, aguardando_retorno, agendado, em_avaliacao, aprovado, stand_by, contratado, dispensado.';

COMMIT;
