-- Quem enviou para manutenção / quem descartou (exibição nas tabelas)

BEGIN;

ALTER TABLE public.rh_figurino_pecas ADD COLUMN IF NOT EXISTS maintenance_entered_by text;
ALTER TABLE public.rh_figurino_pecas ADD COLUMN IF NOT EXISTS discarded_by text;

CREATE OR REPLACE FUNCTION public.rh_figurino_enviar_manutencao(
  p_item_id uuid,
  p_motivo text,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001'; END IF;
  IF trim(coalesce(p_motivo, '')) = '' THEN RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001'; END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
  IF peca.status <> 'available' THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  UPDATE public.rh_figurino_pecas
  SET
    status = 'maintenance',
    maintenance_reason = trim(p_motivo),
    maintenance_entered_at = now(),
    maintenance_entered_by = coalesce(nullif(trim(p_actor), ''), 'sistema')
  WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'maintenance', coalesce(nullif(trim(p_actor), ''), 'sistema'), trim(p_motivo));
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_figurino_concluir_manutencao(
  p_item_id uuid,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001'; END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
  IF peca.status <> 'maintenance' THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  UPDATE public.rh_figurino_pecas
  SET
    status = 'available',
    maintenance_reason = NULL,
    maintenance_entered_at = NULL,
    maintenance_entered_by = NULL
  WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'available', coalesce(nullif(trim(p_actor), ''), 'sistema'), 'Manutenção concluída');
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_figurino_descartar(
  p_item_id uuid,
  p_motivo text,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001'; END IF;
  IF trim(coalesce(p_motivo, '')) = '' THEN RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001'; END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
  IF peca.status NOT IN ('available', 'maintenance') THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  UPDATE public.rh_figurino_pecas
  SET
    status = 'discarded',
    discarded_at = now(),
    discard_reason = trim(p_motivo),
    discarded_by = coalesce(nullif(trim(p_actor), ''), 'sistema')
  WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'discarded', coalesce(nullif(trim(p_actor), ''), 'sistema'), trim(p_motivo));
END;
$$;

COMMENT ON COLUMN public.rh_figurino_pecas.maintenance_entered_by IS 'Utilizador que registrou envio à manutenção.';
COMMENT ON COLUMN public.rh_figurino_pecas.discarded_by IS 'Utilizador que registrou o descarte.';

COMMIT;
