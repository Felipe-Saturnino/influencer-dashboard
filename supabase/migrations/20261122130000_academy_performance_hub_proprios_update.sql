-- Performance Hub: prestador (Ver) pode atualizar a própria avaliação
-- (Solicitar Feedback / Aprovar) — antes só create/edit gravavam.

BEGIN;

CREATE OR REPLACE FUNCTION public._academy_performance_hub_avaliacao_e_do_usuario(
  p_avaliado_staff_id uuid,
  p_avaliado_nome text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
        AND f.status IS DISTINCT FROM 'encerrado'
        AND (
          (p_avaliado_staff_id IS NOT NULL AND f.id = p_avaliado_staff_id)
          OR (
            p_avaliado_nome IS NOT NULL
            AND btrim(p_avaliado_nome) <> ''
            AND lower(btrim(f.nome)) = lower(btrim(p_avaliado_nome))
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public._academy_performance_hub_avaliacao_e_do_usuario(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._academy_performance_hub_avaliacao_e_do_usuario(uuid, text) TO authenticated;

COMMENT ON FUNCTION public._academy_performance_hub_avaliacao_e_do_usuario(uuid, text) IS
  'Performance Hub: true se o login atual é o prestador avaliado (staff id ou nome do RH).';

DROP POLICY IF EXISTS academy_performance_hub_avaliacao_update ON public.academy_performance_hub_avaliacao;
CREATE POLICY academy_performance_hub_avaliacao_update ON public.academy_performance_hub_avaliacao
  FOR UPDATE TO authenticated
  USING (
    public._academy_performance_hub_perm('create')
    OR public._academy_performance_hub_perm('edit')
    OR (
      public._academy_performance_hub_perm('view')
      AND public._academy_performance_hub_avaliacao_e_do_usuario(avaliado_staff_id, avaliado_nome)
    )
  )
  WITH CHECK (
    public._academy_performance_hub_perm('create')
    OR public._academy_performance_hub_perm('edit')
    OR (
      public._academy_performance_hub_perm('view')
      AND public._academy_performance_hub_avaliacao_e_do_usuario(avaliado_staff_id, avaliado_nome)
    )
  );

COMMIT;
