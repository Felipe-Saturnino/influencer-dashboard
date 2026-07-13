-- Remove área Prestadores «Financeiro» (escopo obsoleto). Escopos existentes → Escritório.

BEGIN;

-- Migrar escopos de usuários com área financeiro para escritório (sem duplicar)
INSERT INTO public.user_scopes (user_id, scope_type, scope_ref)
SELECT s.user_id, 'prestador_tipo', 'escritorio'
FROM public.user_scopes s
WHERE s.scope_type = 'prestador_tipo'
  AND s.scope_ref = 'financeiro'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_scopes x
    WHERE x.user_id = s.user_id
      AND x.scope_type = 'prestador_tipo'
      AND x.scope_ref = 'escritorio'
  );

DELETE FROM public.user_scopes
WHERE scope_type = 'prestador_tipo'
  AND scope_ref = 'financeiro';

DELETE FROM public.prestador_tipo_pages
WHERE prestador_tipo_slug = 'financeiro';

ALTER TABLE public.prestador_tipo_pages
  DROP CONSTRAINT IF EXISTS prestador_tipo_pages_prestador_tipo_slug_check;

ALTER TABLE public.prestador_tipo_pages
  ADD CONSTRAINT prestador_tipo_pages_prestador_tipo_slug_check
  CHECK (prestador_tipo_slug IN (
    'escritorio',
    'facilities',
    'ti',
    'estudio'
  ));

COMMENT ON CONSTRAINT prestador_tipo_pages_prestador_tipo_slug_check ON public.prestador_tipo_pages IS
  'Áreas Prestadores: Escritório, Estúdio, Facilities, TI. Financeiro removido.';

COMMIT;
