-- Gestão de Staff / Escala / Dealers / Figurinos / Roteiro: leitura de estudios_spin sem gestao_mesas.
-- Corrige modal Estúdio vazio (só «Todos Estúdios») para Gestor de Estúdio e Shift Leader.

BEGIN;

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
      OR public._gestor_page_perm('gestao_dealers', p_need)
      OR public._prestador_page_perm('gestao_dealers', p_need)
      OR public._staff_spin_page_perm('gestao_dealers', p_need)
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
      OR public._staff_spin_page_perm('rh_figurinos', p_need)
      OR public._gestor_page_perm('roteiro_mesa', p_need)
      OR public._prestador_page_perm('roteiro_mesa', p_need)
      OR public._staff_spin_page_perm('roteiro_mesa', p_need)
      OR public._gestor_page_perm('central_notificacoes', p_need)
      OR public._prestador_page_perm('central_notificacoes', p_need)
      OR public._staff_spin_page_perm('central_notificacoes', p_need)
    );
$$;

REVOKE ALL ON FUNCTION public._estudios_spin_leitura_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._estudios_spin_leitura_perm(text) TO authenticated;

COMMENT ON FUNCTION public._estudios_spin_leitura_perm(text) IS
  'SELECT em estudios_spin: Gestão de Mesas ou páginas operacionais que listam estúdios (Staff, Escala, Dealers, Figurinos, Roteiro, Central).';

CREATE OR REPLACE FUNCTION public._estudios_spin_scope_estudio(p_estudio_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor'))
      OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND pr.role IN ('shift_leader', 'service_manager', 'figurino', 'rh', 'investidor')
      )
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('executivo', 'operador'))
        AND EXISTS (
          SELECT 1
          FROM public.estudios_spin_operadoras j
          INNER JOIN public.user_scopes s
            ON s.user_id = auth.uid()
           AND s.scope_type = 'operadora'
           AND s.scope_ref = j.operadora_slug
          WHERE j.estudio_slug = p_estudio_slug
        )
      )
    );
$$;

DROP POLICY IF EXISTS estudios_spin_select ON public.estudios_spin;
CREATE POLICY estudios_spin_select
  ON public.estudios_spin FOR SELECT TO authenticated
  USING (
    public._estudios_spin_scope_estudio(slug)
    AND public._estudios_spin_leitura_perm('view')
  );

DROP POLICY IF EXISTS estudios_spin_operadoras_select ON public.estudios_spin_operadoras;
CREATE POLICY estudios_spin_operadoras_select
  ON public.estudios_spin_operadoras FOR SELECT TO authenticated
  USING (
    public._estudios_spin_scope_estudio(estudio_slug)
    AND public._estudios_spin_leitura_perm('view')
  );

COMMENT ON POLICY estudios_spin_select ON public.estudios_spin IS
  'Cadastro de mesas (gestao_mesas) ou leitura operacional (rh_staff, escala, dealers, figurinos, roteiro).';

COMMIT;
