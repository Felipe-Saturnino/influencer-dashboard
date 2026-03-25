-- ─── Corrige INSERT: primeiro_visto / ultimo_visto são tipo date, não text ───
-- (to_char(...) gerava text e quebrava o INSERT). Idempotente: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.registrar_utm_alias_tracking_casa_apostas(
  p_utm_source text,
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
  v_editar text;
  v_target uuid;
  v_utm    text;
  v_row    utm_aliases%ROWTYPE;
  v_dummy  bigint;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sessão expirada. Faça login novamente.');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Perfil de usuário não encontrado.');
  END IF;

  SELECT can_editar INTO v_editar
  FROM role_permissions
  WHERE role = v_role AND page_key = 'links_materiais'
  LIMIT 1;

  IF v_editar IS NULL OR v_editar = 'nao' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Sem permissão para emitir. Ative "Editar" para a página Links e Materiais em Gestão de Usuários.'
    );
  END IF;

  IF v_editar = 'proprios' THEN
    IF v_role = 'influencer' THEN
      v_target := v_uid;
      IF p_influencer_id IS NOT NULL AND p_influencer_id <> v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Você só pode emitir link para o próprio perfil.');
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
        RETURN jsonb_build_object('ok', false, 'error', 'Influencer só pode mapear para si.');
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

  v_utm := trim(p_utm_source);
  IF v_utm IS NULL OR length(v_utm) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o valor que deseja usar no parâmetro UTM.');
  END IF;
  IF length(v_utm) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Valor muito longo (máximo 200 caracteres).');
  END IF;
  IF v_utm !~ '^[a-zA-Z0-9_]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Use apenas letras (a-z, A-Z), números e underscore (_). Sem acentos, espaços ou caracteres especiais.');
  END IF;

  SELECT * INTO v_row FROM utm_aliases WHERE utm_source = v_utm LIMIT 1;

  IF FOUND THEN
    IF v_row.status = 'ignorado' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Este identificador não está disponível.');
    END IF;
    IF v_row.campanha_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Este identificador está reservado para uma campanha.');
    END IF;
    IF v_row.influencer_id IS NOT NULL AND v_row.influencer_id <> v_target THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Este valor de UTM já está em uso por outro creator.');
    END IF;

    IF v_row.status = 'mapeado' AND v_row.influencer_id = v_target THEN
      SELECT linhas_copiadas INTO v_dummy FROM aplicar_mapeamento_utm(v_utm, v_target) LIMIT 1;
      RETURN jsonb_build_object('ok', true, 'utm_source', v_utm);
    END IF;

    UPDATE utm_aliases SET
      influencer_id = v_target,
      campanha_id   = NULL,
      status        = 'mapeado',
      mapeado_por   = v_uid,
      mapeado_em    = now(),
      atualizado_em = now()
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
      v_target,
      NULL,
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

  SELECT linhas_copiadas INTO v_dummy FROM aplicar_mapeamento_utm(v_utm, v_target) LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'utm_source', v_utm);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Conflito ao salvar o UTM. Tente outro valor.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Erro ao registrar: ' || SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.registrar_utm_alias_tracking_casa_apostas(text, uuid) IS
  'Emite link de afiliado CDA: exige can_editar em links_materiais; grava utm_aliases (influencer alvo + mapeado_por).';

GRANT EXECUTE ON FUNCTION public.registrar_utm_alias_tracking_casa_apostas(text, uuid) TO authenticated;
