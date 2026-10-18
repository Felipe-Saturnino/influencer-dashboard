-- Cadastro de jogadores por origem (TAP UTM agora; outras origens depois)
-- + fato diário para a aba Streamers → Jogadores e enriquecimento Revenue Sentinel.
-- Sem PII (nome, e-mail, username). Chave TAP = ext_customer_id (ID Ext).

CREATE TABLE IF NOT EXISTS public.jogadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operadora_slug text NOT NULL,
  ext_customer_id text NOT NULL,
  registration_id text,
  origem_tipo text NOT NULL DEFAULT 'tap_utm',
  origem text NOT NULL,
  cda_conta text,
  influencer_id uuid REFERENCES public.influencer_perfil(id) ON DELETE SET NULL,
  registrado_em date,
  primeira_atividade date,
  ultima_atividade date,
  player_id_bko text,
  identity_key text,
  jogou_spin boolean,
  jogou_outros boolean,
  primeira_rodada_spin timestamptz,
  ultima_rodada_spin timestamptz,
  rodadas_spin bigint NOT NULL DEFAULT 0,
  apostas_spin bigint NOT NULL DEFAULT 0,
  ggr_spin numeric(14, 2),
  turnover_spin numeric(14, 2),
  rodadas_por_jogo jsonb NOT NULL DEFAULT '{}'::jsonb,
  rodadas_por_mesa jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jogadores_operadora_ext_unique UNIQUE (operadora_slug, ext_customer_id),
  CONSTRAINT jogadores_origem_tipo_chk CHECK (
    origem_tipo IN ('tap_utm', 'campanha', 'afiliado', 'direto', 'rs_attribution')
  ),
  CONSTRAINT jogadores_cda_conta_chk CHECK (
    cda_conta IS NULL OR cda_conta IN ('influencers', 'afiliados')
  ),
  CONSTRAINT jogadores_ext_customer_id_chk CHECK (char_length(trim(ext_customer_id)) > 0),
  CONSTRAINT jogadores_origem_chk CHECK (char_length(trim(origem)) > 0)
);

COMMENT ON TABLE public.jogadores IS
  'Dimensão de jogador. origem_tipo+origem = canal de aquisição (TAP: tap_utm + utm_source). Colunas Spin/BKO vazias até o job Revenue Sentinel.';
COMMENT ON COLUMN public.jogadores.ext_customer_id IS
  'ID Ext da TAP (ext_customer_id). Ponte para CRM CDA / identity_map / player_id BKO — não é o player_id das mesas.';
COMMENT ON COLUMN public.jogadores.origem IS
  'Valor da origem. Em tap_utm = utm_source. Futuro: slug de campanha, código de afiliado, etc.';
COMMENT ON COLUMN public.jogadores.origem_tipo IS
  'Família da origem. tap_utm agora; campanha/afiliado/direto/rs_attribution depois.';
COMMENT ON COLUMN public.jogadores.ggr_spin IS
  'GGR das mesas Spin (Revenue Sentinel). Não usar GGR TAP (pl) nesta coluna.';

CREATE INDEX IF NOT EXISTS idx_jogadores_origem
  ON public.jogadores (origem_tipo, origem);
CREATE INDEX IF NOT EXISTS idx_jogadores_influencer
  ON public.jogadores (influencer_id)
  WHERE influencer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jogadores_registrado_em
  ON public.jogadores (operadora_slug, registrado_em);
CREATE INDEX IF NOT EXISTS idx_jogadores_player_id_bko
  ON public.jogadores (player_id_bko)
  WHERE player_id_bko IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.jogadores_metricas_diarias (
  jogador_id uuid REFERENCES public.jogadores(id) ON DELETE CASCADE,
  data date NOT NULL,
  operadora_slug text NOT NULL,
  origem_tipo text NOT NULL DEFAULT 'tap_utm',
  origem text NOT NULL,
  ext_customer_id text NOT NULL,
  registration_id text,
  cda_conta text,
  influencer_id uuid REFERENCES public.influencer_perfil(id) ON DELETE SET NULL,
  visit_count integer NOT NULL DEFAULT 0,
  registration_count integer NOT NULL DEFAULT 0,
  ftd_count integer NOT NULL DEFAULT 0,
  ftd_total numeric(14, 2) NOT NULL DEFAULT 0,
  deposit_count integer NOT NULL DEFAULT 0,
  deposit_total numeric(14, 2) NOT NULL DEFAULT 0,
  withdrawal_count integer NOT NULL DEFAULT 0,
  withdrawal_total numeric(14, 2) NOT NULL DEFAULT 0,
  rodadas_spin bigint NOT NULL DEFAULT 0,
  apostas_spin bigint NOT NULL DEFAULT 0,
  ggr_spin numeric(14, 2),
  turnover_spin numeric(14, 2),
  jogou_spin boolean,
  jogou_outros boolean,
  rodadas_por_jogo jsonb NOT NULL DEFAULT '{}'::jsonb,
  rodadas_por_mesa jsonb NOT NULL DEFAULT '[]'::jsonb,
  fonte text NOT NULL DEFAULT 'tap',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jogadores_metricas_diarias_pk
    PRIMARY KEY (data, operadora_slug, origem_tipo, origem, ext_customer_id),
  CONSTRAINT jogadores_metricas_diarias_origem_tipo_chk CHECK (
    origem_tipo IN ('tap_utm', 'campanha', 'afiliado', 'direto', 'rs_attribution')
  )
);

