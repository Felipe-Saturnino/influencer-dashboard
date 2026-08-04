-- Overview Prestador: incluir tipo da oferta (venda_turno / venda_folga / oferta_troca)
-- no snapshot de movimentações — necessário para o gráfico Turnos Vendidos / Folgas Vendidas / Trocas.

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

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'funcionario_id', c.funcionario_id,
        'dia_iso', c.dia_iso,
        'tipo', c.tipo,
        'tipo_oferta', o.tipo,
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

COMMENT ON FUNCTION public.dash_overview_prestador_movimentacoes_mes(uuid, date) IS
  'Snapshot Marketplace (contraparte + tipo_oferta) do prestador no mês — Overview Prestador.';

COMMIT;
