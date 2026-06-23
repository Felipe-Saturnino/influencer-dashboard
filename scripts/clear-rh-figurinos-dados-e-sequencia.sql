-- =============================================================================
-- RH Figurinos — limpar inventário e resetar contadores de código
-- =============================================================================
-- Executar no SQL Editor do Supabase (role postgres ou service_role).
--
-- Remove TODAS as peças e dados derivados; reinicia sequência por categoria
-- (ex.: próximo cadastro Camisa = CAM-000001).
--
-- NÃO remove: estúdios, operadoras, funções RPC, políticas RLS.
--
-- Tabelas esvaziadas:
--   rh_figurino_pecas              (peças)
--   rh_figurino_emprestimos        (CASCADE)
--   rh_figurino_status_history     (CASCADE)
--   rh_figurino_peca_operadoras    (CASCADE)
--   rh_figurino_peca_estudios      (CASCADE)
--   rh_figurino_category_code_counters (contadores PREFIX → last_value)
-- =============================================================================

BEGIN;

-- ─── Conferência antes (opcional — comentar se já souber o estado) ───────────
DO $$
DECLARE
  v_pecas      bigint;
  v_emp        bigint;
  v_hist       bigint;
  v_po         bigint;
  v_pe         bigint;
  v_counters   bigint;
BEGIN
  SELECT count(*) INTO v_pecas FROM public.rh_figurino_pecas;
  SELECT count(*) INTO v_emp FROM public.rh_figurino_emprestimos;
  SELECT count(*) INTO v_hist FROM public.rh_figurino_status_history;
  SELECT count(*) INTO v_po FROM public.rh_figurino_peca_operadoras;
  SELECT count(*) INTO v_pe FROM public.rh_figurino_peca_estudios;

  IF to_regclass('public.rh_figurino_category_code_counters') IS NOT NULL THEN
    SELECT count(*) INTO v_counters FROM public.rh_figurino_category_code_counters;
  ELSE
    v_counters := 0;
  END IF;

  RAISE NOTICE 'Antes — peças: % | empréstimos: % | histórico: % | N:N operadoras: % | N:N estúdios: % | contadores: %',
    v_pecas, v_emp, v_hist, v_po, v_pe, v_counters;
END $$;

-- ─── Limpeza ─────────────────────────────────────────────────────────────────
TRUNCATE TABLE public.rh_figurino_pecas CASCADE;

-- Contadores por prefixo de categoria (CAM, VES, …) — migração 20260619140000
TRUNCATE TABLE public.rh_figurino_category_code_counters;

-- Sequência legada FIG-###### (ambientes antigos; migração já remove, idempotente)
DROP SEQUENCE IF EXISTS public.rh_figurino_code_seq;

-- ─── Conferência depois ──────────────────────────────────────────────────────
DO $$
DECLARE
  v_pecas    bigint;
  v_counters bigint;
BEGIN
  SELECT count(*) INTO v_pecas FROM public.rh_figurino_pecas;
  SELECT count(*) INTO v_counters FROM public.rh_figurino_category_code_counters;

  IF v_pecas > 0 THEN
    RAISE EXCEPTION 'Limpeza incompleta: ainda existem % peça(s) em rh_figurino_pecas', v_pecas;
  END IF;

  IF v_counters > 0 THEN
    RAISE EXCEPTION 'Contadores não resetados: % linha(s) em rh_figurino_category_code_counters', v_counters;
  END IF;

  RAISE NOTICE 'Depois — peças: 0 | contadores: 0';
END $$;

COMMIT;

-- Conferência manual (após COMMIT):
-- SELECT count(*) AS pecas FROM public.rh_figurino_pecas;
-- SELECT * FROM public.rh_figurino_category_code_counters;
-- SELECT public.rh_figurino_preview_proximo_code('Camisa');  -- esperado: CAM-000001