COMMENT ON TABLE public.jogadores_metricas_diarias IS
  'Fato diário do jogador. TAP: visitas/registros/FTD/depósitos. Spin (rodadas, GGR, turnover, mesa/jogo) entra no job Revenue Sentinel.';
COMMENT ON COLUMN public.jogadores_metricas_diarias.fonte IS
  'tap = Reporting API CDA. rs = enriquecimento Revenue Sentinel (mesmo dia).';

CREATE INDEX IF NOT EXISTS idx_jogadores_metricas_diarias_jogador
  ON public.jogadores_metricas_diarias (jogador_id, data);
CREATE INDEX IF NOT EXISTS idx_jogadores_metricas_diarias_influencer_data
  ON public.jogadores_metricas_diarias (influencer_id, data)
  WHERE influencer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jogadores_metricas_diarias_ext
  ON public.jogadores_metricas_diarias (operadora_slug, ext_customer_id, data);

CREATE OR REPLACE FUNCTION public.jogadores_metricas_diarias_sync_cadastro()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_reg date;
BEGIN
  v_reg := CASE WHEN COALESCE(NEW.registration_count, 0) > 0 THEN NEW.data ELSE NULL END;

  INSERT INTO public.jogadores (
    operadora_slug,
    ext_customer_id,
    registration_id,
    origem_tipo,
    origem,
    cda_conta,
    influencer_id,
    registrado_em,
    primeira_atividade,
    ultima_atividade
  ) VALUES (
    NEW.operadora_slug,
    NEW.ext_customer_id,
    NULLIF(BTRIM(COALESCE(NEW.registration_id, '')), ''),
    NEW.origem_tipo,
    NEW.origem,
    NEW.cda_conta,
    NEW.influencer_id,
    v_reg,
    NEW.data,
    NEW.data
  )
  ON CONFLICT (operadora_slug, ext_customer_id) DO UPDATE SET
    registration_id = COALESCE(public.jogadores.registration_id, EXCLUDED.registration_id),
    origem = CASE
      WHEN public.jogadores.origem = 'sem_utm' AND EXCLUDED.origem <> 'sem_utm' THEN EXCLUDED.origem
      ELSE public.jogadores.origem
    END,
    origem_tipo = CASE
      WHEN public.jogadores.origem = 'sem_utm' AND EXCLUDED.origem <> 'sem_utm' THEN EXCLUDED.origem_tipo
      ELSE public.jogadores.origem_tipo
    END,
    influencer_id = COALESCE(public.jogadores.influencer_id, EXCLUDED.influencer_id),
    cda_conta = COALESCE(public.jogadores.cda_conta, EXCLUDED.cda_conta),
    registrado_em = CASE
      WHEN v_reg IS NOT NULL THEN LEAST(COALESCE(public.jogadores.registrado_em, v_reg), v_reg)
      ELSE public.jogadores.registrado_em
    END,
    primeira_atividade = CASE
      WHEN public.jogadores.primeira_atividade IS NULL THEN EXCLUDED.primeira_atividade
      ELSE LEAST(public.jogadores.primeira_atividade, EXCLUDED.primeira_atividade)
    END,
    ultima_atividade = CASE
      WHEN public.jogadores.ultima_atividade IS NULL THEN EXCLUDED.ultima_atividade
      ELSE GREATEST(public.jogadores.ultima_atividade, EXCLUDED.ultima_atividade)
    END,
    atualizado_em = now()
  RETURNING id INTO v_id;

  NEW.jogador_id := v_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jogadores_metricas_diarias_sync_cadastro ON public.jogadores_metricas_diarias;
