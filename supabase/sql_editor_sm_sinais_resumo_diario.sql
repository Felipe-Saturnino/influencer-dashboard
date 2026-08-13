-- =============================================================================
-- COLE ESTE FICHEIRO INTEIRO no SQL Editor do Supabase (produção) — uma vez.
-- Cria a tabela de totais, o recálculo automático e preenche julho/agosto já
-- gravados. Depois, o pedido diário de ingestão Grafana no chat já atualiza
-- os totais sozinho. Não precisa de um segundo comando.
-- Idempotente: pode colar de novo se der erro a meio.
-- =============================================================================

-- Incidentes → aba Sinais: totais diários (quantidade + somas de TMA).
-- Recalcula sozinho quando a ingestão Grafana grava em sm_sinais.

BEGIN;

CREATE TABLE IF NOT EXISTS public.sm_sinais_resumo_diario (
  dia_brt                   date        NOT NULL,
  estudio_slug              text        NOT NULL DEFAULT '',
  resolver_fid_key          text        NOT NULL DEFAULT '',
  creator_fid_key           text        NOT NULL DEFAULT '',
  resolver_id               text        NOT NULL DEFAULT '',
  creator_id                text        NOT NULL DEFAULT '',
  resolver_funcionario_id   uuid,
  creator_funcionario_id    uuid,
  resolver_screen_name      text,
  creator_screen_name       text,
  sinais_qtd                integer     NOT NULL CHECK (sinais_qtd >= 0),
  tma_total_sum_ms          bigint      NOT NULL DEFAULT 0 CHECK (tma_total_sum_ms >= 0),
  tma_total_n               integer     NOT NULL DEFAULT 0 CHECK (tma_total_n >= 0),
  tma_atend_sum_ms          bigint      NOT NULL DEFAULT 0 CHECK (tma_atend_sum_ms >= 0),
  tma_atend_n               integer     NOT NULL DEFAULT 0 CHECK (tma_atend_n >= 0),
  tma_res_sum_ms            bigint      NOT NULL DEFAULT 0 CHECK (tma_res_sum_ms >= 0),
  tma_res_n                 integer     NOT NULL DEFAULT 0 CHECK (tma_res_n >= 0),
  atualizado_em             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sm_sinais_resumo_diario_pk PRIMARY KEY (
    dia_brt,
    estudio_slug,
    resolver_fid_key,
    creator_fid_key,
    resolver_id,
    creator_id
  )
);

COMMENT ON TABLE public.sm_sinais_resumo_diario IS
  'Totais de sinais por dia/estúdio/SM/relator. Preenchido na ingestão Grafana (trigger em sm_sinais). A aba Sinais lê só esta tabela.';

CREATE INDEX IF NOT EXISTS idx_sm_sinais_resumo_dia ON public.sm_sinais_resumo_diario (dia_brt);
CREATE INDEX IF NOT EXISTS idx_sm_sinais_resumo_estudio ON public.sm_sinais_resumo_diario (estudio_slug);
CREATE INDEX IF NOT EXISTS idx_sm_sinais_resumo_resolver_fid ON public.sm_sinais_resumo_diario (resolver_funcionario_id);
CREATE INDEX IF NOT EXISTS idx_sm_sinais_resumo_creator_fid ON public.sm_sinais_resumo_diario (creator_funcionario_id);

