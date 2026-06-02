-- Mídias Sociais: backfill operadora em campanhas legadas + RPCs alinhadas ao cadastro de Campanhas.

UPDATE campanhas
SET operadora_slug = 'casa_apostas',
    updated_at = now()
WHERE operadora_slug IS NULL;

-- ─── get_campanha_funil_totais ───────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_campanha_funil_totais(date, date, text);

CREATE FUNCTION public.get_campanha_funil_totais(
  p_data_inicio date,
  p_data_fim date,
  p_operadora_slug text DEFAULT NULL
)
RETURNS TABLE (
  visitas bigint,
  registros bigint,
  ftds integer,
  ftd_total numeric,
  deposit_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(m.visit_count), 0)::bigint AS visitas,
    COALESCE(SUM(m.registration_count), 0)::bigint AS registros,
    COALESCE(SUM(m.ftd_count), 0)::integer AS ftds,
    COALESCE(SUM(m.ftd_total), 0)::numeric(14,2) AS ftd_total,
    COALESCE(SUM(m.deposit_total), 0)::numeric(14,2) AS deposit_total
  FROM utm_metricas_diarias m
  INNER JOIN utm_aliases ua ON ua.utm_source = m.utm_source
    AND COALESCE(ua.operadora_slug, 'casa_apostas') = COALESCE(m.operadora_slug, 'casa_apostas')
  INNER JOIN campanhas c ON c.id = ua.campanha_id AND c.ativo = true
  WHERE ua.status = 'mapeado'
    AND ua.campanha_id IS NOT NULL
    AND m.data >= p_data_inicio
    AND m.data <= p_data_fim
    AND (p_operadora_slug IS NULL OR c.operadora_slug = p_operadora_slug)
    AND (
      p_operadora_slug IS NULL
      OR COALESCE(m.operadora_slug, 'casa_apostas') = p_operadora_slug
    );
END;
$$;

COMMENT ON FUNCTION public.get_campanha_funil_totais(date, date, text) IS
  'Totais do funil (UTMs mapeadas a campanhas) no período, filtráveis por operadora do cadastro de campanhas.';

-- ─── get_campanhas_performance ───────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_campanhas_performance(date, date, text);

