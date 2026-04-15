-- Corrige get_campanha_funil_serie_temporal:
-- 1) JOIN alinhado a COALESCE em ambos os lados (evita perder linhas quando m.operadora_slug é NULL).
-- 2) Série completa do período (generate_series + LEFT JOIN) para o detalhamento diário/mensal
--    não ficar vazio só porque não havia linha em utm_metricas_diarias naquele dia após o INNER JOIN.

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
      WHERE ua.status = 'mapeado'
        AND ua.campanha_id IS NOT NULL
        AND m.data >= p_data_inicio
        AND m.data <= p_data_fim
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
      WHERE ua.status = 'mapeado'
        AND ua.campanha_id IS NOT NULL
        AND m.data >= p_data_inicio
        AND m.data <= p_data_fim
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
  'Série agregada do funil (UTMs mapeadas a campanhas) por dia ou mês; uma linha por dia/mês no intervalo, com zeros quando não há métricas.';
