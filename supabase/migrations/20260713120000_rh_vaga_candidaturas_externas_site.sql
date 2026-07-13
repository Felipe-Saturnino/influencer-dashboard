-- RH Vagas: candidaturas externas (formulário Carreiras / site Spin).
-- Extende rh_vaga_candidaturas + bucket para vídeo/portfólio.

BEGIN;

-- ─── Colunas externas ─────────────────────────────────────────────────────────
ALTER TABLE public.rh_vaga_candidaturas
  ALTER COLUMN funcionario_id DROP NOT NULL;

ALTER TABLE public.rh_vaga_candidaturas
  ALTER COLUMN curriculo_storage_path DROP NOT NULL;

ALTER TABLE public.rh_vaga_candidaturas
  ALTER COLUMN curriculo_nome_arquivo DROP NOT NULL;

ALTER TABLE public.rh_vaga_candidaturas
  ALTER COLUMN funcao_atual SET DEFAULT '';

ALTER TABLE public.rh_vaga_candidaturas
  ALTER COLUMN carta_apresentacao SET DEFAULT '';

ALTER TABLE public.rh_vaga_candidaturas
  DROP CONSTRAINT IF EXISTS rh_vaga_candidaturas_vaga_funcionario_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_vaga_candidaturas_vaga_funcionario
  ON public.rh_vaga_candidaturas (vaga_id, funcionario_id)
  WHERE funcionario_id IS NOT NULL;

ALTER TABLE public.rh_vaga_candidaturas
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS redes_sociais text,
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS quem_indicou text,
  ADD COLUMN IF NOT EXISTS portfolio_storage_path text,
  ADD COLUMN IF NOT EXISTS portfolio_nome_arquivo text,
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS video_storage_path text,
  ADD COLUMN IF NOT EXISTS video_nome_arquivo text,
  ADD COLUMN IF NOT EXISTS turno_trabalho text,
  ADD COLUMN IF NOT EXISTS origem_formulario text NOT NULL DEFAULT 'interno';

ALTER TABLE public.rh_vaga_candidaturas
  DROP CONSTRAINT IF EXISTS rh_vaga_candidaturas_origem_check;

ALTER TABLE public.rh_vaga_candidaturas
  ADD CONSTRAINT rh_vaga_candidaturas_origem_check CHECK (
    origem IS NULL
    OR origem IN ('linkedin', 'indicacao', 'site_vagas', 'instagram', 'site_spin')
  );

ALTER TABLE public.rh_vaga_candidaturas
  DROP CONSTRAINT IF EXISTS rh_vaga_candidaturas_origem_formulario_check;

ALTER TABLE public.rh_vaga_candidaturas
  ADD CONSTRAINT rh_vaga_candidaturas_origem_formulario_check CHECK (
    origem_formulario IN ('interno', 'site')
  );

ALTER TABLE public.rh_vaga_candidaturas
  DROP CONSTRAINT IF EXISTS rh_vaga_candidaturas_turno_check;

ALTER TABLE public.rh_vaga_candidaturas
  ADD CONSTRAINT rh_vaga_candidaturas_turno_check CHECK (
    turno_trabalho IS NULL
    OR turno_trabalho IN ('Manhã', 'Tarde', 'Noite', 'Comercial')
  );

ALTER TABLE public.rh_vaga_candidaturas
  DROP CONSTRAINT IF EXISTS rh_vaga_candidaturas_site_ou_interno;

ALTER TABLE public.rh_vaga_candidaturas
  ADD CONSTRAINT rh_vaga_candidaturas_site_ou_interno CHECK (
    (origem_formulario = 'interno' AND funcionario_id IS NOT NULL)
    OR (origem_formulario = 'site' AND funcionario_id IS NULL AND coalesce(trim(email), '') <> '')
  );

COMMENT ON COLUMN public.rh_vaga_candidaturas.origem_formulario IS
  'interno = prestador logado; site = formulário Carreiras (WordPress).';
COMMENT ON COLUMN public.rh_vaga_candidaturas.origem IS
  'Como chegou até nós (candidatura site): linkedin | indicacao | site_vagas | instagram | site_spin.';
COMMENT ON COLUMN public.rh_vaga_candidaturas.turno_trabalho IS
  'Turno preferido (candidatura site): Manhã | Tarde | Noite | Comercial.';

CREATE INDEX IF NOT EXISTS idx_rh_vaga_candidaturas_origem_formulario
  ON public.rh_vaga_candidaturas (origem_formulario);

CREATE INDEX IF NOT EXISTS idx_rh_vaga_candidaturas_email
  ON public.rh_vaga_candidaturas (lower(email))
  WHERE email IS NOT NULL;

-- ─── Bucket: vídeo + imagens de portfólio + limite 100 MB ─────────────────────
UPDATE storage.buckets
SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
WHERE id = 'rh-vaga-candidaturas';

COMMIT;
