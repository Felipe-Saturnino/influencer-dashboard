-- Galeria de Fotos — RPC/trigger sem DELETE em storage.objects (Supabase exige Storage API).

BEGIN;

CREATE OR REPLACE FUNCTION public.marketing_galeria_excluir_fotos_prestador(p_rh_funcionario_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_rh_funcionario_id IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT (
    public._rh_funcionario_perm('edit')
    OR public._galeria_fotos_perm('delete')
  ) THEN
    RAISE EXCEPTION 'sem permissão para remover fotos do prestador';
  END IF;

  WITH deleted AS (
    DELETE FROM public.marketing_fotos
    WHERE tipo = 'prestador'
      AND rh_funcionario_id = p_rh_funcionario_id
    RETURNING id
  )
  SELECT count(*)::integer INTO v_count FROM deleted;

  RETURN coalesce(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.marketing_galeria_excluir_fotos_prestador(uuid) IS
  'Remove linhas marketing_fotos (Minhas Fotos) de um colaborador. Arquivos no bucket: remover via Storage API antes ou depois (cliente excluirMarketingFotosDoPrestador).';

CREATE OR REPLACE FUNCTION public.marketing_fotos_ao_encerrar_prestador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'encerrado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'encerrado') THEN
    DELETE FROM public.marketing_fotos
    WHERE tipo = 'prestador'
      AND rh_funcionario_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.marketing_fotos_ao_encerrar_prestador() IS
  'Ao marcar rh_funcionarios.status = encerrado, remove linhas marketing_fotos. Storage: Storage API (fluxo Gestão de Prestadores ou script de limpeza).';

COMMIT;
