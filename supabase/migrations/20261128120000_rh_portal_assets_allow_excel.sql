-- Portal RH — bucket rh-portal-assets: permitir anexos Excel (.xls / .xlsx).
-- Colar no SQL Editor: scripts/COLE-NO-SUPABASE-rh-portal-assets-excel.sql

BEGIN;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]::text[]
WHERE id = 'rh-portal-assets';

COMMIT;
