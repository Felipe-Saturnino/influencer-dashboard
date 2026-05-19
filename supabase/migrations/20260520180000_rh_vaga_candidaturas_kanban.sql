-- Kanban candidaturas: campos por etapa, histórico, anotações/anexos; remove etapa aprovado.

BEGIN;

UPDATE public.rh_vaga_candidaturas SET etapa = 'stand_by' WHERE etapa = 'aprovado';

ALTER TABLE public.rh_vaga_candidaturas
  ADD COLUMN IF NOT EXISTS etapa_entrada_em timestamptz,
  ADD COLUMN IF NOT EXISTS data_agendamento date,
  ADD COLUMN IF NOT EXISTS data_aprovacao date,
  ADD COLUMN IF NOT EXISTS data_contratacao date,
  ADD COLUMN IF NOT EXISTS data_dispensa date,
  ADD COLUMN IF NOT EXISTS motivo_dispensa text;

UPDATE public.rh_vaga_candidaturas
SET etapa_entrada_em = COALESCE(etapa_entrada_em, created_at)
WHERE etapa_entrada_em IS NULL;

ALTER TABLE public.rh_vaga_candidaturas
  ALTER COLUMN etapa_entrada_em SET DEFAULT now();

ALTER TABLE public.rh_vaga_candidaturas DROP CONSTRAINT IF EXISTS rh_vaga_candidaturas_etapa_check;
ALTER TABLE public.rh_vaga_candidaturas
  ADD CONSTRAINT rh_vaga_candidaturas_etapa_check CHECK (
    etapa IN (
      'inscritos',
      'aguardando_retorno',
      'agendado',
      'em_avaliacao',
      'stand_by',
      'contratado',
      'dispensado'
    )
  );

COMMENT ON COLUMN public.rh_vaga_candidaturas.etapa_entrada_em IS 'Data/hora em que o card entrou na etapa atual.';
COMMENT ON COLUMN public.rh_vaga_candidaturas.data_agendamento IS 'Preenchida ao mover para etapa agendado.';
COMMENT ON COLUMN public.rh_vaga_candidaturas.data_aprovacao IS 'Preenchida ao mover para stand_by (Data de Aprovação).';
COMMENT ON COLUMN public.rh_vaga_candidaturas.data_contratacao IS 'Preenchida ao mover para contratado.';
COMMENT ON COLUMN public.rh_vaga_candidaturas.data_dispensa IS 'Preenchida ao mover para dispensado.';
COMMENT ON COLUMN public.rh_vaga_candidaturas.motivo_dispensa IS 'Motivo ao mover para dispensado.';

CREATE OR REPLACE FUNCTION public.rh_vaga_candidatura_sync_etapa_entrada()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.etapa_entrada_em IS NULL THEN
      NEW.etapa_entrada_em := now();
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.etapa IS DISTINCT FROM NEW.etapa THEN
    NEW.etapa_entrada_em := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_vaga_candidatura_etapa_entrada ON public.rh_vaga_candidaturas;
CREATE TRIGGER trg_rh_vaga_candidatura_etapa_entrada
  BEFORE INSERT OR UPDATE OF etapa ON public.rh_vaga_candidaturas
  FOR EACH ROW
  EXECUTE PROCEDURE public.rh_vaga_candidatura_sync_etapa_entrada();

-- Histórico
CREATE TABLE IF NOT EXISTS public.rh_vaga_candidatura_historico (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id  uuid        NOT NULL REFERENCES public.rh_vaga_candidaturas (id) ON DELETE CASCADE,
  tipo            text        NOT NULL
    CHECK (tipo IN ('etapa', 'anotacao', 'anexo', 'campos_etapa')),
  resumo          text        NOT NULL DEFAULT '',
  detalhes        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_vaga_cand_hist_candidatura ON public.rh_vaga_candidatura_historico (candidatura_id, created_at DESC);

ALTER TABLE public.rh_vaga_candidatura_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rh_vaga_candidatura_historico_select ON public.rh_vaga_candidatura_historico;
CREATE POLICY rh_vaga_candidatura_historico_select ON public.rh_vaga_candidatura_historico FOR SELECT TO authenticated
  USING (
    public._rh_vagas_perm('view')
    OR EXISTS (
      SELECT 1 FROM public.rh_vaga_candidaturas c
      WHERE c.id = candidatura_id
        AND public._rh_funcionario_vinculado_ao_login(c.funcionario_id)
    )
  );

DROP POLICY IF EXISTS rh_vaga_candidatura_historico_insert ON public.rh_vaga_candidatura_historico;
CREATE POLICY rh_vaga_candidatura_historico_insert ON public.rh_vaga_candidatura_historico FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_vagas_perm('edit')
    AND created_by = auth.uid()
  );

