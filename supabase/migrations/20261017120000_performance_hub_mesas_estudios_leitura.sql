-- Performance Hub: selects Estúdio / Jogo / Mesa do modal de avaliação vazios para Performance Coach.
-- O modal monta a lista de jogos a partir de mesas_spin_cadastro + estudios_spin (Gestão de Estúdios),
-- mas a leitura dessas tabelas exigia Ver em mesas_spin ou gestao_mesas — páginas que o coach não tem.
-- Soma quem tem Ver em academy_performance_hub (role_permissions) como caminho de leitura.

BEGIN;

-- ─── Quem tem Ver no Performance Hub (qualquer família de perfil) ─────────────
-- Espelha _tech_ops_estoque_perm (20261016150000): gestor/prestador pelas matrizes
-- tipo_pages; demais perfis direto em role_permissions.

CREATE OR REPLACE FUNCTION public._academy_performance_hub_perm(p_need text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR public._gestor_page_perm('academy_performance_hub', p_need)
      OR public._prestador_page_perm('academy_performance_hub', p_need)
      OR public._staff_spin_page_perm('academy_performance_hub', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'academy_performance_hub'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._academy_performance_hub_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._academy_performance_hub_perm(text) TO authenticated;

COMMENT ON FUNCTION public._academy_performance_hub_perm(text) IS
  'Ação efetiva na página academy_performance_hub conforme role_permissions (Performance Coach e demais perfis liberados).';

-- ─── mesas_spin_cadastro: leitura também com Ver no Performance Hub ───────────
-- Base: 20260922120000 (overview_perm OR cadastro_perm). Escopo por slug inalterado —
-- performance_coach passa por _role_sem_escopo_app.

DROP POLICY IF EXISTS mesas_spin_cadastro_select ON public.mesas_spin_cadastro;
CREATE POLICY mesas_spin_cadastro_select
  ON public.mesas_spin_cadastro FOR SELECT TO authenticated
  USING (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND (
      public._mesas_spin_overview_perm('view')
      OR public._mesas_spin_cadastro_perm('view')
      OR public._academy_performance_hub_perm('view')
    )
  );

COMMENT ON POLICY mesas_spin_cadastro_select ON public.mesas_spin_cadastro IS
  'Overview Spin, Gestão de Estúdios ou Performance Hub (selects Jogo/Mesa do modal de avaliação).';

-- ─── estudios_spin: leitura também com Ver no Performance Hub ─────────────────
-- Redefine _estudios_spin_leitura_perm (base 20261016150000, que já soma tech_ops_estoque).

CREATE OR REPLACE FUNCTION public._estudios_spin_leitura_perm(p_need text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public._mesas_spin_cadastro_perm(p_need)
      OR public._rh_staff_perm(p_need)
      OR public._gestor_page_perm('rh_gestao_escala', p_need)
      OR public._prestador_page_perm('rh_gestao_escala', p_need)
      OR public._staff_spin_page_perm('rh_gestao_escala', p_need)
      OR public._executivo_role_permissions_can_view('rh_gestao_escala')
      OR public._gestor_page_perm('gestao_dealers', p_need)
      OR public._prestador_page_perm('gestao_dealers', p_need)
      OR public._staff_spin_page_perm('gestao_dealers', p_need)
      OR public._executivo_role_permissions_can_view('gestao_dealers')
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
      OR public._staff_spin_page_perm('rh_figurinos', p_need)
      OR public._executivo_role_permissions_can_view('rh_figurinos')
      OR public._gestor_page_perm('roteiro_mesa', p_need)
      OR public._prestador_page_perm('roteiro_mesa', p_need)
      OR public._staff_spin_page_perm('roteiro_mesa', p_need)
      OR public._executivo_role_permissions_can_view('roteiro_mesa')
      OR public._gestor_page_perm('central_notificacoes', p_need)
      OR public._prestador_page_perm('central_notificacoes', p_need)
      OR public._staff_spin_page_perm('central_notificacoes', p_need)
      OR public._executivo_role_permissions_can_view('central_notificacoes')
      OR public._tech_ops_estoque_perm(p_need)
      OR public._academy_performance_hub_perm(p_need)
    );
$$;

COMMENT ON FUNCTION public._estudios_spin_leitura_perm(text) IS
  'SELECT em estudios_spin: Gestão de Mesas ou páginas operacionais (Staff, Escala, Dealers, Figurinos, Roteiro, Central, Gestão de Estoque Tech Ops, Performance Hub).';

COMMIT;