CREATE FUNCTION public.get_campanhas_performance(
  p_data_inicio date,
  p_data_fim date,
  p_operadora_slug text DEFAULT NULL
)
RETURNS TABLE (
  campanha_id uuid,
  campanha_nome text,
  operadora_slug text,
  visitas bigint,
  registros bigint,
  ftds integer,
  ftd_total numeric,
  deposit_count bigint,
  deposit_total numeric,
  withdrawal_count bigint,
  withdrawal_total numeric,
  utms_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS campanha_id,
    c.nome AS campanha_nome,
    c.operadora_slug,
    COALESCE(SUM(m.visit_count), 0)::bigint AS visitas,
    COALESCE(SUM(m.registration_count), 0)::bigint AS registros,
    COALESCE(SUM(m.ftd_count), 0)::integer AS ftds,
    COALESCE(SUM(m.ftd_total), 0)::numeric(14,2) AS ftd_total,
    COALESCE(SUM(m.deposit_count), 0)::bigint AS deposit_count,
    COALESCE(SUM(m.deposit_total), 0)::numeric(14,2) AS deposit_total,
    COALESCE(SUM(m.withdrawal_count), 0)::bigint AS withdrawal_count,
    COALESCE(SUM(m.withdrawal_total), 0)::numeric(14,2) AS withdrawal_total,
    COUNT(DISTINCT ua.utm_source)::bigint AS utms_count
  FROM campanhas c
  LEFT JOIN utm_aliases ua ON ua.campanha_id = c.id AND ua.status = 'mapeado'
  LEFT JOIN utm_metricas_diarias m ON m.utm_source = ua.utm_source
    AND m.data >= p_data_inicio
    AND m.data <= p_data_fim
    AND COALESCE(ua.operadora_slug, 'casa_apostas') = COALESCE(m.operadora_slug, 'casa_apostas')
  WHERE c.ativo = true
    AND (p_operadora_slug IS NULL OR c.operadora_slug = p_operadora_slug)
  GROUP BY c.id, c.nome, c.operadora_slug
  ORDER BY COALESCE(SUM(m.ftd_count), 0) DESC;
END;
$$;

COMMENT ON FUNCTION public.get_campanhas_performance(date, date, text) IS
  'Performance por campanha no período (Dashboard Mídias). Filtra por operadora cadastrada na campanha.';

-- ─── get_campanha_funil_serie_temporal ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_campanha_funil_serie_temporal(
  p_data_inicio date,
  p_data_fim date,
  p_agregacao text,
  p_operadora_slug text DEFAULT NULL
)
RETURNS TABLE (
  periodo text,
  visitas bigint,
  registros bigint,
  ftds integer,
  ftd_total numeric,
  deposit_count bigint,
  deposit_total numeric,
  withdrawal_count bigint,
  withdrawal_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ag text := lower(trim(p_agregacao));
BEGIN
  IF v_ag NOT IN ('day', 'month') THEN
    RAISE EXCEPTION 'p_agregacao deve ser ''day'' ou ''month'' (recebido: %)', p_agregacao;
  END IF;

  IF v_ag = 'month' THEN
    RETURN QUERY
    SELECT
      to_char(gs.mes::date, 'YYYY-MM-DD') AS periodo,
      COALESCE(s.visitas, 0)::bigint AS visitas,
      COALESCE(s.registros, 0)::bigint AS registros,
      COALESCE(s.ftds, 0)::integer AS ftds,
      COALESCE(s.ftd_total, 0)::numeric(14, 2) AS ftd_total,
      COALESCE(s.deposit_count, 0)::bigint AS deposit_count,
      COALESCE(s.deposit_total, 0)::numeric(14, 2) AS deposit_total,
      COALESCE(s.withdrawal_count, 0)::bigint AS withdrawal_count,
      COALESCE(s.withdrawal_total, 0)::numeric(14, 2) AS withdrawal_total
    FROM generate_series(
      date_trunc('month', p_data_inicio::timestamp),
      date_trunc('month', p_data_fim::timestamp),
      interval '1 month'
    ) AS gs(mes)
    LEFT JOIN (
      SELECT
        date_trunc('month', m.data::timestamp) AS mes,
        COALESCE(SUM(m.visit_count), 0)::bigint AS visitas,
        COALESCE(SUM(m.registration_count), 0)::bigint AS registros,
        COALESCE(SUM(m.ftd_count), 0)::integer AS ftds,
        COALESCE(SUM(m.ftd_total), 0)::numeric(14, 2) AS ftd_total,
        COALESCE(SUM(m.deposit_count), 0)::bigint AS deposit_count,
        COALESCE(SUM(m.deposit_total), 0)::numeric(14, 2) AS deposit_total,
        COALESCE(SUM(m.withdrawal_count), 0)::bigint AS withdrawal_count,
        COALESCE(SUM(m.withdrawal_total), 0)::numeric(14, 2) AS withdrawal_total
      FROM utm_metricas_diarias m
      INNER JOIN utm_aliases ua ON ua.utm_source = m.utm_source
        AND COALESCE(ua.operadora_slug, 'casa_apostas') = COALESCE(m.operadora_slug, 'casa_apostas')
      INNER JOIN campanhas c ON c.id = ua.campanha_id AND c.ativo = true
      WHERE ua.status = 'mapeado'
        AND ua.campanha_id IS NOT NULL
        AND m.data >= p_data_inicio
        AND m.data <= p_data_fim
        AND (p_operadora_slug IS NULL OR c.operadora_slug = p_operadora_slug)
        AND (
          p_operadora_slug IS NULL
          OR COALESCE(m.operadora_slug, 'casa_apostas') = p_operadora_slug
        )
      GROUP BY date_trunc('month', m.data::timestamp)
    ) s ON s.mes = gs.mes
    ORDER BY gs.mes;
  ELSE
    RETURN QUERY
    SELECT
      to_char(gs.dia::date, 'YYYY-MM-DD') AS periodo,
      COALESCE(s.visitas, 0)::bigint AS visitas,
      COALESCE(s.registros, 0)::bigint AS registros,
      COALESCE(s.ftds, 0)::integer AS ftds,
      COALESCE(s.ftd_total, 0)::numeric(14, 2) AS ftd_total,
      COALESCE(s.deposit_count, 0)::bigint AS deposit_count,
      COALESCE(s.deposit_total, 0)::numeric(14, 2) AS deposit_total,
      COALESCE(s.withdrawal_count, 0)::bigint AS withdrawal_count,
      COALESCE(s.withdrawal_total, 0)::numeric(14, 2) AS withdrawal_total
    FROM generate_series(
      p_data_inicio::timestamp,
      p_data_fim::timestamp,
      interval '1 day'
    ) AS gs(dia)
    LEFT JOIN (
      SELECT
        m.data::date AS dia,
        COALESCE(SUM(m.visit_count), 0)::bigint AS visitas,
        COALESCE(SUM(m.registration_count), 0)::bigint AS registros,
        COALESCE(SUM(m.ftd_count), 0)::integer AS ftds,
        COALESCE(SUM(m.ftd_total), 0)::numeric(14, 2) AS ftd_total,
        COALESCE(SUM(m.deposit_count), 0)::bigint AS deposit_count,
        COALESCE(SUM(m.deposit_total), 0)::numeric(14, 2) AS deposit_total,
        COALESCE(SUM(m.withdrawal_count), 0)::bigint AS withdrawal_count,
        COALESCE(SUM(m.withdrawal_total), 0)::numeric(14, 2) AS withdrawal_total
      FROM utm_metricas_diarias m
      INNER JOIN utm_aliases ua ON ua.utm_source = m.utm_source
        AND COALESCE(ua.operadora_slug, 'casa_apostas') = COALESCE(m.operadora_slug, 'casa_apostas')
      INNER JOIN campanhas c ON c.id = ua.campanha_id AND c.ativo = true
      WHERE ua.status = 'mapeado'
        AND ua.campanha_id IS NOT NULL
        AND m.data >= p_data_inicio
        AND m.data <= p_data_fim
        AND (p_operadora_slug IS NULL OR c.operadora_slug = p_operadora_slug)
        AND (
          p_operadora_slug IS NULL
          OR COALESCE(m.operadora_slug, 'casa_apostas') = p_operadora_slug
        )
      GROUP BY m.data
    ) s ON s.dia = gs.dia::date
    ORDER BY gs.dia;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_campanha_funil_serie_temporal(date, date, text, text) IS
  'Série do funil de campanhas por dia/mês; filtra por operadora cadastrada na campanha.';
