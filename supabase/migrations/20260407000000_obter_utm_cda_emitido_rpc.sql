-- Lê utm_source já emitido para Links e Materiais (CDA) sem depender de RLS em utm_aliases.
-- Mesma resolução de "influencer alvo" que registrar_utm_alias_tracking_casa_apostas, mas exige can_view.

CREATE OR REPLACE FUNCTION public.obter_utm_cda_emitido_para_influencer(
  p_influencer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_role   text;
  v_ver    text;
  v_target uuid;
  v_src    text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sessão expirada. Faça login novamente.');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Perfil de usuário não encontrado.');
  END IF;

  SELECT can_view INTO v_ver
  FROM role_permissions
  WHERE role = v_role AND page_key = 'links_materiais'
  LIMIT 1;

  IF v_ver IS NULL OR v_ver = 'nao' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Sem permissão para visualizar Links e Materiais.'
    );
  END IF;

  IF v_ver = 'proprios' THEN
    IF v_role = 'influencer' THEN
      v_target := v_uid;
      IF p_influencer_id IS NOT NULL AND p_influencer_id <> v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Você só pode ver o link do próprio perfil.');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Cadastro de influencer incompleto.');
      END IF;
    ELSIF v_role = 'agencia' THEN
      IF p_influencer_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Selecione o influencer.');
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM user_scopes
        WHERE user_id = v_uid
          AND scope_type = 'agencia_par'
          AND NULLIF(trim(split_part(scope_ref, ':', 1)), '') = p_influencer_id::text
      ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão para este influencer.');
      END IF;
      v_target := p_influencer_id;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Influencer não encontrado.');
      END IF;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Permissão "Próprios" não se aplica ao seu perfil para esta página.');
    END IF;
  ELSE
    IF v_role = 'influencer' THEN
      v_target := v_uid;
      IF p_influencer_id IS NOT NULL AND p_influencer_id <> v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Influencer só pode ver o próprio link.');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Cadastro de influencer incompleto.');
      END IF;
    ELSE
      IF p_influencer_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Selecione o influencer.');
      END IF;
      v_target := p_influencer_id;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Influencer não encontrado.');
      END IF;
    END IF;
  END IF;

  SELECT ua.utm_source INTO v_src
  FROM utm_aliases ua
  WHERE ua.influencer_id = v_target
    AND ua.status = 'mapeado'
    AND ua.campanha_id IS NULL
    AND (ua.operadora_slug = 'casa_apostas' OR ua.operadora_slug IS NULL)
  ORDER BY ua.mapeado_em DESC NULLS LAST
  LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'utm_source', v_src);
END;
$$;

COMMENT ON FUNCTION public.obter_utm_cda_emitido_para_influencer(uuid) IS
  'Retorna utm_source do link CDA já mapeado para o influencer alvo (Links e Materiais); ignora RLS em utm_aliases.';

GRANT EXECUTE ON FUNCTION public.obter_utm_cda_emitido_para_influencer(uuid) TO authenticated;
