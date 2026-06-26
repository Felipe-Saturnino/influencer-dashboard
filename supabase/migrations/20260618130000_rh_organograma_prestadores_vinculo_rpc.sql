-- Organograma (Visualização): prestadores com Ver em rh_organograma veem nomes e vínculos
-- de todos os colegas ativos/indisponíveis, sem expor salário, CPF ou demais dados sensíveis.

BEGIN;

CREATE OR REPLACE FUNCTION public.rh_organograma_prestadores_vinculo()
RETURNS TABLE (
  id uuid,
  nome text,
  org_time_id uuid,
  org_gerencia_id uuid,
  org_diretoria_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._rh_organograma_perm('view') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.nome,
    f.org_time_id,
    f.org_gerencia_id,
    f.org_diretoria_id
  FROM public.rh_funcionarios f
  WHERE f.status IN ('ativo', 'indisponivel')
  ORDER BY f.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_organograma_prestadores_vinculo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_organograma_prestadores_vinculo() TO authenticated;

COMMENT ON FUNCTION public.rh_organograma_prestadores_vinculo() IS
  'Lista id, nome e vínculos de organograma dos prestadores ativos/indisponíveis para a página Organograma. Requer Ver em rh_organograma.';

COMMIT;
