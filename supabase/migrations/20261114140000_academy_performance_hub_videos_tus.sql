-- Performance Hub — TUS (vídeos grandes) precisa de INSERT + UPDATE no Storage.
-- A migration 20261029180000 removeu UPDATE/DELETE; o upload simples (INSERT)
-- ainda passava em arquivos pequenos, mas o TUS em ~300 MB falhava no PATCH.

BEGIN;

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 524288000,
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
CREATE POLICY academy_performance_hub_videos_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academy-performance-hub-videos'
    AND (
      public._academy_performance_hub_perm('edit')
      OR public._academy_performance_hub_perm('create')
    )
  )
  WITH CHECK (
    bucket_id = 'academy-performance-hub-videos'
    AND (
      public._academy_performance_hub_perm('edit')
      OR public._academy_performance_hub_perm('create')
    )
  );

DROP POLICY IF EXISTS academy_performance_hub_videos_delete ON storage.objects;
CREATE POLICY academy_performance_hub_videos_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'academy-performance-hub-videos'
    AND (
      public._academy_performance_hub_perm('edit')
      OR public._academy_performance_hub_perm('create')
    )
  );

COMMIT;
