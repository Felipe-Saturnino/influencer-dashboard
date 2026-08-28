-- =============================================================================
-- SUPABASE → SQL Editor → New query → cole TUDO → Run
--
-- Portal RH — libera Excel (.xlsx / .xls) no bucket rh-portal-assets
-- Idempotente. Não altera UI.
-- =============================================================================

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
