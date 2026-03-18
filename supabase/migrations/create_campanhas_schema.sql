-- =============================================================================
-- MIGRAÇÃO: Campanhas e mapeamento UTM → Campanha
-- Execute no Supabase SQL Editor.
-- Permite mapear UTMs de mídias sociais (utm_aliases) a campanhas, para
-- alimentar o Dashboard de Mídias Sociais (Funil e tabela Campanhas — Performance).
-- =============================================================================

-- 1. Tabela campanhas (cadastro manual)
CREATE TABLE IF NOT EXISTS campanhas (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        text NOT NULL,
  operadora_slug text REFERENCES operadoras(slug),
  ativo       boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_operadora ON campanhas (operadora_slug);
CREATE INDEX IF NOT EXISTS idx_campanhas_ativo ON campanhas (ativo) WHERE ativo = true;

COMMENT ON TABLE campanhas IS 'Campanhas de mídias sociais. UTMs mapeados na Gestão de Links alimentam o Dashboard de Mídias.';

-- 2. Adicionar campanha_id em utm_aliases
ALTER TABLE utm_aliases
  ADD COLUMN IF NOT EXISTS campanha_id uuid REFERENCES campanhas(id);

CREATE INDEX IF NOT EXISTS idx_utm_aliases_campanha ON utm_aliases (campanha_id) WHERE campanha_id IS NOT NULL;

COMMENT ON COLUMN utm_aliases.campanha_id IS 'UTM mapeada para campanha (mídias sociais). Quando mapeado para campanha, influencer_id fica null.';

-- 3. RPC: retorna totais do funil para o Dashboard de Mídias (período + operadora opcional)
-- Cliques vêm do kpi_daily no front; aqui retornamos acessos, registros, FTDs das UTMs mapeadas a campanhas
CREATE OR REPLACE FUNCTION get_campanha_funil_totais(
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
    AND COALESCE(ua.operadora_slug, 'casa_apostas') = m.operadora_slug
  WHERE ua.status = 'mapeado'
    AND ua.campanha_id IS NOT NULL
    AND m.data >= p_data_inicio
    AND m.data <= p_data_fim
    AND (p_operadora_slug IS NULL OR m.operadora_slug = p_operadora_slug);
END;
$$;

COMMENT ON FUNCTION get_campanha_funil_totais IS 'Totais do funil (acessos, registros, FTDs) das UTMs mapeadas a campanhas, no período. Cliques vêm do kpi_daily no front.';

-- 4. RPC: métricas por campanha no período (para tabela Campanhas — Performance)
CREATE OR REPLACE FUNCTION get_campanhas_performance(
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
  deposit_total numeric,
  withdrawal_total numeric,
  utms_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    COALESCE(SUM(m.deposit_total), 0)::numeric(14,2) AS deposit_total,
    COALESCE(SUM(m.withdrawal_total), 0)::numeric(14,2) AS withdrawal_total,
    COUNT(DISTINCT ua.utm_source)::bigint AS utms_count
  FROM campanhas c
  LEFT JOIN utm_aliases ua ON ua.campanha_id = c.id AND ua.status = 'mapeado'
  LEFT JOIN utm_metricas_diarias m ON m.utm_source = ua.utm_source
    AND m.data >= p_data_inicio
    AND m.data <= p_data_fim
    AND COALESCE(ua.operadora_slug, 'casa_apostas') = m.operadora_slug
  WHERE c.ativo = true
    AND (p_operadora_slug IS NULL OR c.operadora_slug = p_operadora_slug OR (c.operadora_slug IS NULL AND p_operadora_slug IS NULL))
  GROUP BY c.id, c.nome, c.operadora_slug
  ORDER BY COALESCE(SUM(m.ftd_count), 0) DESC;
END;
$$;

COMMENT ON FUNCTION get_campanhas_performance IS 'Performance por campanha no período. Usado na tabela Campanhas do Dashboard de Mídias.';

-- 5. RLS (leitura para autenticados)
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read campanhas" ON campanhas;
CREATE POLICY "Allow authenticated read campanhas" ON campanhas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert campanhas" ON campanhas;
CREATE POLICY "Allow authenticated insert campanhas" ON campanhas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update campanhas" ON campanhas;
CREATE POLICY "Allow authenticated update campanhas" ON campanhas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete campanhas" ON campanhas;
CREATE POLICY "Allow authenticated delete campanhas" ON campanhas
  FOR DELETE TO authenticated USING (true);
