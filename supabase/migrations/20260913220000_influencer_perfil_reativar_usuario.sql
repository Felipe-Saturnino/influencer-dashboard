-- Ao tornar influencer_perfil.status = 'ativo', reativa o usuário da plataforma
-- (profiles.ativo) se estiver desativado — Influencers e Afiliados.

BEGIN;

CREATE OR REPLACE FUNCTION public.influencer_perfil_reativar_usuario_ao_ativar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
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
      auth.uid(),
      CASE
        WHEN v_role = 'afiliado' THEN 'Reativação — status Ativo na página Afiliados'
        ELSE 'Reativação — status Ativo na página Influencers'
      END,
      NULL,
      NULL,
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_influencer_perfil_reativar_usuario ON public.influencer_perfil;
CREATE TRIGGER trg_influencer_perfil_reativar_usuario
  AFTER UPDATE OF status ON public.influencer_perfil
  FOR EACH ROW
  EXECUTE PROCEDURE public.influencer_perfil_reativar_usuario_ao_ativar();

COMMENT ON FUNCTION public.influencer_perfil_reativar_usuario_ao_ativar() IS
  'Quando influencer_perfil passa a status ativo, reativa profiles (influencer/afiliado) desativado e registra histórico.';

COMMIT;
