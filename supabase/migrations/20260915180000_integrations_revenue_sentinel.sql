-- Revenue Sentinel — Data Export API (jogadores Spin).
-- Edge sync-revenue-sentinel; secrets RS_API_URL + RS_API_KEY (X-API-Key).
-- RPC só service_role (não expor no cliente).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'revenue_sentinel',
  'Revenue Sentinel — Jogadores Spin',
  'Enriquece jogadores TAP com GGR/rodadas Spin via Data Export API (POST /v1/jogadores/spin). Secrets RS_API_URL e RS_API_KEY.',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;

CREATE OR REPLACE FUNCTION public.enriquecer_jogadores_spin_diario(
  p_operadora_slug text,
  p_linhas jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint := 0;
BEGIN
  IF p_operadora_slug IS NULL OR btrim(p_operadora_slug) = '' THEN
    RETURN 0;
  END IF;
  IF p_linhas IS NULL OR jsonb_typeof(p_linhas) <> 'array' THEN
    RETURN 0;
  END IF;

  WITH src AS (
    SELECT
      NULLIF(btrim(x.ext_customer_id), '') AS ext_customer_id,
      NULLIF(btrim(x.data::text), '')::date AS data,
      NULLIF(btrim(x.player_id_bko), '') AS player_id_bko,
      NULLIF(btrim(COALESCE(x.identity_key, '')), '') AS identity_key,
      COALESCE(x.rodadas_spin, 0)::bigint AS rodadas_spin,
      COALESCE(x.apostas_spin, 0)::bigint AS apostas_spin,
      x.ggr_spin::numeric AS ggr_spin,
      x.turnover_spin::numeric AS turnover_spin,
      COALESCE(x.jogou_spin, false) AS jogou_spin,
      COALESCE(x.rodadas_por_jogo, '{}'::jsonb) AS rodadas_por_jogo,
      COALESCE(x.rodadas_por_mesa, '[]'::jsonb) AS rodadas_por_mesa
    FROM jsonb_to_recordset(p_linhas) AS x(
      ext_customer_id text,
      data text,
      player_id_bko text,
      identity_key text,
      rodadas_spin bigint,
      apostas_spin bigint,
      ggr_spin numeric,
      turnover_spin numeric,
      jogou_spin boolean,
      rodadas_por_jogo jsonb,
      rodadas_por_mesa jsonb
    )
    WHERE NULLIF(btrim(x.ext_customer_id), '') IS NOT NULL
      AND x.data IS NOT NULL
  ),
  ins AS (
    INSERT INTO public.jogadores_metricas_diarias (
      data, operadora_slug, origem_tipo, origem, ext_customer_id,
      cda_conta, influencer_id, registration_id,
      rodadas_spin, apostas_spin, ggr_spin, turnover_spin, jogou_spin,
      rodadas_por_jogo, rodadas_por_mesa, fonte
    )
    SELECT
      s.data,
      p_operadora_slug,
      j.origem_tipo,
      j.origem,
      s.ext_customer_id,
      j.cda_conta,
      j.influencer_id,
      j.registration_id,
      s.rodadas_spin,
      s.apostas_spin,
      s.ggr_spin,
      s.turnover_spin,
      s.jogou_spin,
      s.rodadas_por_jogo,
      s.rodadas_por_mesa,
      'rs'
    FROM src s
    INNER JOIN public.jogadores j
      ON j.operadora_slug = p_operadora_slug
     AND j.ext_customer_id = s.ext_customer_id
    ON CONFLICT (data, operadora_slug, origem_tipo, origem, ext_customer_id)
    DO UPDATE SET
      rodadas_spin = EXCLUDED.rodadas_spin,
      apostas_spin = EXCLUDED.apostas_spin,
      ggr_spin = EXCLUDED.ggr_spin,
      turnover_spin = EXCLUDED.turnover_spin,
      jogou_spin = EXCLUDED.jogou_spin,
      rodadas_por_jogo = EXCLUDED.rodadas_por_jogo,
      rodadas_por_mesa = EXCLUDED.rodadas_por_mesa
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM ins;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enriquecer_jogadores_spin_diario(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enriquecer_jogadores_spin_diario(text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enriquecer_jogadores_spin_diario(text, jsonb) TO service_role;

COMMENT ON FUNCTION public.enriquecer_jogadores_spin_diario(text, jsonb) IS
  'UPSERT só colunas Spin em jogadores_metricas_diarias. Não altera visitas/FTD/depósito TAP. Só service_role.';

CREATE OR REPLACE FUNCTION public.enriquecer_jogadores_spin_cadastro(
  p_operadora_slug text,
  p_linhas jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint := 0;
BEGIN
  IF p_operadora_slug IS NULL OR btrim(p_operadora_slug) = '' THEN
    RETURN 0;
  END IF;
  IF p_linhas IS NULL OR jsonb_typeof(p_linhas) <> 'array' THEN
    RETURN 0;
  END IF;

  WITH src AS (
    SELECT
      NULLIF(btrim(x.ext_customer_id), '') AS ext_customer_id,
      NULLIF(btrim(COALESCE(x.player_id_bko, '')), '') AS player_id_bko,
      NULLIF(btrim(COALESCE(x.identity_key, '')), '') AS identity_key,
      COALESCE(x.rodadas_spin, 0)::bigint AS rodadas_spin,
      COALESCE(x.apostas_spin, 0)::bigint AS apostas_spin,
      x.ggr_spin::numeric AS ggr_spin,
      x.turnover_spin::numeric AS turnover_spin,
      COALESCE(x.jogou_spin, false) AS jogou_spin,
      COALESCE(x.jogou_outros, false) AS jogou_outros,
      COALESCE(x.rodadas_por_jogo, '{}'::jsonb) AS rodadas_por_jogo,
      COALESCE(x.rodadas_por_mesa, '[]'::jsonb) AS rodadas_por_mesa,
      NULLIF(btrim(COALESCE(x.primeira_rodada_spin, '')), '')::timestamptz AS primeira_rodada_spin,
      NULLIF(btrim(COALESCE(x.ultima_rodada_spin, '')), '')::timestamptz AS ultima_rodada_spin
    FROM jsonb_to_recordset(p_linhas) AS x(
      ext_customer_id text,
      player_id_bko text,
      identity_key text,
      rodadas_spin bigint,
      apostas_spin bigint,
      ggr_spin numeric,
      turnover_spin numeric,
      jogou_spin boolean,
      jogou_outros boolean,
      rodadas_por_jogo jsonb,
      rodadas_por_mesa jsonb,
      primeira_rodada_spin text,
      ultima_rodada_spin text
    )
    WHERE NULLIF(btrim(x.ext_customer_id), '') IS NOT NULL
  ),
  upd AS (
    UPDATE public.jogadores j
    SET
      player_id_bko = COALESCE(s.player_id_bko, j.player_id_bko),
      identity_key = COALESCE(s.identity_key, j.identity_key),
      jogou_spin = s.jogou_spin,
      jogou_outros = s.jogou_outros,
      rodadas_spin = s.rodadas_spin,
      apostas_spin = s.apostas_spin,
      ggr_spin = s.ggr_spin,
      turnover_spin = s.turnover_spin,
      rodadas_por_jogo = s.rodadas_por_jogo,
      rodadas_por_mesa = s.rodadas_por_mesa,
      primeira_rodada_spin = s.primeira_rodada_spin,
      ultima_rodada_spin = s.ultima_rodada_spin,
      atualizado_em = now()
    FROM src s
    WHERE j.operadora_slug = p_operadora_slug
      AND j.ext_customer_id = s.ext_customer_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM upd;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enriquecer_jogadores_spin_cadastro(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enriquecer_jogadores_spin_cadastro(text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enriquecer_jogadores_spin_cadastro(text, jsonb) TO service_role;

COMMENT ON FUNCTION public.enriquecer_jogadores_spin_cadastro(text, jsonb) IS
  'Atualiza flags e totais Spin em jogadores. jogou_outros = depósito TAP sem rodada RS (calculado na Edge). Só service_role.';
