-- Perfis Game Presenter e Shuffler (staff interno): paridade Customer Service.

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
    'game_presenter',
    'shuffler',
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
    'game_presenter',
    'shuffler',
    'tech_ops',
    'figurino',
    'comunicacao',
    'performance_coach',
    'rh'
  ));

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, rp.page_key, rp.can_view, rp.can_criar, rp.can_editar, rp.can_excluir
FROM (
  SELECT unnest(ARRAY['game_presenter', 'shuffler']::text[]) AS role
) r
CROSS JOIN public.role_permissions rp
WHERE rp.role = 'service_manager'
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'simulador_login', 'nao', NULL, NULL, NULL
FROM (SELECT unnest(ARRAY['game_presenter', 'shuffler']::text[]) AS role) r
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
        'game_presenter',
        'shuffler',
        'tech_ops',
        'figurino',
        'comunicacao',
        'performance_coach',
        'rh'
      )
  );
$$;

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
        'game_presenter',
        'shuffler',
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

DROP POLICY IF EXISTS conteudo_informativo_select_home_feed_game_presenter ON public.conteudo_informativo;
CREATE POLICY conteudo_informativo_select_home_feed_game_presenter ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    status = 'publicado'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'game_presenter' AND p.role::text = ANY (perfis)
    )
  );

DROP POLICY IF EXISTS spin_na_rede_mencao_select_home_feed_game_presenter ON public.spin_na_rede_mencao;
CREATE POLICY spin_na_rede_mencao_select_home_feed_game_presenter ON public.spin_na_rede_mencao
  FOR SELECT TO authenticated
  USING (
    passou_filtro = true
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'game_presenter')
  );

DROP POLICY IF EXISTS conteudo_informativo_select_home_feed_shuffler ON public.conteudo_informativo;
CREATE POLICY conteudo_informativo_select_home_feed_shuffler ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    status = 'publicado'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'shuffler' AND p.role::text = ANY (perfis)
    )
  );

DROP POLICY IF EXISTS spin_na_rede_mencao_select_home_feed_shuffler ON public.spin_na_rede_mencao;
CREATE POLICY spin_na_rede_mencao_select_home_feed_shuffler ON public.spin_na_rede_mencao
  FOR SELECT TO authenticated
  USING (
    passou_filtro = true
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'shuffler')
  );

COMMIT;
