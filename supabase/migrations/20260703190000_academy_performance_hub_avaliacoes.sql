-- Performance Hub — avaliações de desempenho (Academy)

BEGIN;

CREATE OR REPLACE FUNCTION public._academy_performance_hub_perm(p_need text)
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
      OR public._gestor_page_perm('academy_performance_hub', p_need)
      OR public._prestador_page_perm('academy_performance_hub', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'academy_performance_hub'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._academy_performance_hub_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._academy_performance_hub_perm(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.academy_performance_hub_avaliacao (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_avaliacao      date        NOT NULL,
  time_slug           text        NOT NULL CHECK (time_slug IN ('game_presenter', 'shuffler')),
  avaliado_staff_id   uuid        REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,
  avaliado_nome       text        NOT NULL,
  avaliador_nome      text        NOT NULL,
  status              text        NOT NULL CHECK (status IN ('pendente', 'rascunho', 'em_analise', 'feedback', 'concluida')),
  nota_total          numeric(5, 2),
  nota_imagem         numeric(5, 2),
  nota_comunicacao    numeric(5, 2),
  nota_mesa           numeric(5, 2),
  nota_procedimentos  numeric(5, 2),
  tipo_avaliacao      text        CHECK (tipo_avaliacao IS NULL OR tipo_avaliacao IN ('performance_coach', 'extra')),
  turno               text,
  estudio_id          text,
  jogo                text,
  mesa_id             text,
  pontos_fortes       text,
  pontos_desenvolver  text,
  criterios           jsonb,
  video_url           text,
  video_nome          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_performance_hub_avaliacao_data
  ON public.academy_performance_hub_avaliacao (data_avaliacao DESC);

CREATE INDEX IF NOT EXISTS idx_academy_performance_hub_avaliacao_time_mes
  ON public.academy_performance_hub_avaliacao (time_slug, data_avaliacao DESC);

CREATE INDEX IF NOT EXISTS idx_academy_performance_hub_avaliacao_staff
  ON public.academy_performance_hub_avaliacao (avaliado_staff_id, data_avaliacao DESC);

CREATE OR REPLACE FUNCTION public.academy_performance_hub_avaliacao_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_performance_hub_avaliacao_updated ON public.academy_performance_hub_avaliacao;
CREATE TRIGGER trg_academy_performance_hub_avaliacao_updated
  BEFORE UPDATE ON public.academy_performance_hub_avaliacao
  FOR EACH ROW EXECUTE PROCEDURE public.academy_performance_hub_avaliacao_set_updated_at();

ALTER TABLE public.academy_performance_hub_avaliacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academy_performance_hub_avaliacao_select ON public.academy_performance_hub_avaliacao;
CREATE POLICY academy_performance_hub_avaliacao_select ON public.academy_performance_hub_avaliacao
  FOR SELECT TO authenticated USING (public._academy_performance_hub_perm('view'));

DROP POLICY IF EXISTS academy_performance_hub_avaliacao_insert ON public.academy_performance_hub_avaliacao;
CREATE POLICY academy_performance_hub_avaliacao_insert ON public.academy_performance_hub_avaliacao
  FOR INSERT TO authenticated WITH CHECK (public._academy_performance_hub_perm('edit'));

DROP POLICY IF EXISTS academy_performance_hub_avaliacao_update ON public.academy_performance_hub_avaliacao;
CREATE POLICY academy_performance_hub_avaliacao_update ON public.academy_performance_hub_avaliacao
  FOR UPDATE TO authenticated
  USING (public._academy_performance_hub_perm('edit'))
  WITH CHECK (public._academy_performance_hub_perm('edit'));

DROP POLICY IF EXISTS academy_performance_hub_avaliacao_delete ON public.academy_performance_hub_avaliacao;
CREATE POLICY academy_performance_hub_avaliacao_delete ON public.academy_performance_hub_avaliacao
  FOR DELETE TO authenticated USING (public._academy_performance_hub_perm('delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_performance_hub_avaliacao TO authenticated;

COMMIT;
