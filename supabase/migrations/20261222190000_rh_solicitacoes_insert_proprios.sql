-- Fix: INSERT em rh_solicitacoes para Editar = Próprios.
-- A UI mostra CTAs com canEditarOk (sim|proprios), mas a policy só liberava
-- can_editar = 'sim' ou Criar+escopo. Página não tem Criar → Próprios falhava
-- em Registrar Feedback e Solicitar Vaga (RLS 42501).
-- Alinha INSERT ao ramo de escopo já usado no UPDATE.

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
