-- Prestadores: status (ativo / indisponivel / encerrado), histórico de ações RH e bucket de anexos.

BEGIN;

-- Migra inativo → encerrado e amplia valores permitidos de status
ALTER TABLE public.rh_funcionarios DROP CONSTRAINT IF EXISTS rh_funcionarios_status_check;

UPDATE public.rh_funcionarios SET status = 'encerrado' WHERE status = 'inativo';

ALTER TABLE public.rh_funcionarios
  ADD CONSTRAINT rh_funcionarios_status_check
  CHECK (status IN ('ativo', 'indisponivel', 'encerrado'));

CREATE TABLE IF NOT EXISTS public.rh_funcionario_historico (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rh_funcionario_id   uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  tipo                text NOT NULL,
  detalhes            jsonb NOT NULL DEFAULT '{}'::jsonb,
  anexos              jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid
);

CREATE INDEX IF NOT EXISTS idx_rh_func_hist_func ON public.rh_funcionario_historico (rh_funcionario_id, created_at DESC);

COMMENT ON TABLE public.rh_funcionario_historico IS 'Histórico de ações de RH sobre prestadores (revisão, indisponibilidade, término, etc.).';

CREATE OR REPLACE FUNCTION public.rh_funcionario_historico_set_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := coalesce(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_funcionario_historico_ins ON public.rh_funcionario_historico;
CREATE TRIGGER trg_rh_funcionario_historico_ins
  BEFORE INSERT ON public.rh_funcionario_historico
  FOR EACH ROW EXECUTE PROCEDURE public.rh_funcionario_historico_set_user();

ALTER TABLE public.rh_funcionario_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_funcionario_historico_select
  ON public.rh_funcionario_historico FOR SELECT TO authenticated
  USING (public._rh_funcionario_perm('view'));

CREATE POLICY rh_funcionario_historico_insert
  ON public.rh_funcionario_historico FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_funcionario_perm('edit')
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f
      WHERE f.id = rh_funcionario_id
    )
  );

REVOKE ALL ON public.rh_funcionario_historico FROM PUBLIC;
GRANT SELECT, INSERT ON public.rh_funcionario_historico TO authenticated;

-- Bucket para anexos das ações (URLs gravadas em rh_funcionario_historico.anexos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rh-prestador-acoes',
  'rh-prestador-acoes',
  true,
  15728640,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rh_prestador_acoes public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'rh-prestador-acoes');

CREATE POLICY "rh_prestador_acoes authenticated insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'rh-prestador-acoes');

CREATE POLICY "rh_prestador_acoes authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'rh-prestador-acoes');

CREATE POLICY "rh_prestador_acoes authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'rh-prestador-acoes');

COMMIT;
