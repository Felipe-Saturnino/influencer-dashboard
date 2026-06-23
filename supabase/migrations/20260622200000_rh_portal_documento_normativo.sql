-- Portal RH — documentos normativos (PDF canônico + metadados de capa)

BEGIN;

ALTER TABLE public.rh_portal_documento
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS versao text DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS tipo_documento text
    CHECK (tipo_documento IS NULL OR tipo_documento IN ('politica_rh', 'procedimento', 'codigo', 'politica_ops')),
  ADD COLUMN IF NOT EXISTS area_responsavel text,
  ADD COLUMN IF NOT EXISTS classificacao text
    CHECK (classificacao IS NULL OR classificacao IN ('uso_interno', 'publico_interno')),
  ADD COLUMN IF NOT EXISTS aplicavel_a text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resumo text,
  ADD COLUMN IF NOT EXISTS data_emissao text,
  ADD COLUMN IF NOT EXISTS elaborado_por text,
  ADD COLUMN IF NOT EXISTS revisado_por text,
  ADD COLUMN IF NOT EXISTS aprovado_por_doc text;

ALTER TABLE public.rh_portal_documento
  ALTER COLUMN categoria_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rh_portal_documento_codigo_versao_unique
  ON public.rh_portal_documento (upper(trim(codigo)), trim(versao))
  WHERE codigo IS NOT NULL AND status <> 'arquivado';

CREATE TABLE IF NOT EXISTS public.rh_portal_documento_relacao (
  documento_id    uuid NOT NULL REFERENCES public.rh_portal_documento (id) ON DELETE CASCADE,
  relacionado_id  uuid NOT NULL REFERENCES public.rh_portal_documento (id) ON DELETE CASCADE,
  PRIMARY KEY (documento_id, relacionado_id),
  CONSTRAINT rh_portal_documento_relacao_distinto CHECK (documento_id <> relacionado_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_portal_documento_relacao_rel
  ON public.rh_portal_documento_relacao (relacionado_id);

ALTER TABLE public.rh_portal_documento_relacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_portal_documento_relacao_select ON public.rh_portal_documento_relacao
  FOR SELECT TO authenticated USING (public._rh_portal_perm('view'));

CREATE POLICY rh_portal_documento_relacao_insert ON public.rh_portal_documento_relacao
  FOR INSERT TO authenticated WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_documento_relacao_delete ON public.rh_portal_documento_relacao
  FOR DELETE TO authenticated USING (public._rh_portal_perm('edit'));

GRANT SELECT, INSERT, DELETE ON public.rh_portal_documento_relacao TO authenticated;

COMMENT ON COLUMN public.rh_portal_documento.codigo IS 'Código oficial do documento (ex.: POL-RH-001, PROC-OPS-003).';
COMMENT ON COLUMN public.rh_portal_documento.tipo_documento IS 'Família do documento normativo publicado no portal.';
COMMENT ON TABLE public.rh_portal_documento_relacao IS 'Vínculos entre documentos normativos (referências cruzadas).';

COMMIT;
