-- Ao ativar cadastro (Influencers/Afiliados), reabrir o acesso na hora.
-- A migração 20260913230000 só disparava a Edge (senha + e-mail); se vault/pg_net
-- falhasse, profiles.ativo permanecia false e o influencer não entrava no DI.

BEGIN;

CREATE OR REPLACE FUNCTION public.influencer_perfil_reativar_usuario_ao_ativar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_role text;
  v_base text;
  v_key text;
  v_req_id bigint;
  v_actor uuid := auth.uid();
  v_id uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM 'ativo' THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM 'ativo' THEN
    RETURN NEW;
  END IF;

  SELECT p.role
  INTO v_role
  FROM public.profiles p
  WHERE p.id = NEW.id
    AND p.ativo IS FALSE
    AND p.role IN ('influencer', 'afiliado');

  IF v_role IS NULL THEN
    RETURN NEW;
  END IF;

  -- Acesso imediato (não depende de Edge/vault): libera login e agenda.
  UPDATE public.profiles
  SET
    ativo = true,
    acesso_referencia_em = now()
  WHERE id = NEW.id
    AND ativo IS FALSE
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    PERFORM public.profiles_historico_registrar(
      v_id,
      'ativacao',
      'ativacao_influencer_afiliado',
      v_actor,
      CASE
        WHEN v_role = 'afiliado' THEN 'Reativação de acesso — status Ativo na página Afiliados'
        ELSE 'Reativação de acesso — status Ativo na página Influencers'
      END,
      NULL,
      NULL,
      true
    );
  END IF;

  -- Best-effort: senha padrão + must_change_password + e-mail de boas-vindas.
  IF to_regprocedure('public._cron_edge_http_post(text, jsonb)') IS NOT NULL THEN
    PERFORM public._cron_edge_http_post(
      'admin-usuario-acao',
      jsonb_build_object(
        'userId', NEW.id,
        'action', 'ativar',
        'internal', true,
        'origem', 'ativacao_influencer_afiliado',
        'realizadoPor', v_actor
      )
    );
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_base
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_project_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  IF v_base IS NULL OR btrim(v_base) = '' OR v_key IS NULL OR btrim(v_key) = '' THEN
    RAISE WARNING
      '[influencer_perfil_reativar] vault sem supabase_project_url / supabase_service_role_key — e-mail/senha de % ignorados (acesso já liberado)',
      NEW.id;
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_base, '/') || '/functions/v1/admin-usuario-acao',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key
    ),
    body := jsonb_build_object(
      'userId', NEW.id,
      'action', 'ativar',
      'internal', true,
      'origem', 'ativacao_influencer_afiliado',
      'realizadoPor', v_actor
    )
  ) INTO v_req_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.influencer_perfil_reativar_usuario_ao_ativar() IS
  'Quando influencer_perfil.status passa a ativo: libera profiles.ativo na hora; em seguida tenta Edge admin-usuario-acao (senha padrão + boas-vindas).';

DROP TRIGGER IF EXISTS trg_influencer_perfil_reativar_usuario ON public.influencer_perfil;
CREATE TRIGGER trg_influencer_perfil_reativar_usuario
  AFTER UPDATE OF status ON public.influencer_perfil
  FOR EACH ROW
  EXECUTE PROCEDURE public.influencer_perfil_reativar_usuario_ao_ativar();

COMMIT;
