-- Reativação completa via Edge admin-usuario-acao (senha padrão + boas-vindas).
-- O trigger deixa de atualizar profiles diretamente e dispara a Edge com service_role.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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

  -- Preferir helper de cron se existir; senão POST direto via vault.
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
      '[influencer_perfil_reativar] vault sem supabase_project_url / supabase_service_role_key — reativação de % ignorada',
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
  'Quando influencer_perfil passa a status ativo, chama admin-usuario-acao (reativar + senha padrão + e-mail de boas-vindas).';

-- Garante o trigger (caso a migration anterior não tenha sido aplicada).
DROP TRIGGER IF EXISTS trg_influencer_perfil_reativar_usuario ON public.influencer_perfil;
CREATE TRIGGER trg_influencer_perfil_reativar_usuario
  AFTER UPDATE OF status ON public.influencer_perfil
  FOR EACH ROW
  EXECUTE PROCEDURE public.influencer_perfil_reativar_usuario_ao_ativar();

COMMIT;
