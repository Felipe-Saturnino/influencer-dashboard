-- Cota operacional de horas do influencer (independente do ciclo de pagamento).
-- Novos influencers nascem Inativos (Scout / Gestão de Usuários) até ativação com horas acordadas.

BEGIN;

ALTER TABLE public.influencer_perfil
  ADD COLUMN IF NOT EXISTS horas_acordadas numeric,
  ADD COLUMN IF NOT EXISTS horas_ciclo_iniciado_em timestamptz;

COMMENT ON COLUMN public.influencer_perfil.horas_acordadas IS
  'Cota de horas do ciclo operacional atual (não é o ciclo de pagamento). Null quando Inativo/Cancelado.';
COMMENT ON COLUMN public.influencer_perfil.horas_ciclo_iniciado_em IS
  'Início da cota atual (momento da ativação). Null quando Inativo/Cancelado.';

-- Limpa a cota ao inativar/cancelar; exige horas ao ativar influencer (não afiliado).
CREATE OR REPLACE FUNCTION public.influencer_perfil_horas_cota_before_upd()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF NEW.status IN ('inativo', 'cancelado') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.horas_acordadas := NULL;
    NEW.horas_ciclo_iniciado_em := NULL;
  END IF;

  IF NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ativo') THEN
    SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = NEW.id;
    IF v_role = 'influencer' THEN
      IF NEW.horas_acordadas IS NULL OR NEW.horas_acordadas <= 0 THEN
        RAISE EXCEPTION 'Informe as horas acordadas para ativar o influencer.'
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.horas_ciclo_iniciado_em IS NULL THEN
        NEW.horas_ciclo_iniciado_em := now();
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_influencer_perfil_horas_cota_before ON public.influencer_perfil;
CREATE TRIGGER trg_influencer_perfil_horas_cota_before
  BEFORE INSERT OR UPDATE OF status, horas_acordadas, horas_ciclo_iniciado_em ON public.influencer_perfil
  FOR EACH ROW
  EXECUTE PROCEDURE public.influencer_perfil_horas_cota_before_upd();

-- Inativa quando as horas validadas da cota atual atingem o acordado.
CREATE OR REPLACE FUNCTION public.influencer_perfil_reavaliar_cota_horas(p_influencer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_acordadas numeric;
  v_ciclo timestamptz;
  v_ciclo_data date;
  v_realizadas numeric;
  v_role text;
BEGIN
  IF p_influencer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT ip.status, ip.horas_acordadas, ip.horas_ciclo_iniciado_em, p.role
    INTO v_status, v_acordadas, v_ciclo, v_role
  FROM public.influencer_perfil ip
  INNER JOIN public.profiles p ON p.id = ip.id
  WHERE ip.id = p_influencer_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF v_role IS DISTINCT FROM 'influencer' THEN
    RETURN;
  END IF;
  IF v_status IS DISTINCT FROM 'ativo' THEN
    RETURN;
  END IF;
  IF v_acordadas IS NULL OR v_acordadas <= 0 OR v_ciclo IS NULL THEN
    RETURN;
  END IF;

  v_ciclo_data := (v_ciclo AT TIME ZONE 'America/Sao_Paulo')::date;

  SELECT COALESCE(SUM(COALESCE(lr.duracao_horas, 0) + COALESCE(lr.duracao_min, 0) / 60.0), 0)
    INTO v_realizadas
  FROM public.lives l
  INNER JOIN public.live_resultados lr ON lr.live_id = l.id
  WHERE l.influencer_id = p_influencer_id
    AND l.status = 'realizada'
    AND l.data >= v_ciclo_data;

  IF v_realizadas >= v_acordadas THEN
    UPDATE public.influencer_perfil
    SET
      status = 'inativo',
      status_alterado_em = now(),
      updated_at = now()
    WHERE id = p_influencer_id
      AND status = 'ativo';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.influencer_perfil_reavaliar_cota_horas(uuid) IS
  'Se o influencer ativo cumpriu a cota de horas validadas do ciclo operacional, passa a Inativo e limpa a cota.';

CREATE OR REPLACE FUNCTION public.live_resultados_reavaliar_cota_horas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inf uuid;
BEGIN
  SELECT l.influencer_id INTO v_inf
  FROM public.lives l
  WHERE l.id = NEW.live_id
    AND l.status = 'realizada';

  IF v_inf IS NOT NULL THEN
    PERFORM public.influencer_perfil_reavaliar_cota_horas(v_inf);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_resultados_reavaliar_cota ON public.live_resultados;
CREATE TRIGGER trg_live_resultados_reavaliar_cota
  AFTER INSERT OR UPDATE OF duracao_horas, duracao_min ON public.live_resultados
  FOR EACH ROW
  EXECUTE PROCEDURE public.live_resultados_reavaliar_cota_horas();

CREATE OR REPLACE FUNCTION public.lives_reavaliar_cota_horas_ao_realizar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'realizada' AND OLD.status IS DISTINCT FROM 'realizada' THEN
    PERFORM public.influencer_perfil_reavaliar_cota_horas(NEW.influencer_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lives_reavaliar_cota_ao_realizar ON public.lives;
CREATE TRIGGER trg_lives_reavaliar_cota_ao_realizar
  AFTER UPDATE OF status ON public.lives
  FOR EACH ROW
  EXECUTE PROCEDURE public.lives_reavaliar_cota_horas_ao_realizar();

-- Impede Nova Live para cadastro Inativo/Cancelado (UPDATE de lives já agendadas permanece).
CREATE OR REPLACE FUNCTION public.lives_bloquear_influencer_inativo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.influencer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ip.status INTO v_status
  FROM public.influencer_perfil ip
  WHERE ip.id = NEW.influencer_id;

  IF v_status IN ('inativo', 'cancelado') THEN
    RAISE EXCEPTION 'influencer_cadastro_inativo'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lives_bloquear_influencer_inativo ON public.lives;
CREATE TRIGGER trg_lives_bloquear_influencer_inativo
  BEFORE INSERT ON public.lives
  FOR EACH ROW
  EXECUTE PROCEDURE public.lives_bloquear_influencer_inativo();

COMMIT;
