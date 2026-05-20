-- Lobby monitor: leitura alinhada à página Overview Spin (mesas_spin), não só gestao_mesas.
-- Operador com mesas_spin em role_permissions + operadora_pages deve ver lobby_monitor_* no escopo.

CREATE OR REPLACE FUNCTION public._mesas_spin_overview_perm(p_need text)
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
      OR public._gestor_page_perm('mesas_spin', p_need)
      OR public._prestador_page_perm('mesas_spin', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND p.role IS DISTINCT FROM 'operador'
          AND rp.page_key = 'mesas_spin'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
      OR (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
        AND EXISTS (
          SELECT 1
          FROM public.role_permissions rp
          WHERE rp.role = 'operador'
            AND rp.page_key = 'mesas_spin'
            AND (
              (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
              OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
              OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
              OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
            )
        )
        AND EXISTS (
          SELECT 1
          FROM public.user_scopes s
          INNER JOIN public.operadora_pages op
            ON op.operadora_slug = s.scope_ref
            AND op.page_key = 'mesas_spin'
          WHERE s.user_id = auth.uid()
            AND s.scope_type = 'operadora'
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._mesas_spin_overview_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._mesas_spin_overview_perm(text) TO authenticated;

COMMENT ON FUNCTION public._mesas_spin_overview_perm(text) IS
  'Overview Spin / Posicionamento (page_key mesas_spin). Operador: role_permissions + operadora_pages no escopo.';

DROP POLICY IF EXISTS lobby_monitor_execucao_select ON public.lobby_monitor_execucao;
CREATE POLICY lobby_monitor_execucao_select
  ON public.lobby_monitor_execucao FOR SELECT TO authenticated
  USING (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND (
      public._mesas_spin_overview_perm('view')
      OR public._mesas_spin_cadastro_perm('view')
    )
  );

DROP POLICY IF EXISTS lobby_monitor_posicao_select ON public.lobby_monitor_posicao;
CREATE POLICY lobby_monitor_posicao_select
  ON public.lobby_monitor_posicao FOR SELECT TO authenticated
  USING (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND (
      public._mesas_spin_overview_perm('view')
      OR public._mesas_spin_cadastro_perm('view')
    )
  );
