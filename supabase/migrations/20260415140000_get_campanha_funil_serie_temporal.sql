-- Série temporal do funil (UTMs mapeadas a campanhas) para o Dashboard Mídias Sociais:
-- agregação por dia (visão mensal) ou por mês (modo histórico).
-- SECURITY DEFINER: cliente não lê utm_metricas_diarias diretamente (RLS).

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
      to_char(date_trunc('month', m.data)::date, 'YYYY-MM-DD') AS periodo,
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
      AND COALESCE(ua.operadora_slug, 'casa_apostas') = m.operadora_slug
    WHERE ua.status = 'mapeado'
      AND ua.campanha_id IS NOT NULL
      AND m.data >= p_data_inicio
      AND m.data <= p_data_fim
      AND (p_operadora_slug IS NULL OR m.operadora_slug = p_operadora_slug)
    GROUP BY date_trunc('month', m.data)
    ORDER BY date_trunc('month', m.data);
  ELSE
    RETURN QUERY
    SELECT
      m.data::text AS periodo,
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
      AND COALESCE(ua.operadora_slug, 'casa_apostas') = m.operadora_slug
    WHERE ua.status = 'mapeado'
      AND ua.campanha_id IS NOT NULL
      AND m.data >= p_data_inicio
      AND m.data <= p_data_fim
      AND (p_operadora_slug IS NULL OR m.operadora_slug = p_operadora_slug)
    GROUP BY m.data
    ORDER BY m.data;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_campanha_funil_serie_temporal(date, date, text, text) IS
  'Série agregada do funil de campanhas (visitas, registros, FTDs, dep/saq) por dia ou por mês. Usado no Dashboard Mídias Sociais (detalhamento diário/mensal).';
