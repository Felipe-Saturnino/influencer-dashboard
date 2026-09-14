-- Histórico de acesso e alterações de usuário (Gestão de Usuários → Histórico).
-- Eventos: ativação, desativação, reset de senha, alteração de nome/perfil/escopo.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_granted_origem text,
  ADD COLUMN IF NOT EXISTS desativado_em timestamptz,
  ADD COLUMN IF NOT EXISTS desativado_por uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS desativado_origem text,
  ADD COLUMN IF NOT EXISTS ultimo_reset_senha_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_reset_senha_por uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ultimo_reset_senha_origem text;

COMMENT ON COLUMN public.profiles.access_granted_origem IS
  'Origem da última liberação/reativação: manual | contrato_ativado | ativacao_influencer_afiliado';
COMMENT ON COLUMN public.profiles.desativado_em IS
  'Data/hora da última desativação (manual, automação ou destrato).';
COMMENT ON COLUMN public.profiles.desativado_origem IS
  'Origem da última desativação: manual | automacao_inatividade | automacao_convite | destrato';
COMMENT ON COLUMN public.profiles.ultimo_reset_senha_em IS
  'Data/hora do último reset de senha (admin ou Login).';
COMMENT ON COLUMN public.profiles.ultimo_reset_senha_origem IS
  'Origem do último reset: manual | usuario';

