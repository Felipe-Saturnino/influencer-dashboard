-- =============================================================================
-- One-off: alterar e-mail de acesso
--   DE: nathaliaoliveira.dprh@gmail.com
--   PARA: nathalia.jesus@spingaming.com.br
--
-- Cobertura:
--   • auth.users, auth.identities — login Supabase Auth
--   • public.profiles — e-mail exibido / Gestão de Usuários
--   • public.rh_funcionarios — email_spin (login corporativo) quando vinculado
--   • scout_influencer e demais tabelas public com email + user_id/influencer_id
--
-- Execute no Supabase: SQL Editor (papel com permissão em auth e public).
-- =============================================================================

-- 1) Verificação — confira id, nome e e-mail atual
SELECT p.id, p.name, p.email, p.role, p.ativo
FROM public.profiles p
WHERE lower(trim(p.email)) = lower(trim('nathaliaoliveira.dprh@gmail.com'));

SELECT u.id, u.email, u.last_sign_in_at
FROM auth.users u
WHERE lower(trim(u.email::text)) = lower(trim('nathaliaoliveira.dprh@gmail.com'));

-- 1b) Cadastro RH vinculado (e-mail pessoal / Spin)
SELECT f.id, f.nome, f.email, f.email_spin, f.status
FROM public.rh_funcionarios f
WHERE lower(trim(coalesce(f.email, ''))) = lower(trim('nathaliaoliveira.dprh@gmail.com'))
   OR lower(trim(coalesce(f.email_spin, ''))) = lower(trim('nathaliaoliveira.dprh@gmail.com'))
   OR lower(trim(coalesce(f.email_spin, ''))) = lower(trim('nathalia.jesus@spingaming.com.br'));

-- 1c) Conflito: novo e-mail já em uso?
SELECT 'auth.users' AS origem, id, email
FROM auth.users
WHERE lower(trim(email::text)) = lower(trim('nathalia.jesus@spingaming.com.br'))
UNION ALL
SELECT 'profiles', id::text, email
FROM public.profiles
WHERE lower(trim(email)) = lower(trim('nathalia.jesus@spingaming.com.br'));

-- 2) Aplicar alteração
DO $$
DECLARE
  old_email constant text := lower(trim('nathaliaoliveira.dprh@gmail.com'));
  target_email constant text := lower(trim('nathalia.jesus@spingaming.com.br'));
  uid uuid;
  r record;
  has_uid boolean;
  has_inf boolean;
  n int;
BEGIN
  SELECT p.id INTO uid
  FROM public.profiles p
  WHERE lower(trim(p.email)) = old_email
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT 1;

  IF uid IS NULL THEN
    SELECT u.id INTO uid
    FROM auth.users u
    WHERE lower(trim(u.email::text)) = old_email
    LIMIT 1;
  END IF;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado com e-mail %. Ajuste o filtro ou informe o id manualmente.', old_email;
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(trim(email::text)) = target_email AND id <> uid
  ) THEN
    RAISE EXCEPTION 'O e-mail % já está em uso por outro usuário em auth.users.', target_email;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(trim(email)) = target_email AND id <> uid
  ) THEN
    RAISE EXCEPTION 'O e-mail % já está em uso por outro perfil.', target_email;
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

  -- RH: define e-mail Spin corporativo para login; mantém e-mail pessoal em email
  UPDATE public.rh_funcionarios
  SET email_spin = target_email
  WHERE lower(trim(coalesce(email, ''))) = old_email
     OR lower(trim(coalesce(email_spin, ''))) = old_email;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    RAISE NOTICE 'rh_funcionarios.email_spin: % linha(s) alinhada(s).', n;
  END IF;

  UPDATE public.scout_influencer
  SET email = target_email
  WHERE user_id = uid
     OR (
       old_email IS NOT NULL
       AND length(trim(old_email)) > 0
       AND lower(trim(coalesce(email, ''))) = old_email
     );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    RAISE NOTICE 'scout_influencer: % linha(s) com e-mail alinhado.', n;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'influencer_perfil'
      AND column_name = 'email'
  ) THEN
    EXECUTE 'UPDATE public.influencer_perfil SET email = $1 WHERE id = $2'
    USING target_email, uid;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      RAISE NOTICE 'influencer_perfil.email: % linha(s).', n;
    END IF;
  END IF;

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
      AND t.table_name NOT IN ('profiles', 'scout_influencer', 'email_envios', 'rh_funcionarios')
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

  RAISE NOTICE 'Concluído: e-mail de acesso % → % (user id %).', old_email, target_email, uid;
END $$;

-- 3) Conferência final
SELECT p.id, p.name, p.email, p.role, p.ativo
FROM public.profiles p
WHERE p.id IN (
  SELECT id FROM auth.users WHERE lower(trim(email::text)) = lower(trim('nathalia.jesus@spingaming.com.br'))
);

SELECT f.id, f.nome, f.email, f.email_spin, f.status
FROM public.rh_funcionarios f
WHERE lower(trim(coalesce(f.email_spin, ''))) = lower(trim('nathalia.jesus@spingaming.com.br'))
   OR lower(trim(coalesce(f.email, ''))) = lower(trim('nathaliaoliveira.dprh@gmail.com'));
