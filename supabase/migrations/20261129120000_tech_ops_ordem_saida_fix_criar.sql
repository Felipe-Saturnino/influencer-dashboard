-- Tech Ops — Ordem de Saída: corrige falha ao Solicitar (INSERT bloqueado por RLS).
-- Causa: policy exige solicitante_user_id = auth.uid(), mas o client não enviava o campo
-- e o DEFAULT às vezes não preenchia a tempo do WITH CHECK.
-- Também alinha _pode_nova com _tech_ops_ordem_saida_perm (Criar ou Editar), como na UI.

BEGIN;

ALTER TABLE public.tech_ops_ordem_saida
  ALTER COLUMN solicitante_user_id SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.tech_ops_ordem_saida_set_solicitante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  NEW.solicitante_user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tech_ops_os_set_solicitante ON public.tech_ops_ordem_saida;
CREATE TRIGGER trg_tech_ops_os_set_solicitante
  BEFORE INSERT ON public.tech_ops_ordem_saida
  FOR EACH ROW
  EXECUTE FUNCTION public.tech_ops_ordem_saida_set_solicitante();

CREATE OR REPLACE FUNCTION public._tech_ops_ordem_saida_pode_nova()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public._tech_ops_ordem_saida_perm('create')
    OR public._tech_ops_ordem_saida_perm('edit');
$$;

CREATE OR REPLACE FUNCTION public._tech_ops_ordem_saida_pode_atualizar(p_ordem_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public._tech_ops_ordem_saida_perm('edit')
    OR public._tech_ops_ordem_saida_acao_valor('create') = 'sim'
    OR (
      public._tech_ops_ordem_saida_acao_valor('create') = 'proprios'
      AND public._tech_ops_ordem_saida_propria(p_ordem_id)
    );
$$;

DROP POLICY IF EXISTS tech_ops_os_insert ON public.tech_ops_ordem_saida;
CREATE POLICY tech_ops_os_insert
  ON public.tech_ops_ordem_saida FOR INSERT TO authenticated
  WITH CHECK (
    public._tech_ops_ordem_saida_pode_nova()
    AND solicitante_user_id = auth.uid()
  );

DROP POLICY IF EXISTS tech_ops_os_itens_insert ON public.tech_ops_ordem_saida_itens;
CREATE POLICY tech_ops_os_itens_insert
  ON public.tech_ops_ordem_saida_itens FOR INSERT TO authenticated
  WITH CHECK (
    public._tech_ops_ordem_saida_pode_nova()
    OR public._tech_ops_ordem_saida_pode_atualizar(ordem_id)
  );

DROP POLICY IF EXISTS tech_ops_os_hist_insert ON public.tech_ops_ordem_saida_historico;
CREATE POLICY tech_ops_os_hist_insert
  ON public.tech_ops_ordem_saida_historico FOR INSERT TO authenticated
  WITH CHECK (
    (
      public._tech_ops_ordem_saida_pode_nova()
      OR public._tech_ops_ordem_saida_pode_atualizar(ordem_id)
    )
    AND (autor_user_id IS NULL OR autor_user_id = auth.uid())
  );

COMMENT ON FUNCTION public.tech_ops_ordem_saida_set_solicitante() IS
  'Garante solicitante_user_id = auth.uid() no INSERT (compatível com RLS tech_ops_os_insert).';

COMMIT;
