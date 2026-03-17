-- =============================================================================
-- MIGRAÇÃO: Tabela utm_metricas_diarias
-- Armazena métricas por UTM por dia (incl. órfãs). Permite mapear e atribuir
-- a um influencer sem rodar novo sync — só UPDATE influencer_id + cópia.
-- Execute no Supabase SQL Editor ANTES de limpar influencer_metricas/utm_aliases.
-- =============================================================================

-- 1. Criar tabela utm_metricas_diarias
CREATE TABLE IF NOT EXISTS utm_metricas_diarias (
  utm_source text NOT NULL,
  data date NOT NULL,
  operadora_slug text NOT NULL DEFAULT 'casa_apostas',
  visit_count integer DEFAULT 0,
  registration_count integer DEFAULT 0,
  ftd_count integer DEFAULT 0,
  ftd_total numeric(14,2) DEFAULT 0,
  deposit_count integer DEFAULT 0,
  deposit_total numeric(14,2) DEFAULT 0,
  withdrawal_count integer DEFAULT 0,
  withdrawal_total numeric(14,2) DEFAULT 0,
  influencer_id uuid REFERENCES influencer_perfil(id),
  fonte text DEFAULT 'api',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (utm_source, data, operadora_slug)
);

CREATE INDEX IF NOT EXISTS idx_utm_metricas_diarias_influencer
  ON utm_metricas_diarias (influencer_id) WHERE influencer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_utm_metricas_diarias_data
  ON utm_metricas_diarias (data);

COMMENT ON TABLE utm_metricas_diarias IS 'Métricas por UTM por dia. influencer_id NULL = órfã. Ao mapear, atualiza influencer_id e copia para influencer_metricas.';

-- 2. RPC: Aplicar mapeamento UTM (chamada ao mapear na Gestão de Links)
-- Atualiza utm_metricas_diarias e copia para influencer_metricas. SEM chamada à API.
CREATE OR REPLACE FUNCTION aplicar_mapeamento_utm(
  p_utm_source text,
  p_influencer_id uuid
)
RETURNS TABLE (linhas_copiadas bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- Atualizar influencer_id nas linhas diárias desta UTM
  UPDATE utm_metricas_diarias
  SET influencer_id = p_influencer_id
  WHERE utm_source = p_utm_source;

  -- Copiar para influencer_metricas (upsert)
  INSERT INTO influencer_metricas (
    influencer_id, data, operadora_slug,
    visit_count, registration_count, ftd_count, ftd_total,
    deposit_count, deposit_total, withdrawal_count, withdrawal_total, fonte
  )
  SELECT
    p_influencer_id, data, operadora_slug,
    visit_count, registration_count, ftd_count, ftd_total,
    deposit_count, deposit_total, withdrawal_count, withdrawal_total, fonte
  FROM utm_metricas_diarias
  WHERE utm_source = p_utm_source
  ON CONFLICT (influencer_id, data, operadora_slug)
  DO UPDATE SET
    visit_count = EXCLUDED.visit_count,
    registration_count = EXCLUDED.registration_count,
    ftd_count = EXCLUDED.ftd_count,
    ftd_total = EXCLUDED.ftd_total,
    deposit_count = EXCLUDED.deposit_count,
    deposit_total = EXCLUDED.deposit_total,
    withdrawal_count = EXCLUDED.withdrawal_count,
    withdrawal_total = EXCLUDED.withdrawal_total;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION aplicar_mapeamento_utm IS 'Aplica mapeamento UTM→influencer: atualiza utm_metricas_diarias e copia para influencer_metricas. Chamar após UPDATE em utm_aliases.';
