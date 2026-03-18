-- Thumbnails para postagens (Instagram, Facebook)
-- Usado no bloco "Postagens Recentes" do Dashboard de Mídias Sociais

ALTER TABLE instagram_posts
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE facebook_posts
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

COMMENT ON COLUMN instagram_posts.thumbnail_url IS 'URL da imagem/miniatura do post (media_url ou thumbnail_url da API)';
COMMENT ON COLUMN facebook_posts.thumbnail_url IS 'URL da imagem do post (full_picture da API)';