DROP TRIGGER IF EXISTS trg_jogadores_metricas_diarias_sync_cadastro_ins ON public.jogadores_metricas_diarias;
CREATE TRIGGER trg_jogadores_metricas_diarias_sync_cadastro
  BEFORE INSERT OR UPDATE ON public.jogadores_metricas_diarias
  FOR EACH ROW
  EXECUTE FUNCTION public.jogadores_metricas_diarias_sync_cadastro();

ALTER TABLE public.jogadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogadores_metricas_diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read jogadores" ON public.jogadores;
CREATE POLICY "Allow authenticated read jogadores"
  ON public.jogadores
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read jogadores_metricas_diarias" ON public.jogadores_metricas_diarias;
CREATE POLICY "Allow authenticated read jogadores_metricas_diarias"
  ON public.jogadores_metricas_diarias
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.jogadores TO authenticated;
GRANT SELECT ON public.jogadores_metricas_diarias TO authenticated;
GRANT ALL ON public.jogadores TO service_role;
GRANT ALL ON public.jogadores_metricas_diarias TO service_role;

CREATE OR REPLACE FUNCTION public.aplicar_mapeamento_utm(
  p_utm_source text,
  p_influencer_id uuid
)
RETURNS TABLE (linhas_copiadas bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count bigint;
  v_operadora text;
BEGIN
  SELECT COALESCE(
    (SELECT operadora_slug FROM utm_metricas_diarias WHERE utm_source = p_utm_source LIMIT 1),
    (SELECT COALESCE(operadora_slug, 'casa_apostas') FROM utm_aliases WHERE utm_source = p_utm_source LIMIT 1),
    'casa_apostas'
  ) INTO v_operadora;

  UPDATE utm_metricas_diarias
  SET influencer_id = p_influencer_id
  WHERE utm_source = p_utm_source;

  UPDATE public.jogadores_metricas_diarias
  SET influencer_id = p_influencer_id
  WHERE origem_tipo = 'tap_utm'
    AND origem = p_utm_source
    AND COALESCE(operadora_slug, 'casa_apostas') = v_operadora;

  UPDATE public.jogadores
  SET influencer_id = p_influencer_id,
      atualizado_em = now()
  WHERE origem_tipo = 'tap_utm'
    AND origem = p_utm_source
    AND COALESCE(operadora_slug, 'casa_apostas') = v_operadora;

  WITH utms_do_influencer AS (
    SELECT ua.utm_source
    FROM utm_aliases ua
    WHERE ua.influencer_id = p_influencer_id
      AND ua.status = 'mapeado'
      AND COALESCE(ua.operadora_slug, 'casa_apostas') = v_operadora
    UNION
    SELECT ip.utm_source
    FROM influencer_perfil ip
    WHERE ip.id = p_influencer_id AND ip.utm_source IS NOT NULL
  ),
  metricas_agregadas AS (
    SELECT
      m.data,
      SUM(m.visit_count)::integer AS visit_count,
      SUM(m.registration_count)::integer AS registration_count,
      SUM(m.ftd_count)::integer AS ftd_count,
      SUM(m.ftd_total)::numeric(14,2) AS ftd_total,
      SUM(m.deposit_count)::integer AS deposit_count,
      SUM(m.deposit_total)::numeric(14,2) AS deposit_total,
      SUM(m.withdrawal_count)::integer AS withdrawal_count,
      SUM(m.withdrawal_total)::numeric(14,2) AS withdrawal_total,
      MAX(m.fonte) AS fonte
    FROM utm_metricas_diarias m
    INNER JOIN utms_do_influencer u ON u.utm_source = m.utm_source
    WHERE COALESCE(m.operadora_slug, 'casa_apostas') = v_operadora
    GROUP BY m.data
  )
  INSERT INTO influencer_metricas (
    influencer_id, data, operadora_slug,
    visit_count, registration_count, ftd_count, ftd_total,
    deposit_count, deposit_total, withdrawal_count, withdrawal_total, fonte
  )
  SELECT
    p_influencer_id, data, v_operadora,
    visit_count, registration_count, ftd_count, ftd_total,
    deposit_count, deposit_total, withdrawal_count, withdrawal_total, fonte
  FROM metricas_agregadas
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

COMMENT ON FUNCTION public.aplicar_mapeamento_utm IS
  'Aplica mapeamento UTM→influencer: utm_metricas_diarias, jogadores/jogadores_metricas_diarias (tap_utm) e re-agrega influencer_metricas.';