GRANT SELECT, INSERT ON TABLE public.rh_vaga_candidatura_historico TO authenticated;

-- Anotações e anexos
CREATE TABLE IF NOT EXISTS public.rh_vaga_candidatura_anotacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id  uuid        NOT NULL REFERENCES public.rh_vaga_candidaturas (id) ON DELETE CASCADE,
  conteudo        text        NOT NULL DEFAULT '',
  created_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rh_vaga_candidatura_anexos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id  uuid        NOT NULL REFERENCES public.rh_vaga_candidaturas (id) ON DELETE CASCADE,
  anotacao_id     uuid        REFERENCES public.rh_vaga_candidatura_anotacoes (id) ON DELETE SET NULL,
  storage_path    text        NOT NULL,
  nome_arquivo    text        NOT NULL,
  created_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_vaga_cand_anot_candidatura ON public.rh_vaga_candidatura_anotacoes (candidatura_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rh_vaga_cand_anex_candidatura ON public.rh_vaga_candidatura_anexos (candidatura_id, created_at DESC);

ALTER TABLE public.rh_vaga_candidatura_anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_vaga_candidatura_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rh_vaga_candidatura_anotacoes_select ON public.rh_vaga_candidatura_anotacoes;
CREATE POLICY rh_vaga_candidatura_anotacoes_select ON public.rh_vaga_candidatura_anotacoes FOR SELECT TO authenticated
  USING (
    public._rh_vagas_perm('view')
    OR EXISTS (
      SELECT 1 FROM public.rh_vaga_candidaturas c
      WHERE c.id = candidatura_id
        AND public._rh_funcionario_vinculado_ao_login(c.funcionario_id)
    )
  );

DROP POLICY IF EXISTS rh_vaga_candidatura_anotacoes_insert ON public.rh_vaga_candidatura_anotacoes;
CREATE POLICY rh_vaga_candidatura_anotacoes_insert ON public.rh_vaga_candidatura_anotacoes FOR INSERT TO authenticated
  WITH CHECK (public._rh_vagas_perm('edit') AND created_by = auth.uid());

DROP POLICY IF EXISTS rh_vaga_candidatura_anexos_select ON public.rh_vaga_candidatura_anexos;
CREATE POLICY rh_vaga_candidatura_anexos_select ON public.rh_vaga_candidatura_anexos FOR SELECT TO authenticated
  USING (
    public._rh_vagas_perm('view')
    OR EXISTS (
      SELECT 1 FROM public.rh_vaga_candidaturas c
      WHERE c.id = candidatura_id
        AND public._rh_funcionario_vinculado_ao_login(c.funcionario_id)
    )
  );

DROP POLICY IF EXISTS rh_vaga_candidatura_anexos_insert ON public.rh_vaga_candidatura_anexos;
CREATE POLICY rh_vaga_candidatura_anexos_insert ON public.rh_vaga_candidatura_anexos FOR INSERT TO authenticated
  WITH CHECK (public._rh_vagas_perm('edit') AND created_by = auth.uid());

GRANT SELECT, INSERT ON TABLE public.rh_vaga_candidatura_anotacoes TO authenticated;
GRANT SELECT, INSERT ON TABLE public.rh_vaga_candidatura_anexos TO authenticated;

-- RH pode enviar anexos de anotação no bucket
DROP POLICY IF EXISTS rh_vaga_candidaturas_storage_insert_rh ON storage.objects;
CREATE POLICY rh_vaga_candidaturas_storage_insert_rh ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rh-vaga-candidaturas' AND public._rh_vagas_perm('edit'));

COMMIT;
