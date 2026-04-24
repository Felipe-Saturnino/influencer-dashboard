-- ─── RH — Vagas (processo seletivo) + permissões page_key rh_vagas ───────────
-- RLS espelha rh_organograma (view / create / edit). Sem DELETE na tabela.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_vagas (
  id                                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                                text        NOT NULL,
  tipo_vaga                             text        NOT NULL
    CHECK (tipo_vaga IN ('interna', 'externa', 'mista')),
  org_time_id                           uuid        REFERENCES public.rh_org_times (id) ON UPDATE CASCADE ON DELETE SET NULL,
  remuneracao_centavos                  bigint      NOT NULL DEFAULT 0,
  data_abertura                         date        NOT NULL,
  data_fim_inscricoes                   date        NOT NULL,
  descricao                             text        NOT NULL DEFAULT '',
  responsabilidades                     text        NOT NULL DEFAULT '',
  requisitos                            text        NOT NULL DEFAULT '',
  escala_trabalho                       text        NOT NULL DEFAULT '',
  status                                text        NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  data_encerramento                     date,
  candidato_selecionado_funcionario_id uuid        REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,
  motivo_cancelamento                   text,
  created_at                            timestamptz NOT NULL DEFAULT now(),
  updated_at                            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_vagas_status ON public.rh_vagas (status);
CREATE INDEX IF NOT EXISTS idx_rh_vagas_org_time ON public.rh_vagas (org_time_id);
CREATE INDEX IF NOT EXISTS idx_rh_vagas_data_abertura ON public.rh_vagas (data_abertura DESC);

DROP TRIGGER IF EXISTS trg_rh_vagas_upd ON public.rh_vagas;
CREATE TRIGGER trg_rh_vagas_upd
  BEFORE UPDATE ON public.rh_vagas
  FOR EACH ROW EXECUTE PROCEDURE public.rh_org_set_updated_at();

CREATE OR REPLACE FUNCTION public._rh_vagas_perm(p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_vagas'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_vagas_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_vagas_perm(text) TO authenticated;

ALTER TABLE public.rh_vagas ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_vagas_select ON public.rh_vagas FOR SELECT TO authenticated
  USING (public._rh_vagas_perm('view'));
CREATE POLICY rh_vagas_insert ON public.rh_vagas FOR INSERT TO authenticated
  WITH CHECK (public._rh_vagas_perm('create'));
CREATE POLICY rh_vagas_update ON public.rh_vagas FOR UPDATE TO authenticated
  USING (public._rh_vagas_perm('edit')) WITH CHECK (public._rh_vagas_perm('edit'));

REVOKE DELETE ON TABLE public.rh_vagas FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rh_vagas TO authenticated;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'rh_vagas', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'rh_organograma'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('recursos_humanos', 'rh_vagas')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

COMMENT ON TABLE public.rh_vagas IS 'RH — vagas (aberta, em andamento, concluída, cancelada).';

COMMIT;
