-- Retirada: tipo emprestar vs fixo (consolidados e registo)

BEGIN;

ALTER TABLE public.rh_figurino_emprestimos
  ADD COLUMN IF NOT EXISTS withdrawal_type text DEFAULT 'emprestar';

UPDATE public.rh_figurino_emprestimos
SET withdrawal_type = 'emprestar'
WHERE withdrawal_type IS NULL OR trim(withdrawal_type) = '';

ALTER TABLE public.rh_figurino_emprestimos
  ALTER COLUMN withdrawal_type SET NOT NULL;

ALTER TABLE public.rh_figurino_emprestimos
  ALTER COLUMN withdrawal_type SET DEFAULT 'emprestar';

ALTER TABLE public.rh_figurino_emprestimos
  DROP CONSTRAINT IF EXISTS rh_figurino_emprestimos_withdrawal_type_check;

ALTER TABLE public.rh_figurino_emprestimos
  ADD CONSTRAINT rh_figurino_emprestimos_withdrawal_type_check
  CHECK (withdrawal_type IN ('emprestar', 'fixo'));

COMMENT ON COLUMN public.rh_figurino_emprestimos.withdrawal_type IS 'Retirada ativa: emprestar ou fixo.';

DROP FUNCTION IF EXISTS public.rh_figurino_registrar_emprestimo(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.rh_figurino_registrar_emprestimo(
  p_item_id uuid,
  p_borrower_name text,
  p_borrower_ref text,
  p_withdrawal_type text,
  p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  peca public.rh_figurino_pecas%ROWTYPE;
  v_wd text := lower(trim(coalesce(p_withdrawal_type, '')));
  v_actor text := coalesce(nullif(trim(p_actor), ''), 'sistema');
  v_note text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF trim(coalesce(p_borrower_name, '')) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF v_wd NOT IN ('emprestar', 'fixo') THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO peca FROM public.rh_figurino_pecas WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rh_figurino_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public._rh_figurino_user_can_access_peca_id(peca.id) THEN
    RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
  END IF;
  IF peca.status <> 'available' THEN
    RAISE EXCEPTION 'rh_figurino_not_available' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rh_figurino_emprestimos e WHERE e.item_id = peca.id AND e.status = 'active') THEN
    RAISE EXCEPTION 'rh_figurino_already_borrowed' USING ERRCODE = 'P0001';
  END IF;

  v_note := CASE WHEN v_wd = 'fixo' THEN 'Retirada (fixo)' ELSE 'Retirada (emprestar)' END;

  INSERT INTO public.rh_figurino_emprestimos (item_id, borrower_name, borrower_ref, loaned_by, status, withdrawal_type)
  VALUES (
    peca.id,
    trim(p_borrower_name),
    nullif(trim(coalesce(p_borrower_ref, '')), ''),
    v_actor,
    'active',
    v_wd
  );

  UPDATE public.rh_figurino_pecas SET status = 'borrowed' WHERE id = peca.id;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (peca.id, peca.status, 'borrowed', v_actor, v_note);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_registrar_emprestimo(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_registrar_emprestimo(uuid, text, text, text, text) TO authenticated;

COMMIT;
