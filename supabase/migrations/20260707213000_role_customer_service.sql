-- Perfil Customer Service (staff interno): paridade Service Manager — role_permissions, sem user_scopes.

BEGIN;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'gestor',
    'prestador',
    'executivo',
    'influencer',
    'afiliado',
    'operador',
    'agencia',
    'investidor',
    'shift_leader',
    'service_manager',
    'customer_service',
    'tech_ops',
    'figurino',
    'comunicacao',
    'performance_coach',
    'rh'
  ));

ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN (
    'admin',
    'gestor',
    'prestador',
    'executivo',
    'influencer',
    'afiliado',
    'operador',
    'agencia',
    'investidor',
    'shift_leader',
    'service_manager',
    'customer_service',
    'tech_ops',
    'figurino',
    'comunicacao',
    'performance_coach',
    'rh'
  ));

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT 'customer_service', page_key, can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE role = 'service_manager'
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT 'customer_service', 'simulador_login', 'nao', NULL, NULL, NULL
ON CONFLICT (role, page_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public._role_sem_escopo_app()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN (
        'executivo',
        'investidor',
        'prestador',
        'shift_leader',
        'service_manager',
        'customer_service',
        'tech_ops',
        'figurino',
        'comunicacao',
        'performance_coach',
        'rh'
      )
  );
$$;

COMMENT ON FUNCTION public._role_sem_escopo_app() IS
  'Executivo, Investidor, Prestador e staff Spin (incl. Customer Service / Tech Ops): sem escopo operadora/influencer na app — só role_permissions.';

CREATE OR REPLACE FUNCTION public._staff_spin_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND p.role IN (
        'shift_leader',
        'service_manager',
        'customer_service',
        'tech_ops',
        'figurino',
        'comunicacao',
        'performance_coach',
        'rh'
      )
      AND rp.page_key = p_page_key
      AND (
        (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
        OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
        OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
        OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
      )
  );
$$;

COMMENT ON FUNCTION public._staff_spin_page_perm(text, text) IS
  'Shift Leader / Service Manager / Customer Service / Tech Ops / Figurino / Comunicação / Performance Coach / RH: ação efetiva só conforme role_permissions (aba Permissões), sem user_scopes.';

DROP POLICY IF EXISTS conteudo_informativo_select_home_feed_customer_service ON public.conteudo_informativo;

CREATE POLICY conteudo_informativo_select_home_feed_customer_service ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    status = 'publicado'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'customer_service'
        AND p.role::text = ANY (perfis)
    )
  );

COMMENT ON POLICY conteudo_informativo_select_home_feed_customer_service ON public.conteudo_informativo IS
  'Home Customer Service: informativos publicados com perfil customer_service no array perfis.';

DROP POLICY IF EXISTS spin_na_rede_mencao_select_home_feed_customer_service ON public.spin_na_rede_mencao;

CREATE POLICY spin_na_rede_mencao_select_home_feed_customer_service ON public.spin_na_rede_mencao
  FOR SELECT TO authenticated
  USING (
    passou_filtro = true
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'customer_service'
    )
  );

COMMENT ON POLICY spin_na_rede_mencao_select_home_feed_customer_service ON public.spin_na_rede_mencao IS
  'Home Customer Service: menções Spin na Rede (leitura na Home sem page perm spin_na_rede).';

COMMIT;
