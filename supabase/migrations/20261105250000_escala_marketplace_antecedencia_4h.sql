-- Marketplace — antecedência mínima de publicação: 24h → 4h até o início do turno.

BEGIN;

CREATE OR REPLACE FUNCTION public.escala_marketplace_oferta_criar(
  p_tipo text,
  p_dia_iso date,
  p_valor_celula text,
  p_turno_label text DEFAULT NULL,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_id uuid;
  v_inicio timestamptz;
  v_fid uuid;
  v_turno text;
BEGIN
  v_result := public._escala_marketplace_oferta_criar_sem_inicio_2h(
    p_tipo,
    p_dia_iso,
    p_valor_celula,
    p_turno_label,
    p_observacao
  );
  IF COALESCE((v_result ->> 'ok')::boolean, false) IS NOT TRUE THEN
    RETURN v_result;
  END IF;

  v_id := (v_result ->> 'id')::uuid;
  SELECT o.ofertante_funcionario_id, o.turno_label
  INTO v_fid, v_turno
  FROM public.escala_marketplace_oferta o
  WHERE o.id = v_id
  FOR UPDATE;

  -- Usa o turno validado/congelado pela RPC interna, não o argumento do cliente.
  v_inicio := public._escala_marketplace_inicio_turno(v_fid, p_dia_iso, v_turno);
  IF v_inicio IS NULL THEN
    DELETE FROM public.escala_marketplace_oferta WHERE id = v_id;
    RETURN jsonb_build_object('ok', false, 'error', 'horario_turno_indisponivel');
  END IF;

  IF v_inicio < now() + interval '4 hours' THEN
    DELETE FROM public.escala_marketplace_oferta WHERE id = v_id;
    RETURN jsonb_build_object('ok', false, 'error', 'antecedencia_minima');
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET inicio_turno_at = v_inicio
  WHERE id = v_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) IS
  'Marketplace: cria oferta. Exige ≥4h até o início do turno (inicio_turno_at) e congela o horário para expiração 2h.';

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text)
  TO authenticated;

COMMIT;
