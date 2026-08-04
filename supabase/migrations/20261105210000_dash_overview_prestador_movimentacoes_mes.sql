-- Overview Prestador: movimentações Marketplace (contraparte) por prestador/mês.

BEGIN;

CREATE OR REPLACE FUNCTION public.dash_overview_prestador_movimentacoes_mes(
  p_funcionario_id uuid,
  p_ref_mes date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_out jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_funcionario_id IS NULL OR p_ref_mes IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF NOT public._rh_calendario_pode_acessar_funcionario(p_funcionario_id) THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Snapshot por dia do prestador (ofertas aceitas). Não exige match com valor
  -- atual da grade — o Detalhamento só usa o dia se a célula ainda for Troca/Venda/Compra.
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'funcionario_id', c.funcionario_id,
        'dia_iso', c.dia_iso,
        'tipo', c.tipo,
        'contraparte_nome', c.contraparte_nome,
        'turno_trabalhar', c.turno_trabalhar,
        'estudio_trabalhar', c.estudio_trabalhar,
        'valor_esperado', c.valor_esperado
      )
      ORDER BY c.dia_iso
    ),
    '[]'::jsonb
  )
  INTO v_out
  FROM public.escala_marketplace_celula_comentario c
  INNER JOIN public.escala_marketplace_oferta o ON o.id = c.oferta_id
  WHERE c.funcionario_id = p_funcionario_id
    AND date_trunc('month', c.dia_iso)::date = v_ref
    AND o.status = 'aceita';

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.dash_overview_prestador_movimentacoes_mes(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dash_overview_prestador_movimentacoes_mes(uuid, date) TO authenticated;

COMMENT ON FUNCTION public.dash_overview_prestador_movimentacoes_mes(uuid, date) IS
  'Snapshot Marketplace (contraparte Troca/Venda/Compra) do prestador no mês — Overview Prestador.';

COMMIT;
