-- Tech Ops — Ordem de Saída: campos de cancelamento/conclusão, retorno por item e anotações.

BEGIN;

ALTER TABLE public.tech_ops_ordem_saida
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cancelado_por_nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cancelado_em timestamptz,
  ADD COLUMN IF NOT EXISTS observacoes_retorno text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS concluido_por_nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS concluido_em timestamptz;

COMMENT ON COLUMN public.tech_ops_ordem_saida.motivo_cancelamento IS
  'Motivo informado ao cancelar a OS (Modal Atualizar → Cancelar OS).';
COMMENT ON COLUMN public.tech_ops_ordem_saida.observacoes_retorno IS
  'Observações do retorno ao concluir (Modal Atualizar → Confirmar Retorno).';

ALTER TABLE public.tech_ops_ordem_saida_itens
  ADD COLUMN IF NOT EXISTS retorno_confirmado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tech_ops_ordem_saida_itens.retorno_confirmado IS
  'Marcado ao confirmar retorno do item no Modal Atualizar.';

CREATE TABLE IF NOT EXISTS public.tech_ops_ordem_saida_anotacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id      uuid NOT NULL REFERENCES public.tech_ops_ordem_saida(id) ON DELETE CASCADE,
  texto         text NOT NULL,
  autor_user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome    text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tech_ops_ordem_saida_anotacoes IS
  'Anotações livres vinculadas a uma Ordem de Saída. A observação de abertura permanece em tech_ops_ordem_saida.observacao.';

CREATE INDEX IF NOT EXISTS idx_tech_ops_os_anot_ordem
  ON public.tech_ops_ordem_saida_anotacoes (ordem_id, created_at DESC);

ALTER TABLE public.tech_ops_ordem_saida_anotacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tech_ops_os_anot_select ON public.tech_ops_ordem_saida_anotacoes;
DROP POLICY IF EXISTS tech_ops_os_anot_insert ON public.tech_ops_ordem_saida_anotacoes;

CREATE POLICY tech_ops_os_anot_select
  ON public.tech_ops_ordem_saida_anotacoes FOR SELECT TO authenticated
  USING (public._tech_ops_ordem_saida_perm('view'));

CREATE POLICY tech_ops_os_anot_insert
  ON public.tech_ops_ordem_saida_anotacoes FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_ordem_saida_perm('edit'));

GRANT SELECT, INSERT ON public.tech_ops_ordem_saida_anotacoes TO authenticated;

COMMIT;
