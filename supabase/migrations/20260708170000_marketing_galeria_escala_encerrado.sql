-- Galeria de Fotos — escala (resumo + busca) e exclusão de fotos de prestadores encerrados.

BEGIN;

-- Colaborador elegível para fotos individuais (não encerrado).
CREATE OR REPLACE FUNCTION public._galeria_foto_prestador_elegivel(p_rh_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_rh_funcionario_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios rf
      WHERE rf.id = p_rh_funcionario_id
        AND rf.status IS DISTINCT FROM 'encerrado'
    );
$$;

REVOKE ALL ON FUNCTION public._galeria_foto_prestador_elegivel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._galeria_foto_prestador_elegivel(uuid) TO authenticated;

COMMENT ON FUNCTION public._galeria_foto_prestador_elegivel(uuid) IS
  'Fotos individuais da galeria só para rh_funcionarios com status diferente de encerrado.';

-- Limpeza única (somente marketing_fotos) — arquivos no Storage via Storage API (script ou fluxo de encerramento).
-- Supabase bloqueia DELETE direto em storage.objects (trigger storage.protect_delete).
CREATE OR REPLACE FUNCTION public.marketing_galeria_limpar_fotos_encerrados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.marketing_fotos mf
    USING public.rh_funcionarios rf
    WHERE mf.rh_funcionario_id = rf.id
      AND mf.tipo = 'prestador'
      AND rf.status = 'encerrado'
    RETURNING mf.id
  )
  SELECT count(*)::integer INTO v_count FROM deleted;
  RETURN coalesce(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.marketing_galeria_limpar_fotos_encerrados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketing_galeria_limpar_fotos_encerrados() TO authenticated;

COMMENT ON FUNCTION public.marketing_galeria_limpar_fotos_encerrados() IS
  'Remove linhas marketing_fotos de prestadores encerrados. Arquivos no bucket marketing-fotos-prestadores: usar Storage API (scripts/limpar-galeria-fotos-prestadores-encerrados.mjs).';

-- Limpeza de registros legados (storage separado — ver script).
SELECT public.marketing_galeria_limpar_fotos_encerrados();

-- Resumo de eventos com contagem (lista completa, leve).
CREATE OR REPLACE FUNCTION public.galeria_fotos_resumo_eventos()
RETURNS TABLE (
  id uuid,
  nome text,
  data_evento date,
  descricao text,
  ativo boolean,
  qtd_fotos bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.nome,
    e.data_evento,
    e.descricao,
    e.ativo,
    count(mf.id)::bigint AS qtd_fotos
  FROM public.marketing_eventos e
  INNER JOIN public.marketing_fotos mf
    ON mf.evento_id = e.id AND mf.tipo = 'geral'
  WHERE public._galeria_fotos_perm('view')
  GROUP BY e.id, e.nome, e.data_evento, e.descricao, e.ativo
  HAVING count(mf.id) > 0
  ORDER BY e.data_evento DESC, e.nome ASC;
$$;

REVOKE ALL ON FUNCTION public.galeria_fotos_resumo_eventos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.galeria_fotos_resumo_eventos() TO authenticated;

-- Resumo de colaboradores com fotos individuais (exclui encerrados).
CREATE OR REPLACE FUNCTION public.galeria_fotos_resumo_prestadores()
RETURNS TABLE (
  id uuid,
  nome text,
  qtd_fotos bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    rf.id,
    rf.nome,
    count(mf.id)::bigint AS qtd_fotos
  FROM public.rh_funcionarios rf
  INNER JOIN public.marketing_fotos mf
    ON mf.rh_funcionario_id = rf.id AND mf.tipo = 'prestador'
  WHERE rf.status IS DISTINCT FROM 'encerrado'
    AND public._galeria_foto_prestador_elegivel(rf.id)
    AND (
      public._galeria_fotos_perm('edit')
      OR public._galeria_fotos_perm('create')
      OR public._galeria_fotos_perm('delete')
      OR (
        public._galeria_fotos_perm('view')
        AND NOT public._galeria_fotos_ver_somente_proprio_prestador()
      )
      OR (
        public._galeria_fotos_ver_somente_proprio_prestador()
        AND rf.id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
      )
    )
  GROUP BY rf.id, rf.nome
  HAVING count(mf.id) > 0
  ORDER BY rf.nome ASC;
$$;

REVOKE ALL ON FUNCTION public.galeria_fotos_resumo_prestadores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.galeria_fotos_resumo_prestadores() TO authenticated;

-- Busca server-side (primeiro filtro); cliente aplica normalização PT-BR.
CREATE OR REPLACE FUNCTION public.galeria_fotos_buscar(p_termo text)
RETURNS TABLE (
  id uuid,
  evento_id uuid,
  tipo text,
  rh_funcionario_id uuid,
  storage_path text,
  file_name text,
  mime_type text,
  legenda text,
  visivel_prestador boolean,
  uploaded_by uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    mf.id,
    mf.evento_id,
    mf.tipo,
    mf.rh_funcionario_id,
    mf.storage_path,
    mf.file_name,
    mf.mime_type,
    mf.legenda,
    mf.visivel_prestador,
    mf.uploaded_by,
    mf.created_at
  FROM public.marketing_fotos mf
  LEFT JOIN public.marketing_eventos e ON e.id = mf.evento_id
  LEFT JOIN public.rh_funcionarios rf ON rf.id = mf.rh_funcionario_id
  WHERE length(trim(coalesce(p_termo, ''))) >= 2
    AND (
      mf.file_name ILIKE '%' || trim(p_termo) || '%'
      OR coalesce(mf.legenda, '') ILIKE '%' || trim(p_termo) || '%'
      OR coalesce(e.nome, '') ILIKE '%' || trim(p_termo) || '%'
      OR coalesce(rf.nome, '') ILIKE '%' || trim(p_termo) || '%'
    )
    AND (
      (
        mf.tipo = 'geral'
        AND public._galeria_fotos_perm('view')
      )
      OR (
        mf.tipo = 'prestador'
        AND public._galeria_foto_prestador_elegivel(mf.rh_funcionario_id)
        AND (
          public._galeria_fotos_perm('edit')
          OR public._galeria_fotos_perm('create')
          OR public._galeria_fotos_perm('delete')
          OR (
            public._galeria_fotos_perm('view')
            AND NOT public._galeria_fotos_ver_somente_proprio_prestador()
          )
          OR (
            public._galeria_fotos_ver_somente_proprio_prestador()
            AND mf.rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
          )
        )
      )
    )
  ORDER BY mf.created_at DESC, mf.id DESC;
$$;

REVOKE ALL ON FUNCTION public.galeria_fotos_buscar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.galeria_fotos_buscar(text) TO authenticated;

-- RLS: fotos de prestador encerrado nunca visíveis.
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
      AND public._galeria_foto_prestador_elegivel(rh_funcionario_id)
      AND (
        public._galeria_fotos_perm('edit')
        OR public._galeria_fotos_perm('create')
        OR public._galeria_fotos_perm('delete')
      )
    )
    OR (
      tipo = 'prestador'
      AND public._galeria_foto_prestador_elegivel(rh_funcionario_id)
      AND public._galeria_fotos_perm('view')
      AND NOT public._galeria_fotos_ver_somente_proprio_prestador()
    )
    OR (
      tipo = 'prestador'
      AND public._galeria_foto_prestador_elegivel(rh_funcionario_id)
      AND rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
      AND public._galeria_fotos_ver_somente_proprio_prestador()
    )
  );

DROP POLICY IF EXISTS rh_funcionarios_select_galeria_foto ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_select_galeria_foto ON public.rh_funcionarios
  FOR SELECT TO authenticated
  USING (
    public._galeria_fotos_perm('view')
    AND rh_funcionarios.status IS DISTINCT FROM 'encerrado'
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
            AND public._galeria_foto_prestador_elegivel(mf.rh_funcionario_id)
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.marketing_fotos mf
        WHERE mf.storage_path = objects.name
          AND mf.tipo = 'prestador'
          AND public._galeria_foto_prestador_elegivel(mf.rh_funcionario_id)
          AND mf.rh_funcionario_id IN (SELECT public._galeria_fotos_meus_rh_funcionario_ids())
          AND public._galeria_fotos_ver_somente_proprio_prestador()
      )
    )
  );

COMMENT ON COLUMN public.marketing_fotos.visivel_prestador IS
  'Reservado para liberação explícita futura; leitura e retenção não dependem desta coluna — fotos de encerrados são removidas.';

COMMIT;
