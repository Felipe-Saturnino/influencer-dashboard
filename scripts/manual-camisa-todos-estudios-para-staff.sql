-- One-off: Camisas com «Todos Estúdios» → «Staff»
--
-- Pré-requisitos:
--   • 20260619150000_rh_figurino_atende_todos_estudios.sql
--   • 20260619180000_rh_figurino_atende_staff.sql
--
-- Escopo: category = 'Camisa' AND atende_todos_estudios = true
-- Efeito: atende_staff = true, atende_todos_estudios = false,
--         remove vínculos N:N (estúdio e operadora).
--
-- Executar no SQL Editor do Supabase (conteúdo deste arquivo inteiro).

BEGIN;

DO $$
DECLARE
  v_esperado integer;
  v_atualizadas integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rh_figurino_pecas'
      AND column_name = 'atende_staff'
  ) THEN
    RAISE EXCEPTION
      'Coluna atende_staff não encontrada. Aplique 20260619180000_rh_figurino_atende_staff.sql.';
  END IF;

  CREATE TEMP TABLE _camisa_todos_para_staff ON COMMIT DROP AS
  SELECT p.id, p.status
  FROM public.rh_figurino_pecas p
  WHERE p.category = 'Camisa'
    AND p.atende_todos_estudios = true
    AND coalesce(p.atende_staff, false) = false;

  SELECT count(*)::integer INTO v_esperado FROM _camisa_todos_para_staff;

  IF v_esperado = 0 THEN
    RAISE NOTICE 'Nenhuma Camisa com Todos Estúdios para migrar.';
    RETURN;
  END IF;

  RAISE NOTICE 'Camisas a migrar (Todos Estúdios → Staff): %', v_esperado;

  DELETE FROM public.rh_figurino_peca_estudios je
  WHERE je.peca_id IN (SELECT id FROM _camisa_todos_para_staff);

  DELETE FROM public.rh_figurino_peca_operadoras jo
  WHERE jo.peca_id IN (SELECT id FROM _camisa_todos_para_staff);

  UPDATE public.rh_figurino_pecas p
  SET
    atende_todos_estudios = false,
    atende_staff = true
  WHERE p.id IN (SELECT id FROM _camisa_todos_para_staff);

  GET DIAGNOSTICS v_atualizadas = ROW_COUNT;

  IF v_atualizadas <> v_esperado THEN
    RAISE EXCEPTION 'Esperado % linha(s), atualizadas %', v_esperado, v_atualizadas;
  END IF;

  INSERT INTO public.rh_figurino_status_history (
    item_id, previous_status, new_status, changed_by, notes
  )
  SELECT
    t.id,
    t.status,
    t.status,
    'migracao-manual',
    'Escopo alterado: Todos Estúdios → Staff (Camisa)'
  FROM _camisa_todos_para_staff t;

  RAISE NOTICE 'Concluído: % Camisa(s) migrada(s) para Staff.', v_atualizadas;
END $$;

COMMIT;

-- ─── Conferência ─────────────────────────────────────────────────────────────
-- SELECT
--   p.size,
--   p.genero,
--   p.cor,
--   p.atende_todos_estudios,
--   p.atende_staff,
--   count(*) AS qtd
-- FROM public.rh_figurino_pecas p
-- WHERE p.category = 'Camisa'
-- GROUP BY p.size, p.genero, p.cor, p.atende_todos_estudios, p.atende_staff
-- ORDER BY p.cor, p.size;

-- SELECT count(*) AS camisas_staff_sem_vinculo
-- FROM public.rh_figurino_pecas p
-- WHERE p.category = 'Camisa'
--   AND p.atende_staff = true
--   AND NOT EXISTS (SELECT 1 FROM public.rh_figurino_peca_estudios je WHERE je.peca_id = p.id)
--   AND NOT EXISTS (SELECT 1 FROM public.rh_figurino_peca_operadoras jo WHERE jo.peca_id = p.id);
