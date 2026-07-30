-- Marketplace de Turnos: remover o tipo `troca_cassada`.
-- Fica apenas o fluxo de Oferta de Troca (`oferta_troca`) além das vendas.
-- Registos legados de troca casada passam a contar como oferta de troca.

BEGIN;

UPDATE public.escala_marketplace_oferta
SET tipo = 'oferta_troca', atualizado_em = now()
WHERE tipo = 'troca_cassada';

UPDATE public.rh_calendario_acoes
SET tipo_acao = 'oferta_troca'
WHERE tipo_acao = 'troca_cassada';

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT rel.relname AS tabela, con.conname AS constraint_nome
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND con.contype = 'c'
      AND rel.relname IN ('escala_marketplace_oferta', 'rh_calendario_acoes')
      AND pg_get_constraintdef(con.oid) LIKE '%troca_cassada%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tabela, r.constraint_nome);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'escala_marketplace_oferta_tipo_check'
      AND conrelid = 'public.escala_marketplace_oferta'::regclass
  ) THEN
    ALTER TABLE public.escala_marketplace_oferta
      ADD CONSTRAINT escala_marketplace_oferta_tipo_check
      CHECK (tipo IN ('venda_turno', 'venda_folga', 'oferta_troca'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rh_calendario_acoes_tipo_acao_check'
      AND conrelid = 'public.rh_calendario_acoes'::regclass
  ) THEN
    ALTER TABLE public.rh_calendario_acoes
      ADD CONSTRAINT rh_calendario_acoes_tipo_acao_check
      CHECK (tipo_acao IN ('venda_folga', 'venda_turno', 'oferta_troca', 'agendamento_reuniao'));
  END IF;
END $$;

COMMENT ON TABLE public.rh_calendario_acoes IS
  'Ações registadas a partir do Calendário (prestador): venda de folga/turno, oferta de troca, agendamento de reunião.';

COMMIT;
