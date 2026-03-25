-- ─── RPC: influencer emite link de rastreamento (Casa de Apostas) ────────────
-- Registra o valor de utm_source em utm_aliases como mapeado ao próprio influencer
-- e aplica aplicar_mapeamento_utm (mesmo fluxo da Gestão de Links).
-- SECURITY DEFINER: necessário porque RLS em utm_aliases costuma não permitir INSERT.

CREATE OR REPLACE FUNCTION public.registrar_utm_alias_tracking_casa_apostas(p_utm_source text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_role  text;
  v_utm   text;
  v_row   utm_aliases%ROWTYPE;
  v_dummy bigint;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sessão expirada. Faça login novamente.');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Perfil de usuário não encontrado.');
  END IF;

  IF v_role <> 'influencer' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Apenas o perfil influencer pode emitir este link.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM influencer_perfil WHERE id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cadastro de influencer incompleto.');
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
    IF v_row.influencer_id IS NOT NULL AND v_row.influencer_id <> v_uid THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Este valor de UTM já está em uso por outro creator.');
    END IF;

    IF v_row.status = 'mapeado' AND v_row.influencer_id = v_uid THEN
      SELECT linhas_copiadas INTO v_dummy FROM aplicar_mapeamento_utm(v_utm, v_uid) LIMIT 1;
      RETURN jsonb_build_object('ok', true, 'utm_source', v_utm);
    END IF;

    UPDATE utm_aliases SET
      influencer_id = v_uid,
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
      v_uid,
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

  SELECT linhas_copiadas INTO v_dummy FROM aplicar_mapeamento_utm(v_utm, v_uid) LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'utm_source', v_utm);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Conflito ao salvar o UTM. Tente outro valor.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Erro ao registrar: ' || SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.registrar_utm_alias_tracking_casa_apostas(text) IS
  'Influencer define utm_source para o link de afiliado CDA; upsert em utm_aliases (mapeado) e chama aplicar_mapeamento_utm.';

GRANT EXECUTE ON FUNCTION public.registrar_utm_alias_tracking_casa_apostas(text) TO authenticated;

-- Permissões de menu (igual padrão de conteúdo operacional)
INSERT INTO role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir) VALUES
  ('admin',     'links_materiais', 'sim',     NULL, NULL, NULL),
  ('gestor',    'links_materiais', 'sim',     NULL, NULL, NULL),
  ('executivo', 'links_materiais', 'sim',     NULL, NULL, NULL),
  ('operador',  'links_materiais', 'sim',     NULL, NULL, NULL),
  ('influencer','links_materiais', 'sim',     NULL, NULL, NULL),
  ('agencia',   'links_materiais', 'proprios', NULL, NULL, NULL)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;
