-- Galeria de Fotos — ao encerrar prestador, remove fotos individuais (Minhas Fotos).
-- RPC SECURITY DEFINER: RH com edição em Gestão de Prestadores pode limpar storage + linhas.
-- Trigger: garante limpeza na tabela se o status mudar por outro caminho.

BEGIN;

CREATE OR REPLACE FUNCTION public.marketing_galeria_excluir_fotos_prestador(p_rh_funcionario_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  IF p_rh_funcionario_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Gestão de Prestadores (editar) OU gestão da Galeria (excluir).
  IF NOT (
    public._rh_funcionario_perm('edit')
    OR public._galeria_fotos_perm('delete')
  ) THEN
    RAISE EXCEPTION 'sem permissão para remover fotos do prestador';
  END IF;

  FOR r IN
    SELECT id, storage_path
    FROM public.marketing_fotos
    WHERE tipo = 'prestador'
      AND rh_funcionario_id = p_rh_funcionario_id
  LOOP
    DELETE FROM storage.objects
    WHERE bucket_id = 'marketing-fotos-prestadores'
      AND name = r.storage_path;
    DELETE FROM public.marketing_fotos WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.marketing_galeria_excluir_fotos_prestador(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketing_galeria_excluir_fotos_prestador(uuid) TO authenticated;

COMMENT ON FUNCTION public.marketing_galeria_excluir_fotos_prestador(uuid) IS
  'Remove fotos individuais (Minhas Fotos) de um colaborador — storage + marketing_fotos. Usado no término de prestação.';

CREATE OR REPLACE FUNCTION public.marketing_fotos_ao_encerrar_prestador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  r record;
BEGIN
  IF NEW.status = 'encerrado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'encerrado') THEN
    FOR r IN
      SELECT id, storage_path
      FROM public.marketing_fotos
      WHERE tipo = 'prestador'
        AND rh_funcionario_id = NEW.id
    LOOP
      DELETE FROM storage.objects
      WHERE bucket_id = 'marketing-fotos-prestadores'
        AND name = r.storage_path;
      DELETE FROM public.marketing_fotos WHERE id = r.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_fotos_ao_encerrar_prestador ON public.rh_funcionarios;
CREATE TRIGGER trg_marketing_fotos_ao_encerrar_prestador
  AFTER INSERT OR UPDATE OF status ON public.rh_funcionarios
  FOR EACH ROW
  EXECUTE PROCEDURE public.marketing_fotos_ao_encerrar_prestador();

COMMENT ON FUNCTION public.marketing_fotos_ao_encerrar_prestador() IS
  'Ao marcar rh_funcionarios.status = encerrado, remove fotos da Galeria (storage + marketing_fotos).';

COMMIT;
