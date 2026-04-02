-- =============================================================================
-- One-off: corrigir e-mail da Ellen Magnus → rodriguesellenm@gmail.com
--
-- Cobertura (alinhado ao app):
--   • auth.users, auth.identities — login Supabase Auth
--   • public.profiles — e-mail exibido em Influencers, Financeiro, Gestão Usuários
--   • public.scout_influencer — prospecto / fechamento (coluna email)
--   • Qualquer tabela public com colunas email + (user_id OU influencer_id) apontando
--     para o mesmo UUID do perfil (ex.: extensões futuras)
--   • public.influencer_perfil — somente se existir coluna email (id = mesmo UUID)
--
-- Não altera: email_envios (contagens agregadas), tech_logs (sem e-mail por usuário),
-- guia_confirmacoes (só influencer_id), métricas/financeiro (sem coluna email).
--
-- Execute no Supabase: SQL Editor (papel com permissão em auth e public).
-- =============================================================================

-- 1) Verificação: confira se este é o usuário certo (id, nome e e-mail atual)
SELECT p.id, p.name, p.email, p.role
FROM public.profiles p
WHERE p.name ILIKE '%ellen%magnus%'
   OR (p.name ILIKE '%ellen%' AND p.name ILIKE '%magnus%');

-- 1b) Scout vinculado ou com o mesmo e-mail errado (opcional)
SELECT s.id, s.nome_artistico, s.email, s.user_id, s.status
FROM public.scout_influencer s
WHERE s.nome_artistico ILIKE '%ellen%magnus%'
   OR s.user_id IN (
     SELECT p.id FROM public.profiles p
     WHERE p.name ILIKE '%ellen%magnus%'
        OR (p.name ILIKE '%ellen%' AND p.name ILIKE '%magnus%')
   );

-- 1c) Auditoria: outras tabelas public com coluna "email" (liste estrutura do seu projeto)
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'email'
ORDER BY table_name;

-- 2) Se o SELECT 1) retornar mais de uma linha, use id fixo no bloco abaixo:
--    Troque o SELECT ... INTO por: uid := 'COLE-O-UUID-AQUI'::uuid; old_email := ...;

DO $$
DECLARE
  target_email constant text := lower(trim('rodriguesellenm@gmail.com'));
  uid uuid;
  old_email text;
  r record;
  has_uid boolean;
  has_inf boolean;
  n int;
BEGIN
  SELECT p.id, p.email INTO uid, old_email
  FROM public.profiles p
  WHERE p.name ILIKE '%ellen%magnus%'
     OR (p.name ILIKE '%ellen%' AND p.name ILIKE '%magnus%')
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum perfil encontrado para Ellen Magnus. Ajuste o filtro ou informe o id manualmente.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(trim(email)) = target_email AND id <> uid) THEN
    RAISE EXCEPTION 'O e-mail % já está em uso por outro usuário em auth.users.', target_email;
  END IF;

  UPDATE public.profiles
  SET email = target_email
  WHERE id = uid;

  UPDATE auth.users
  SET
    email = target_email,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('email', target_email)
  WHERE id = uid;

  UPDATE auth.identities
  SET
    identity_data = COALESCE(identity_data, '{}'::jsonb)
      || jsonb_build_object('email', target_email, 'email_verified', true),
    provider_id = target_email
  WHERE user_id = uid
    AND provider = 'email';

  -- Scout: usuário já vinculado OU ficha da Ellen com o e-mail antigo (sem user_id)
  UPDATE public.scout_influencer
  SET email = target_email
  WHERE user_id = uid
     OR (
       nome_artistico ILIKE '%ellen%magnus%'
       AND old_email IS NOT NULL
       AND length(trim(old_email)) > 0
       AND lower(trim(coalesce(email, ''))) = lower(trim(old_email))
     );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    RAISE NOTICE 'scout_influencer: % linha(s) com e-mail alinhado.', n;
  END IF;

  -- influencer_perfil.id = profiles.id para influencers (se houver coluna email legada)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'influencer_perfil'
      AND column_name = 'email'
  ) THEN
    EXECUTE 'UPDATE public.influencer_perfil SET email = $1 WHERE id = $2'
    USING target_email, uid;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'influencer_perfil.email: % linha(s).', n;
  END IF;

  -- Demais tabelas public: email + vínculo por user_id ou influencer_id (= mesmo UUID)
  FOR r IN
    SELECT t.table_name AS tname
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = t.table_name
          AND c.column_name = 'email'
      )
      AND t.table_name NOT IN ('profiles', 'scout_influencer', 'email_envios')
  LOOP
    n := 0;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = r.tname
        AND c.column_name = 'user_id'
    ) INTO has_uid;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = r.tname
        AND c.column_name = 'influencer_id'
    ) INTO has_inf;

    IF has_uid AND has_inf THEN
      EXECUTE format(
        'UPDATE public.%I SET email = $1 WHERE user_id = $2 OR influencer_id = $2',
        r.tname
      ) USING target_email, uid;
      GET DIAGNOSTICS n = ROW_COUNT;
    ELSIF has_uid THEN
      EXECUTE format(
        'UPDATE public.%I SET email = $1 WHERE user_id = $2',
        r.tname
      ) USING target_email, uid;
      GET DIAGNOSTICS n = ROW_COUNT;
    ELSIF has_inf THEN
      EXECUTE format(
        'UPDATE public.%I SET email = $1 WHERE influencer_id = $2',
        r.tname
      ) USING target_email, uid;
      GET DIAGNOSTICS n = ROW_COUNT;
    END IF;

    IF n > 0 THEN
      RAISE NOTICE 'Tabela %: % linha(s) atualizada(s).', r.tname, n;
    END IF;
  END LOOP;

  RAISE NOTICE 'Concluído: e-mail % para user id %.', target_email, uid;
END $$;

-- 3) Conferência final
SELECT p.id, p.name, p.email, p.role
FROM public.profiles p
WHERE p.name ILIKE '%ellen%magnus%'
   OR (p.name ILIKE '%ellen%' AND p.name ILIKE '%magnus%');
