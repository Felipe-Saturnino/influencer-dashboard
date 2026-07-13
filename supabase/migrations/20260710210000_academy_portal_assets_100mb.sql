-- Portal da Academy — limite de upload do bucket academy-portal-assets: 50 MB → 100 MB

BEGIN;

UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'academy-portal-assets';

COMMIT;
