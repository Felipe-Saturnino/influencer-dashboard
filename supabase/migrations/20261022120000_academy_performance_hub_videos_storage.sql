-- Performance Hub — bucket de vídeos das avaliações

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academy-performance-hub-videos',
  'academy-performance-hub-videos',
  false,
  104857600,
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS academy_performance_hub_videos_select ON storage.objects;
CREATE POLICY academy_performance_hub_videos_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'academy-performance-hub-videos'
    AND public._academy_performance_hub_perm('view')
  );

DROP POLICY IF EXISTS academy_performance_hub_videos_insert ON storage.objects;
CREATE POLICY academy_performance_hub_videos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academy-performance-hub-videos'
    AND public._academy_performance_hub_perm('edit')
  );

DROP POLICY IF EXISTS academy_performance_hub_videos_update ON storage.objects;
CREATE POLICY academy_performance_hub_videos_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academy-performance-hub-videos'
    AND public._academy_performance_hub_perm('edit')
  )
  WITH CHECK (
    bucket_id = 'academy-performance-hub-videos'
    AND public._academy_performance_hub_perm('edit')
  );

DROP POLICY IF EXISTS academy_performance_hub_videos_delete ON storage.objects;
CREATE POLICY academy_performance_hub_videos_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'academy-performance-hub-videos'
    AND public._academy_performance_hub_perm('edit')
  );

COMMIT;
