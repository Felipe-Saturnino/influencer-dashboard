-- Hora real da publicação (APIs) para o carrossel "Postagens recentes"
ALTER TABLE instagram_posts  ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE facebook_posts   ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE youtube_videos   ADD COLUMN IF NOT EXISTS published_at timestamptz;

COMMENT ON COLUMN instagram_posts.published_at IS 'timestamp da API Instagram Graph (media)';
COMMENT ON COLUMN facebook_posts.published_at IS 'created_time da API Graph (post)';
COMMENT ON COLUMN youtube_videos.published_at IS 'snippet.publishedAt da YouTube Data API';