CREATE OR REPLACE FUNCTION public.sm_sinais_resumo_refresh_dias(p_dias date[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_dias IS NULL OR cardinality(p_dias) = 0 THEN
    RETURN;
  END IF;

  DELETE FROM public.sm_sinais_resumo_diario
  WHERE dia_brt = ANY (p_dias);

  INSERT INTO public.sm_sinais_resumo_diario (
    dia_brt,
    estudio_slug,
    resolver_fid_key,
    creator_fid_key,
    resolver_id,
    creator_id,
    resolver_funcionario_id,
    creator_funcionario_id,
    resolver_screen_name,
    creator_screen_name,
    sinais_qtd,
    tma_total_sum_ms,
    tma_total_n,
    tma_atend_sum_ms,
    tma_atend_n,
    tma_res_sum_ms,
    tma_res_n,
    atualizado_em
  )
  SELECT
    s.dia_brt,
    COALESCE(s.estudio_slug, ''),
    COALESCE(s.resolver_funcionario_id::text, ''),
    COALESCE(s.creator_funcionario_id::text, ''),
    COALESCE(NULLIF(btrim(s.resolver_id), ''), ''),
    COALESCE(NULLIF(btrim(s.creator_id), ''), ''),
    s.resolver_funcionario_id,
    s.creator_funcionario_id,
    NULLIF(MAX(s.resolver_screen_name), ''),
    NULLIF(MAX(s.creator_screen_name), ''),
    COUNT(*)::integer,
    COALESCE(SUM(
      CASE
        WHEN s.timer_stopped_at >= s.issued_at
        THEN ROUND(EXTRACT(EPOCH FROM (s.timer_stopped_at - s.issued_at)) * 1000)::bigint
        ELSE 0
      END
    ), 0),
    COUNT(*) FILTER (WHERE s.timer_stopped_at >= s.issued_at)::integer,
    COALESCE(SUM(
      CASE
        WHEN s.taken_at IS NOT NULL AND s.taken_at >= s.issued_at
        THEN ROUND(EXTRACT(EPOCH FROM (s.taken_at - s.issued_at)) * 1000)::bigint
        ELSE 0
      END
    ), 0),
    COUNT(*) FILTER (WHERE s.taken_at IS NOT NULL AND s.taken_at >= s.issued_at)::integer,
    COALESCE(SUM(
      CASE
        WHEN s.taken_at IS NOT NULL AND s.timer_stopped_at >= s.taken_at
        THEN ROUND(EXTRACT(EPOCH FROM (s.timer_stopped_at - s.taken_at)) * 1000)::bigint
        ELSE 0
      END
    ), 0),
    COUNT(*) FILTER (WHERE s.taken_at IS NOT NULL AND s.timer_stopped_at >= s.taken_at)::integer,
    now()
  FROM public.sm_sinais s
  WHERE s.dia_brt = ANY (p_dias)
  GROUP BY
    s.dia_brt,
    COALESCE(s.estudio_slug, ''),
    COALESCE(s.resolver_funcionario_id::text, ''),
    COALESCE(s.creator_funcionario_id::text, ''),
    COALESCE(NULLIF(btrim(s.resolver_id), ''), ''),
    COALESCE(NULLIF(btrim(s.creator_id), ''), ''),
    s.resolver_funcionario_id,
    s.creator_funcionario_id;
END;
$$;

COMMENT ON FUNCTION public.sm_sinais_resumo_refresh_dias(date[]) IS
  'Recalcula sm_sinais_resumo_diario para os dias informados a partir de sm_sinais.';

CREATE OR REPLACE FUNCTION public.sm_sinais_resumo_refresh_periodo(p_ini date DEFAULT NULL, p_fim date DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dias date[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT s.dia_brt)
  INTO dias
  FROM public.sm_sinais s
  WHERE (p_ini IS NULL OR s.dia_brt >= p_ini)
    AND (p_fim IS NULL OR s.dia_brt <= p_fim);

  PERFORM public.sm_sinais_resumo_refresh_dias(dias);
END;
$$;

COMMENT ON FUNCTION public.sm_sinais_resumo_refresh_periodo(date, date) IS
  'Recalcula o resumo no intervalo (NULL = todos os dias já gravados em sm_sinais).';

CREATE OR REPLACE FUNCTION public.sm_sinais_resumo_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dias date[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT x.dia_brt) INTO dias FROM new_rows x;
  PERFORM public.sm_sinais_resumo_refresh_dias(dias);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sm_sinais_resumo_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dias date[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT d) INTO dias
  FROM (
    SELECT dia_brt FROM new_rows
    UNION
    SELECT dia_brt FROM old_rows
  ) s(d);
  PERFORM public.sm_sinais_resumo_refresh_dias(dias);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sm_sinais_resumo_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dias date[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT x.dia_brt) INTO dias FROM old_rows x;
  PERFORM public.sm_sinais_resumo_refresh_dias(dias);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sm_sinais_resumo_ai ON public.sm_sinais;
CREATE TRIGGER trg_sm_sinais_resumo_ai
  AFTER INSERT ON public.sm_sinais
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE PROCEDURE public.sm_sinais_resumo_after_insert();

DROP TRIGGER IF EXISTS trg_sm_sinais_resumo_au ON public.sm_sinais;
CREATE TRIGGER trg_sm_sinais_resumo_au
  AFTER UPDATE ON public.sm_sinais
  REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
  FOR EACH STATEMENT
  EXECUTE PROCEDURE public.sm_sinais_resumo_after_update();

DROP TRIGGER IF EXISTS trg_sm_sinais_resumo_ad ON public.sm_sinais;
CREATE TRIGGER trg_sm_sinais_resumo_ad
  AFTER DELETE ON public.sm_sinais
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT
  EXECUTE PROCEDURE public.sm_sinais_resumo_after_delete();

ALTER TABLE public.sm_sinais_resumo_diario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sm_sinais_resumo_diario_select ON public.sm_sinais_resumo_diario;
CREATE POLICY sm_sinais_resumo_diario_select
  ON public.sm_sinais_resumo_diario FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor')
    )
    OR (
      estudio_slug <> ''
      AND public._estudios_spin_scope_estudio(estudio_slug)
    )
    OR public._gestor_page_perm('dash_overview_prestador', 'view')
    OR public._prestador_page_perm('dash_overview_prestador', 'view')
    OR public._staff_spin_page_perm('dash_overview_prestador', 'view')
    OR public._gestor_page_perm('incidentes', 'view')
    OR public._prestador_page_perm('incidentes', 'view')
    OR public._staff_spin_page_perm('incidentes', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'gestor'
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key IN ('dash_overview_prestador', 'incidentes')
        AND rp.can_view IN ('sim', 'proprios')
    )
  );

COMMENT ON POLICY sm_sinais_resumo_diario_select ON public.sm_sinais_resumo_diario IS
  'Leitura alinhada a sm_sinais + Ver em Incidentes (KPIs da aba Sinais).';

GRANT SELECT ON public.sm_sinais_resumo_diario TO authenticated;
REVOKE ALL ON FUNCTION public.sm_sinais_resumo_refresh_dias(date[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sm_sinais_resumo_refresh_periodo(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sm_sinais_resumo_refresh_dias(date[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.sm_sinais_resumo_refresh_periodo(date, date) TO service_role;

-- Primeira vez: preenche o passado já gravado em sm_sinais.
SELECT public.sm_sinais_resumo_refresh_periodo(NULL, NULL);

COMMIT;
