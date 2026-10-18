-- COLE NO SUPABASE (SQL Editor) — fix INSERT Solicitações RH (Feedback / Vaga)
-- Causa: Editar=Próprios via CTA, mas RLS INSERT só liberava Editar=Sim.
-- Escopo: mesma cascata Organograma do UPDATE (_rh_lideranca_funcionario_no_escopo).

BEGIN;

DROP POLICY IF EXISTS rh_solicitacoes_insert ON public.rh_solicitacoes;
CREATE POLICY rh_solicitacoes_insert ON public.rh_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._rh_solicitacoes_perm('edit')
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_editar = 'sim'
      )
    )
    OR (
      (
        public._rh_solicitacoes_perm('create')
        OR public._rh_solicitacoes_perm('edit')
      )
      AND public._rh_lideranca_funcionario_no_escopo(rh_funcionario_id)
    )
  );

COMMIT;
