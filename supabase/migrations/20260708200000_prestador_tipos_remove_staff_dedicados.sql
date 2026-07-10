-- Customer Service, Game Presenter, Shuffler e Tech Ops passaram a perfis próprios (role_permissions).
-- Remove matriz prestador_tipo_pages e escopos user_scopes legados dessas áreas.

BEGIN;

DELETE FROM public.prestador_tipo_pages
WHERE prestador_tipo_slug IN ('customer_service', 'game_presenter', 'shuffler', 'tech_ops');

DELETE FROM public.user_scopes
WHERE scope_type = 'prestador_tipo'
  AND scope_ref IN ('customer_service', 'game_presenter', 'shuffler', 'tech_ops');

ALTER TABLE public.prestador_tipo_pages
  DROP CONSTRAINT IF EXISTS prestador_tipo_pages_prestador_tipo_slug_check;

ALTER TABLE public.prestador_tipo_pages
  ADD CONSTRAINT prestador_tipo_pages_prestador_tipo_slug_check
  CHECK (prestador_tipo_slug IN (
    'escritorio',
    'facilities',
    'financeiro',
    'ti',
    'estudio'
  ));

COMMENT ON CONSTRAINT prestador_tipo_pages_prestador_tipo_slug_check ON public.prestador_tipo_pages IS
  'Áreas de atuação Prestadores (Gestão de Usuários / aba Prestadores). CS, GP, Shuffler e Tech Ops são perfis próprios.';

COMMIT;
