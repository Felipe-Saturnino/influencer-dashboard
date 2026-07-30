-- Performance Hub — correção do bucket de vídeos
-- (limite 200 MB, MIME aberto, upload com Editar ou Criar)

BEGIN;

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 209715200,
  allowed_mime_types = NULL
WHERE id = 'academy-performance-hub-videos';

DROP POLICY IF EXISTS academy_performance_hub_videos_insert ON storage.objects;
CREATE POLICY academy_performance_hub_videos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academy-performance-hub-videos'
    AND (
      public._academy_performance_hub_perm('edit')
      OR public._academy_performance_hub_perm('create')
    )
  );

DROP POLICY IF EXISTS academy_performance_hub_videos_update ON storage.objects;
DROP POLICY IF EXISTS academy_performance_hub_videos_delete ON storage.objects;

COMMIT;
