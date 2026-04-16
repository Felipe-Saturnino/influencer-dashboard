-- Modais: manutenção por tipo (costura/lavagem → manutenção; perda/descarte → descartada)
-- Devolução por fluxo (boa / possível descarte → disponível; manutenção → mesmas regras)

BEGIN;

-- ─── Manutenção: novo parâmetro p_tipo ───────────────────────────────────────
DROP FUNCTION IF EXISTS public.rh_figurino_enviar_manutencao(uuid, text, text);

CREATE OR REPLACE FUNCTION public.rh_figurino_enviar_manutencao(
  p_item_id uuid,
  p_tipo text,
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
  v_actor text := coalesce(nullif(trim(p_actor), ''), 'sistema');
  v_tipo text := lower(trim(coalesce(p_tipo, '')));
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_label text;
  v_reason text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001'; END IF;
  IF v_motivo = '' THEN RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001'; END IF;
  IF v_tipo NOT IN ('costura', 'lavagem', 'perda', 'descarte') THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  v_label := CASE v_tipo
    WHEN 'costura' THEN 'Costura'
    WHEN 'lavagem' THEN 'Lavagem'
    WHEN 'perda' THEN 'Perda'
    WHEN 'descarte' THEN 'Descarte'
    ELSE v_tipo
  END;
  v_reason := v_label || ' — ' || v_motivo;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001'; END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001'; END IF;
  IF peca.status <> 'available' THEN RAISE EXCEPTION 'rh_figurino_invalid_status' USING ERRCODE = 'P0001'; END IF;

  IF v_tipo IN ('costura', 'lavagem') THEN
    UPDATE public.rh_figurino_pecas
    SET
      status = 'maintenance',
      maintenance_reason = v_reason,
      maintenance_entered_at = now(),
      maintenance_entered_by = v_actor
    WHERE id = peca.id;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (peca.id, peca.status, 'maintenance', v_actor, v_reason);
  ELSE
    UPDATE public.rh_figurino_pecas
    SET
      status = 'discarded',
      discarded_at = now(),
      discard_reason = v_reason,
      discarded_by = v_actor,
      maintenance_reason = NULL,
      maintenance_entered_at = NULL,
      maintenance_entered_by = NULL
    WHERE id = peca.id;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (peca.id, peca.status, 'discarded', v_actor, v_reason);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_enviar_manutencao(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_enviar_manutencao(uuid, text, text, text) TO authenticated;

-- ─── Devolução: fluxo + manutenção opcional ──────────────────────────────────
DROP FUNCTION IF EXISTS public.rh_figurino_registrar_devolucao(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.rh_figurino_registrar_devolucao(
  p_item_id uuid,
  p_fluxo text,
  p_observacoes text,
  p_manut_tipo text,
  p_manut_motivo text,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
  emp  public.rh_figurino_emprestimos%ROWTYPE;
  v_actor text := coalesce(nullif(trim(p_actor), ''), 'sistema');
  v_fluxo text := lower(trim(coalesce(p_fluxo, '')));
  v_obs text := nullif(trim(coalesce(p_observacoes, '')), '');
  v_mt text := lower(trim(coalesce(p_manut_tipo, '')));
  v_mm text := trim(coalesce(p_manut_motivo, ''));
  v_label text;
  v_reason text;
  v_new_status text;
  v_hist_notes text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF v_fluxo NOT IN ('disponivel_bom', 'disponivel_possivel_descarte', 'manutencao') THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  IF v_fluxo = 'manutencao' THEN
    IF v_mt NOT IN ('costura', 'lavagem', 'perda', 'descarte') OR v_mm = '' THEN
      RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN
    RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
  END IF;
  IF peca.status <> 'borrowed' THEN
    RAISE EXCEPTION 'rh_figurino_not_borrowed' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO emp
  FROM public.rh_figurino_emprestimos
  WHERE item_id = peca.id AND status = 'active'
  ORDER BY loaned_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rh_figurino_no_active_loan' USING ERRCODE = 'P0001';
  END IF;

  IF v_fluxo = 'disponivel_bom' THEN
    UPDATE public.rh_figurino_emprestimos
    SET
      returned_at = now(),
      return_condition = 'good',
      return_notes = v_obs,
      returned_by = v_actor,
      status = 'returned'
    WHERE id = emp.id;

    UPDATE public.rh_figurino_pecas
    SET status = 'available', condition = 'good'
    WHERE id = peca.id;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (
      peca.id,
      peca.status,
      'available',
      v_actor,
      'Devolução: boa condição' || CASE WHEN v_obs IS NOT NULL THEN ' · ' || v_obs ELSE '' END
    );

  ELSIF v_fluxo = 'disponivel_possivel_descarte' THEN
    UPDATE public.rh_figurino_emprestimos
    SET
      returned_at = now(),
      return_condition = 'damaged',
      return_notes = v_obs,
      returned_by = v_actor,
      status = 'returned'
    WHERE id = emp.id;

    UPDATE public.rh_figurino_pecas
    SET status = 'available', condition = 'damaged'
    WHERE id = peca.id;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (
      peca.id,
      peca.status,
      'available',
      v_actor,
      'Devolução: possível descarte' || CASE WHEN v_obs IS NOT NULL THEN ' · ' || v_obs ELSE '' END
    );

  ELSE
    -- manutencao (devolução → manutenção ou descarte)
    v_label := CASE v_mt
      WHEN 'costura' THEN 'Costura'
      WHEN 'lavagem' THEN 'Lavagem'
      WHEN 'perda' THEN 'Perda'
      WHEN 'descarte' THEN 'Descarte'
      ELSE v_mt
    END;
    v_reason := v_label || ' — ' || v_mm;
    v_hist_notes := 'Devolução (manutenção): ' || v_reason || CASE WHEN v_obs IS NOT NULL THEN ' · Obs.: ' || v_obs ELSE '' END;

    UPDATE public.rh_figurino_emprestimos
    SET
      returned_at = now(),
      return_condition = 'damaged',
      return_notes = coalesce(v_obs, v_reason),
      returned_by = v_actor,
      status = 'returned'
    WHERE id = emp.id;

    IF v_mt IN ('costura', 'lavagem') THEN
      v_new_status := 'maintenance';
      UPDATE public.rh_figurino_pecas
      SET
        status = 'maintenance',
        condition = peca.condition,
        maintenance_reason = v_reason,
        maintenance_entered_at = now(),
        maintenance_entered_by = v_actor
      WHERE id = peca.id;
    ELSE
      v_new_status := 'discarded';
      UPDATE public.rh_figurino_pecas
      SET
        status = 'discarded',
        discarded_at = now(),
        discard_reason = v_reason,
        discarded_by = v_actor,
        maintenance_reason = NULL,
        maintenance_entered_at = NULL,
        maintenance_entered_by = NULL
      WHERE id = peca.id;
    END IF;

    INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
    VALUES (peca.id, peca.status, v_new_status, v_actor, v_hist_notes);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_registrar_devolucao(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_registrar_devolucao(uuid, text, text, text, text, text) TO authenticated;

COMMIT;
