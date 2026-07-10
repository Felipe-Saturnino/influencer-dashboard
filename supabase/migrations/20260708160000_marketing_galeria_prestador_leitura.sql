-- Galeria de Fotos — leitura de fotos individuais (Minhas Fotos) sem visivel_prestador.
-- 1) Prestador com só Ver: vê as próprias (vínculo e-mail/login).
-- 2) Demais perfis com Ver na galeria (Marketing, gestor, admin…): veem todas as fotos prestador.
-- 3) Reafirma políticas de embed (evento/colaborador) para joins PostgREST.

BEGIN;

CREATE OR REPLACE FUNCTION public._galeria_fotos_ver_somente_proprio_prestador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public._galeria_fotos_perm('view')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'prestador'
    )
    AND NOT (
      public._galeria_fotos_perm('edit')
      OR public._galeria_fotos_perm('create')
      OR public._galeria_fotos_perm('delete')
    );
$$;

COMMENT ON FUNCTION public._galeria_fotos_ver_somente_proprio_prestador() IS
  'Prestador com só Ver na galeria — Minhas Fotos limitadas ao rh_funcionario do login.';

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
      OR NOT public._galeria_fotos_ver_somente_proprio_prestador()
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
      AND public._galeria_fotos_perm('view')
      AND NOT public._galeria_fotos_ver_somente_proprio_prestador()
    )
    OR (
      tipo = 'prestador'
      AND rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
      AND public._galeria_fotos_ver_somente_proprio_prestador()
    )
  );

DROP POLICY IF EXISTS marketing_fotos_prestadores_storage_select ON storage.objects;
CREATE POLICY marketing_fotos_prestadores_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'marketing-fotos-prestadores'
    AND (
      public._galeria_fotos_perm('edit')
      OR public._galeria_fotos_perm('create')
      OR public._galeria_fotos_perm('delete')
      OR (
        public._galeria_fotos_perm('view')
        AND NOT public._galeria_fotos_ver_somente_proprio_prestador()
        AND EXISTS (
          SELECT 1
          FROM public.marketing_fotos mf
          WHERE mf.storage_path = objects.name
            AND mf.tipo = 'prestador'
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.marketing_fotos mf
        WHERE mf.storage_path = objects.name
          AND mf.tipo = 'prestador'
          AND mf.rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
          AND public._galeria_fotos_ver_somente_proprio_prestador()
      )
    )
  );

COMMENT ON COLUMN public.marketing_fotos.visivel_prestador IS
  'Reservado para liberação explícita futura; leitura na galeria não depende desta coluna.';

COMMIT;
