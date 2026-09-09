-- Tech Ops — Ordem de Saída: corrige RPC de código (competencia ambígua).
-- Erro ao Solicitar: column reference "competencia" is ambiguous
-- (OUT param de RETURNS TABLE vs coluna de tech_ops_ordem_saida_codigo_counters).

BEGIN;

CREATE OR REPLACE FUNCTION public.tech_ops_ordem_saida_proximo_codigo(
  p_tipo text,
  p_competencia date DEFAULT NULL
)
RETURNS TABLE (codigo_num int, competencia date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp date;
  v_num int;
BEGIN
  IF p_tipo NOT IN ('interna', 'externa', 'manutencao') THEN
    RAISE EXCEPTION 'tipo inválido';
  END IF;
  IF NOT public._tech_ops_ordem_saida_pode_nova() THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;

  v_comp := date_trunc('month', COALESCE(p_competencia, CURRENT_DATE))::date;

  INSERT INTO public.tech_ops_ordem_saida_codigo_counters AS ctr (tipo, competencia, ultimo_num)
  VALUES (p_tipo, v_comp, 1)
  ON CONFLICT ON CONSTRAINT tech_ops_ordem_saida_codigo_counters_pkey DO UPDATE
    SET ultimo_num = ctr.ultimo_num + 1
  RETURNING ctr.ultimo_num INTO v_num;

  codigo_num := v_num;
  competencia := v_comp;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.tech_ops_ordem_saida_proximo_codigo(text, date) IS
  'Reserva próximo codigo_num da OS por tipo/competência. Evita ambiguidade do OUT competencia com a coluna do counter.';

COMMIT;
