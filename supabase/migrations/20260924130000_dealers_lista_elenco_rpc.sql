-- RPC dealers_lista_elenco — depende de _rh_org_time_nome_eh_game_presenter (20260924120000).

BEGIN;

CREATE OR REPLACE FUNCTION public.dealers_lista_elenco()
RETURNS SETOF public.dealers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.*
  FROM public.dealers d
  INNER JOIN public.rh_funcionarios f ON f.id = d.rh_funcionario_id
  INNER JOIN public.rh_org_times t ON t.id = f.org_time_id
  WHERE f.status IN ('ativo', 'indisponivel')
    AND lower(coalesce(t.status, '')) = 'ativo'
    AND public._rh_org_time_nome_eh_game_presenter(t.nome);
$$;

REVOKE ALL ON FUNCTION public.dealers_lista_elenco() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dealers_lista_elenco() TO authenticated;

COMMENT ON FUNCTION public.dealers_lista_elenco() IS
  'Gestão de Dealers: elenco sincronizado — GP ativo/indisponível. SECURITY DEFINER para não exigir rh_funcionarios no cliente.';

COMMIT;
