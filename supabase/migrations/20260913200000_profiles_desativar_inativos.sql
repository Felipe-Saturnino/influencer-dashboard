-- Desativação automática de usuários por inatividade:
--   1) nunca acessou (last_sign_in_at IS NULL) e âncora ≥ 30 dias;
--   2) já acessou e GREATEST(last_sign_in_at, âncora) ≥ 60 dias.
-- A âncora `acesso_referencia_em` é definida no cadastro e resetada ao reativar.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acesso_referencia_em timestamptz;

COMMENT ON COLUMN public.profiles.acesso_referencia_em IS
  'Âncora do relógio de inatividade (cadastro/convite ou última reativação). Resetada ao reativar o usuário.';

-- Backfill: quem já logou usa o último login; quem nunca logou usa created_at (convite).
UPDATE public.profiles
SET acesso_referencia_em = COALESCE(last_sign_in_at, created_at, now())
WHERE acesso_referencia_em IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN acesso_referencia_em SET DEFAULT now();

ALTER TABLE public.profiles
  ALTER COLUMN acesso_referencia_em SET NOT NULL;

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
    SELECT p.id
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
  )
  UPDATE public.profiles p
  SET ativo = false
  FROM alvo
  WHERE p.id = alvo.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_desativar_inativos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_desativar_inativos() TO postgres;
GRANT EXECUTE ON FUNCTION public.profiles_desativar_inativos() TO service_role;

COMMENT ON FUNCTION public.profiles_desativar_inativos() IS
  'Desativa profiles ativos: 30d sem nenhum login desde a âncora, ou 60d sem login após já ter acessado (GREATEST login/âncora).';

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'profiles-desativar-inativos-diario'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END;
$$;

-- ~07:00 BRT (10:00 UTC)
SELECT cron.schedule(
  'profiles-desativar-inativos-diario',
  '0 10 * * *',
  'SELECT public.profiles_desativar_inativos();'
);

COMMIT;
