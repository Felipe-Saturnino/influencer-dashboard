-- campanha_id nos links gerados + RPC para gravar utm_aliases (mapeado → campanha)
-- sem depender de INSERT direto em utm_aliases (RLS).

ALTER TABLE public.campanha_links
  ADD COLUMN IF NOT EXISTS campanha_id uuid REFERENCES public.campanhas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campanha_links_campanha
  ON public.campanha_links (campanha_id)
  WHERE campanha_id IS NOT NULL;

COMMENT ON COLUMN public.campanha_links.campanha_id IS
  'Campanha à qual o link foi atribuído na geração (espelha utm_aliases.campanha_id).';

CREATE OR REPLACE FUNCTION public.gerar_campanha_link_casa_apostas(
  p_utm_source text,
  p_campanha_id uuid
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
  IF v_camp_op IS DISTINCT FROM 'casa_apostas' THEN
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
    WHERE utm_source = v_utm AND operadora_slug = 'casa_apostas'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicado');
  END IF;

  SELECT * INTO v_row FROM utm_aliases WHERE utm_source = v_utm LIMIT 1;

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

    UPDATE utm_aliases SET
      campanha_id    = p_campanha_id,
      influencer_id  = NULL,
      operadora_slug = COALESCE(operadora_slug, 'casa_apostas'),
      status         = 'mapeado',
      mapeado_por    = v_uid,
      mapeado_em     = now(),
      atualizado_em  = now()
    WHERE utm_source = v_utm;
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
      'casa_apostas',
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
  VALUES (v_utm, 'casa_apostas', v_uid, p_campanha_id);

  RETURN jsonb_build_object('ok', true, 'utm_source', v_utm);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicado');
  WHEN OTHERS THEN
    RAISE WARNING 'gerar_campanha_link_casa_apostas: %', SQLERRM;
    RETURN jsonb_build_object('ok', false, 'error', 'interno');
END;
$$;

COMMENT ON FUNCTION public.gerar_campanha_link_casa_apostas(text, uuid) IS
  'Gera link em Campanhas → Geração de Links (CDA): grava campanha_links e mapeia utm_aliases à campanha.';

GRANT EXECUTE ON FUNCTION public.gerar_campanha_link_casa_apostas(text, uuid) TO authenticated;
