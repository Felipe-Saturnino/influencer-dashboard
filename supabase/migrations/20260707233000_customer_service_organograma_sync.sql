-- Sync organograma: time Customer Service → perfil staff customer_service (paridade Service Manager).
-- Garante acesso à página Atendimento via role_permissions (staff não usa prestador_tipo_pages).

BEGIN;

UPDATE public.role_permissions
SET can_view = 'sim', can_editar = 'sim'
WHERE role = 'customer_service'
  AND page_key = 'cs_atendimento';

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
VALUES ('customer_service', 'cs_atendimento', 'sim', NULL, 'sim', NULL)
ON CONFLICT (role, page_key) DO UPDATE
SET can_view = EXCLUDED.can_view,
    can_editar = EXCLUDED.can_editar;

COMMIT;
