-- Escala — Controle de Turno (page_key escala_controle_turno).
-- Seed de permissões: Ver/Criar/Editar = Não (exceto admin). Sem tabelas nesta entrega.

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'escala_controle_turno', 'nao', 'nao', 'nao', NULL
FROM public.role_permissions rp
WHERE rp.role::text <> 'admin'
ON CONFLICT (role, page_key) DO NOTHING;

COMMIT;
