-- Galeria de Fotos — metadados para embed (evento/colaborador) sem depender de permissão RH completa.
-- Reafirma RLS de marketing_fotos sem exigir visivel_prestador (default false é esperado).

BEGIN;

DROP POLICY IF EXISTS marketing_eventos_select_galeria_foto_vinculada ON public.marketing_eventos;
CREATE POLICY marketing_eventos_select_galeria_foto_vinculada ON public.marketing_eventos
  FOR SELECT TO authenticated
  USING (
    public._galeria_fotos_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.marketing_fotos mf
      WHERE mf.evento_id = marketing_eventos.id
        AND mf.tipo = 'geral'
    )
  );

DROP POLICY IF EXISTS rh_funcionarios_select_galeria_foto ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_select_galeria_foto ON public.rh_funcionarios
  FOR SELECT TO authenticated
  USING (
    public._galeria_fotos_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.marketing_fotos mf
      WHERE mf.rh_funcionario_id = rh_funcionarios.id
        AND mf.tipo = 'prestador'
    )
    AND (
      public._galeria_fotos_perm('edit')
      OR public._galeria_fotos_perm('create')
      OR public._galeria_fotos_perm('delete')
      OR (
        public._galeria_fotos_ver_somente_proprio_prestador()
        AND rh_funcionarios.id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
      )
    )
  );

DROP POLICY IF EXISTS marketing_fotos_select ON public.marketing_fotos;
CREATE POLICY marketing_fotos_select ON public.marketing_fotos
  FOR SELECT TO authenticated
  USING (
    (
      tipo = 'geral'
      AND public._galeria_fotos_perm('view')
    )
    OR (
      tipo = 'prestador'
      AND (
        public._galeria_fotos_perm('edit')
        OR public._galeria_fotos_perm('create')
        OR public._galeria_fotos_perm('delete')
      )
    )
    OR (
      tipo = 'prestador'
      AND rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
      AND public._galeria_fotos_ver_somente_proprio_prestador()
    )
  );

COMMENT ON COLUMN public.marketing_fotos.visivel_prestador IS
  'Reservado para liberação explícita futura; leitura na galeria não depende desta coluna (vínculo rh_funcionario + login ou permissão de edição).';

COMMIT;
