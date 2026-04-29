-- RH — Calendário: page_key rh_calendario com mesmas permissões base que rh_staff (Recursos Humanos).

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'rh_calendario', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'rh_staff'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('recursos_humanos', 'rh_calendario')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

COMMIT;
