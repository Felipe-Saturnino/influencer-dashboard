-- Prestador com status encerrado → desativa o profile vinculado (e-mail Spin ou e-mail pessoal).

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_desativar_profile_de_funcionario(p_email text, p_email_spin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT p.id
  INTO v_profile_id
  FROM public.profiles p
  WHERE p.ativo IS DISTINCT FROM false
    AND (
      (
        trim(coalesce(p_email_spin, '')) <> ''
        AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(p_email_spin, '')))
      )
      OR (
        trim(coalesce(p_email, '')) <> ''
        AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(p_email, '')))
      )
    )
  ORDER BY p.created_at NULLS LAST
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    UPDATE public.profiles SET ativo = false WHERE id = v_profile_id;
  END IF;

  RETURN v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public._rh_desativar_profile_de_funcionario(text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.rh_funcionario_encerrado_desativa_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'encerrado' AND (OLD.status IS DISTINCT FROM 'encerrado') THEN
    PERFORM public._rh_desativar_profile_de_funcionario(NEW.email, NEW.email_spin);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_funcionario_encerrado_desativa_usuario ON public.rh_funcionarios;

CREATE TRIGGER trg_rh_funcionario_encerrado_desativa_usuario
  AFTER UPDATE OF status ON public.rh_funcionarios
  FOR EACH ROW
  EXECUTE PROCEDURE public.rh_funcionario_encerrado_desativa_usuario();

COMMENT ON FUNCTION public._rh_desativar_profile_de_funcionario(text, text) IS
  'Desativa profiles.ativo do usuário cujo e-mail de login coincide com email_spin ou email do prestador.';

COMMIT;
