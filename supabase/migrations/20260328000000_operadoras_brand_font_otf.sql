-- Adiciona font/otf e application/octet-stream ao bucket operadoras-brand
-- .otf (OpenType) é comum ao baixar fontes; Windows costuma reportar como application/octet-stream

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
  'font/woff2',
  'font/woff',
  'font/ttf',
  'font/otf',
  'application/octet-stream'
]
WHERE id = 'operadoras-brand';
