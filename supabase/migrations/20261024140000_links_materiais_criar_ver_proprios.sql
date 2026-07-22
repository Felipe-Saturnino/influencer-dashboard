-- Links e Materiais: emissão passa a usar can_criar (não can_editar).
-- Ver = sim → lista completa; Ver = próprios → só o próprio link (Influencer/Afiliado) ou escopo (Agência).

BEGIN;

-- Migrar valores existentes de Editar → Criar e limpar Editar nesta página
UPDATE public.role_permissions
SET
  can_criar = COALESCE(NULLIF(can_criar, 'nao'), can_editar, can_criar),
  can_editar = NULL
WHERE page_key = 'links_materiais';

-- Defaults alinhados ao produto
UPDATE public.role_permissions
SET can_view = 'proprios', can_criar = 'proprios'
WHERE page_key = 'links_materiais'
  AND role IN ('influencer', 'afiliado', 'agencia');

UPDATE public.role_permissions
SET can_view = 'sim', can_criar = 'sim'
WHERE page_key = 'links_materiais'
  AND role IN (
    'admin', 'gestor', 'executivo', 'operador', 'investidor',
    'gestor_aquisicao', 'gestor_marketing', 'gestor_operacoes',
    'gestor_tech_ops', 'gestor_academy', 'gestor_rh'
  );

-- Espelho em matrizes de gestor (quando existirem colunas de ação)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gestor_tipo_pages' AND column_name = 'can_criar'
  ) THEN
    UPDATE public.gestor_tipo_pages
    SET
      can_criar = COALESCE(NULLIF(can_criar, 'nao'), can_editar, can_criar),
      can_editar = NULL
    WHERE page_key = 'links_materiais';
  END IF;
END $$;

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
  v_criar  text;
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

  SELECT can_criar INTO v_criar
  FROM role_permissions
  WHERE role = v_role AND page_key = 'links_materiais'
  LIMIT 1;

  IF v_criar IS NULL OR v_criar = 'nao' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Sem permissão para emitir. Ative "Criar" para a página Links e Materiais em Gestão de Usuários.'
    );
  END IF;

  IF v_criar = 'proprios' THEN
    IF v_role IN ('influencer', 'afiliado') THEN
      v_target := v_uid;
      IF p_influencer_id IS NOT NULL AND p_influencer_id <> v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Você só pode emitir link para o próprio perfil.');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Cadastro incompleto.');
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
    IF v_role IN ('influencer', 'afiliado') THEN
      v_target := v_uid;
      IF p_influencer_id IS NOT NULL AND p_influencer_id <> v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Você só pode emitir link para o próprio perfil.');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Cadastro incompleto.');
      END IF;
    ELSE
      IF p_influencer_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Selecione o influencer ou afiliado.');
      END IF;
      v_target := p_influencer_id;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Perfil não encontrado.');
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
      UPDATE influencer_perfil SET utm_source = v_utm WHERE id = v_target;
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

  UPDATE influencer_perfil SET utm_source = v_utm WHERE id = v_target;

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
  'Emite link CDA (Links e Materiais): exige can_criar; grava utm_aliases mapeado e espelha utm_source no perfil.';

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
    IF v_role IN ('influencer', 'afiliado') THEN
      v_target := v_uid;
      IF p_influencer_id IS NOT NULL AND p_influencer_id <> v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Você só pode ver o link do próprio perfil.');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Cadastro incompleto.');
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
    IF v_role IN ('influencer', 'afiliado') THEN
      v_target := v_uid;
      IF p_influencer_id IS NOT NULL AND p_influencer_id <> v_uid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Você só pode ver o próprio link.');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Cadastro incompleto.');
      END IF;
    ELSE
      IF p_influencer_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Selecione o influencer ou afiliado.');
      END IF;
      v_target := p_influencer_id;
      IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_target) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Perfil não encontrado.');
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
  'Retorna utm_source do link CDA já mapeado (Links e Materiais); respeita can_view sim/próprios.';

COMMIT;
