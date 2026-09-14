-- Página Versionamento (utilitária, irmã de Ajuda): Ver=sim para todos os perfis
-- e whitelist nas helpers de gestor/prestador (fora de gestor_tipo_pages / prestador_tipo_pages).

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'versionamento', 'sim', NULL, NULL, NULL
FROM public.role_permissions rp
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

CREATE OR REPLACE FUNCTION public._gestor_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_rp_ok boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'gestor') THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = uid
      AND rp.page_key = p_page_key
      AND (
        (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
        OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
        OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
        OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
      )
  )
  INTO v_rp_ok;

  IF NOT coalesce(v_rp_ok, false) THEN
    RETURN false;
  END IF;

  IF p_page_key IN ('home', 'configuracoes', 'ajuda', 'versionamento') THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_scopes s
    WHERE s.user_id = uid AND s.scope_type = 'gestor_tipo'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_scopes s
    INNER JOIN public.gestor_tipo_pages gtp
      ON gtp.gestor_tipo_slug = s.scope_ref AND gtp.page_key = p_page_key
    WHERE s.user_id = uid AND s.scope_type = 'gestor_tipo'
  );
END;
$$;

REVOKE ALL ON FUNCTION public._gestor_page_perm(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._gestor_page_perm(text, text) TO authenticated;

COMMENT ON FUNCTION public._gestor_page_perm(text, text) IS
  'Gestor: permissão efetiva = role_permissions ∩ união(gestor_tipo_pages); páginas home/configuracoes/ajuda/versionamento só role_permissions.';

CREATE OR REPLACE FUNCTION public._prestador_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_rp_ok boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'prestador') THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = uid
      AND rp.page_key = p_page_key
      AND (
        (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
        OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
        OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
        OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
      )
  )
  INTO v_rp_ok;

  IF NOT coalesce(v_rp_ok, false) THEN
    RETURN false;
  END IF;

  IF p_page_key IN ('home', 'configuracoes', 'ajuda', 'versionamento') THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_scopes s
    WHERE s.user_id = uid AND s.scope_type = 'prestador_tipo'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_scopes s
    INNER JOIN public.prestador_tipo_pages ptp
      ON ptp.prestador_tipo_slug = s.scope_ref AND ptp.page_key = p_page_key
    WHERE s.user_id = uid AND s.scope_type = 'prestador_tipo'
  );
END;
$$;

REVOKE ALL ON FUNCTION public._prestador_page_perm(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._prestador_page_perm(text, text) TO authenticated;

COMMENT ON FUNCTION public._prestador_page_perm(text, text) IS
  'Prestador: permissão efetiva = role_permissions ∩ união(prestador_tipo_pages); páginas home/configuracoes/ajuda/versionamento só role_permissions.';

COMMIT;