CREATE TABLE IF NOT EXISTS public.profiles_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  tipo text NOT NULL
    CHECK (tipo IN (
      'ativacao',
      'desativacao',
      'reset_senha',
      'alteracao_nome',
      'alteracao_perfil',
      'alteracao_escopo'
    )),
  origem text NOT NULL
    CHECK (origem IN (
      'manual',
      'automacao_inatividade',
      'automacao_convite',
      'destrato',
      'contrato_ativado',
      'ativacao_influencer_afiliado',
      'usuario'
    )),
  realizado_por uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  resumo text,
  valor_anterior text,
  valor_novo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_historico_profile_created_idx
  ON public.profiles_historico (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS profiles_historico_tipo_idx
  ON public.profiles_historico (profile_id, tipo, created_at DESC);

COMMENT ON TABLE public.profiles_historico IS
  'Auditoria de acesso e alterações de Nome/Perfil/Escopo — modal Histórico na Gestão de Usuários.';

ALTER TABLE public.profiles_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_historico_select_admin ON public.profiles_historico;
CREATE POLICY profiles_historico_select_admin
  ON public.profiles_historico
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

REVOKE ALL ON TABLE public.profiles_historico FROM PUBLIC;
GRANT SELECT ON TABLE public.profiles_historico TO authenticated;
GRANT ALL ON TABLE public.profiles_historico TO service_role;

-- Registrar evento + espelhar colunas denormalizadas no profile.
CREATE OR REPLACE FUNCTION public.profiles_historico_registrar(
  p_profile_id uuid,
  p_tipo text,
  p_origem text,
  p_realizado_por uuid DEFAULT NULL,
  p_resumo text DEFAULT NULL,
  p_valor_anterior text DEFAULT NULL,
  p_valor_novo text DEFAULT NULL,
  p_preservar_access_granted_at boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_now timestamptz := now();
BEGIN
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_id obrigatório';
  END IF;

  INSERT INTO public.profiles_historico (
    profile_id, tipo, origem, realizado_por, resumo, valor_anterior, valor_novo, created_at
  )
  VALUES (
    p_profile_id, p_tipo, p_origem, p_realizado_por, p_resumo, p_valor_anterior, p_valor_novo, v_now
  )
  RETURNING id INTO v_id;

  IF p_tipo = 'ativacao' THEN
    UPDATE public.profiles
    SET
      access_granted_by = COALESCE(p_realizado_por, access_granted_by),
      access_granted_at = CASE
        WHEN p_preservar_access_granted_at AND access_granted_at IS NOT NULL THEN access_granted_at
        ELSE COALESCE(access_granted_at, v_now)
      END,
      access_granted_origem = p_origem,
      desativado_em = NULL,
      desativado_por = NULL,
      desativado_origem = NULL
    WHERE id = p_profile_id;
  ELSIF p_tipo = 'desativacao' THEN
    UPDATE public.profiles
    SET
      desativado_em = v_now,
      desativado_por = p_realizado_por,
      desativado_origem = p_origem
    WHERE id = p_profile_id;
  ELSIF p_tipo = 'reset_senha' THEN
    UPDATE public.profiles
    SET
      ultimo_reset_senha_em = v_now,
      ultimo_reset_senha_por = p_realizado_por,
      ultimo_reset_senha_origem = p_origem
    WHERE id = p_profile_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_historico_registrar(
  uuid, text, text, uuid, text, text, text, boolean
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_historico_registrar(
  uuid, text, text, uuid, text, text, text, boolean
) TO service_role;

COMMENT ON FUNCTION public.profiles_historico_registrar IS
  'Insere evento em profiles_historico e atualiza colunas de espelho no profile (ativação/desativação/reset).';

-- Job diário: desativa e registra origem (convite vs inatividade).
CREATE OR REPLACE FUNCTION public.profiles_desativar_inativos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH alvo AS (
    SELECT
      p.id,
      CASE
        WHEN p.last_sign_in_at IS NULL THEN 'automacao_convite'
        ELSE 'automacao_inatividade'
      END AS origem
    FROM public.profiles p
    WHERE p.ativo IS TRUE
      AND (
        (
          p.last_sign_in_at IS NULL
          AND p.acesso_referencia_em <= (now() - interval '30 days')
        )
        OR (
          p.last_sign_in_at IS NOT NULL
          AND GREATEST(p.last_sign_in_at, p.acesso_referencia_em) <= (now() - interval '60 days')
        )
      )
  ),
  upd AS (
    UPDATE public.profiles p
    SET
      ativo = false,
      desativado_em = now(),
      desativado_por = NULL,
      desativado_origem = alvo.origem
    FROM alvo
    WHERE p.id = alvo.id
    RETURNING p.id, alvo.origem
  )
  INSERT INTO public.profiles_historico (profile_id, tipo, origem, realizado_por, resumo)
  SELECT
    u.id,
    'desativacao',
    u.origem,
    NULL,
    CASE
      WHEN u.origem = 'automacao_convite' THEN 'Desativação automática — convite sem acesso'
      ELSE 'Desativação automática — inatividade sem login'
    END
  FROM upd u;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.profiles_desativar_inativos() IS
  'Desativa profiles inativos (30d convite / 60d sem login) e registra em profiles_historico.';

-- Backfill: uma ativação inicial por usuário já existente.
INSERT INTO public.profiles_historico (profile_id, tipo, origem, realizado_por, resumo, created_at)
SELECT
  p.id,
  'ativacao',
  CASE
    WHEN p.role IN ('influencer', 'afiliado') THEN 'ativacao_influencer_afiliado'
    ELSE 'manual'
  END,
  p.access_granted_by,
  'Liberação de acesso (histórico inicial)',
  COALESCE(p.access_granted_at, p.created_at, now())
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles_historico h
  WHERE h.profile_id = p.id
    AND h.tipo = 'ativacao'
);

UPDATE public.profiles p
SET access_granted_origem = CASE
  WHEN p.role IN ('influencer', 'afiliado') THEN 'ativacao_influencer_afiliado'
  ELSE COALESCE(p.access_granted_origem, 'manual')
END
WHERE p.access_granted_origem IS NULL;

UPDATE public.profiles p
SET
  desativado_em = COALESCE(p.desativado_em, now()),
  desativado_origem = COALESCE(p.desativado_origem, 'manual')
WHERE p.ativo IS FALSE
  AND p.desativado_em IS NULL;

COMMIT;
