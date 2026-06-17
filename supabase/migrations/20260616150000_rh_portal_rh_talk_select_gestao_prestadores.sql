-- Gestão de Prestadores: listar RH Talks publicados no modal de participantes (sem permissão total do Portal).

BEGIN;

CREATE POLICY rh_portal_rh_talk_select_funcionarios_edit ON public.rh_portal_rh_talk
  FOR SELECT TO authenticated
  USING (
    public._rh_funcionario_perm('edit')
    AND (status IS NULL OR status = 'publicado')
  );

COMMIT;
