-- Gera link de campanha para operadoras suportadas (CDA + Blaze).
-- Mantém gerar_campanha_link_casa_apostas como wrapper.

CREATE OR REPLACE FUNCTION public.gerar_campanha_link(
  p_utm_source text,
  p_campanha_id uuid,
  p_operadora_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_role      text;
  v_criar     text;
  v_editar    text;
  v_utm       text;
  v_slug      text;
  v_camp_op   text;
  v_camp_ativo boolean;
  v_row       utm_aliases%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sessao');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'perfil');
  END IF;

  IF v_role <> 'admin' THEN
    SELECT can_criar, can_editar INTO v_criar, v_editar
    FROM role_permissions
    WHERE role = v_role AND page_key = 'campanhas'
    LIMIT 1;

    IF (v_criar IS NULL OR v_criar = 'nao') AND (v_editar IS NULL OR v_editar = 'nao') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'permissao');
    END IF;
  END IF;

  v_slug := lower(trim(COALESCE(p_operadora_slug, '')));
  IF v_slug NOT IN ('casa_apostas', 'blaze') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'operadora');
  END IF;

  IF p_campanha_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'campanha');
  END IF;

  SELECT c.operadora_slug, c.ativo
  INTO v_camp_op, v_camp_ativo
  FROM campanhas c
  WHERE c.id = p_campanha_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'campanha');
  END IF;
  IF v_camp_ativo IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'error', 'campanha_inativa');
  END IF;
  IF v_camp_op IS DISTINCT FROM v_slug THEN
    RETURN jsonb_build_object('ok', false, 'error', 'campanha_operadora');
  END IF;

  v_utm := trim(p_utm_source);
  IF v_utm IS NULL OR length(v_utm) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'utm');
  END IF;
  IF length(v_utm) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'utm_longo');
  END IF;
  IF v_utm !~ '^[a-zA-Z0-9_]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'utm_invalido');
  END IF;

  IF EXISTS (
    SELECT 1 FROM campanha_links
    WHERE utm_source = v_utm AND operadora_slug = v_slug
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicado');
  END IF;

  SELECT * INTO v_row
  FROM utm_aliases
  WHERE utm_source = v_utm
    AND COALESCE(operadora_slug, v_slug) = v_slug
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_row FROM utm_aliases WHERE utm_source = v_utm LIMIT 1;
  END IF;

  IF FOUND THEN
    IF v_row.status = 'ignorado' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'utm_indisponivel');
    END IF;
    IF v_row.influencer_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'utm_influencer');
    END IF;
    IF v_row.campanha_id IS NOT NULL AND v_row.campanha_id <> p_campanha_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'utm_outra_campanha');
    END IF;
    IF v_row.operadora_slug IS NOT NULL AND v_row.operadora_slug IS DISTINCT FROM v_slug THEN
      RETURN jsonb_build_object('ok', false, 'error', 'utm_outra_operadora');
    END IF;

    UPDATE utm_aliases SET
      campanha_id    = p_campanha_id,
      influencer_id  = NULL,
      operadora_slug = v_slug,
      status         = 'mapeado',
      mapeado_por    = v_uid,
      mapeado_em     = now(),
      atualizado_em  = now()
    WHERE id = v_row.id;
  ELSE
    INSERT INTO utm_aliases (
      utm_source,
      operadora_slug,
      influencer_id,
      campanha_id,
      status,
      total_visits,
      total_registrations,
      total_ftds,
      total_deposit,
      total_withdrawal,
      primeiro_visto,
      ultimo_visto,
      mapeado_por,
      mapeado_em,
      atualizado_em
    ) VALUES (
      v_utm,
      v_slug,
      NULL,
      p_campanha_id,
      'mapeado',
      0,
      0,
      0,
      0,
      0,
      (timezone('UTC', now()))::date,
      (timezone('UTC', now()))::date,
      v_uid,
      now(),
      now()
    );
  END IF;

  INSERT INTO campanha_links (utm_source, operadora_slug, created_by, campanha_id)
  VALUES (v_utm, v_slug, v_uid, p_campanha_id);

  RETURN jsonb_build_object('ok', true, 'utm_source', v_utm, 'operadora_slug', v_slug);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicado');
  WHEN OTHERS THEN
    RAISE WARNING 'gerar_campanha_link: %', SQLERRM;
    RETURN jsonb_build_object('ok', false, 'error', 'interno');
END;
$$;

COMMENT ON FUNCTION public.gerar_campanha_link(text, uuid, text) IS
  'Gera link em Campanhas → Geração de Links (casa_apostas | blaze): campanha_links + utm_aliases mapeado.';

-- Wrapper legado CDA
CREATE OR REPLACE FUNCTION public.gerar_campanha_link_casa_apostas(
  p_utm_source text,
  p_campanha_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.gerar_campanha_link(p_utm_source, p_campanha_id, 'casa_apostas');
END;
$$;

GRANT EXECUTE ON FUNCTION public.gerar_campanha_link(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_campanha_link_casa_apostas(text, uuid) TO authenticated;
