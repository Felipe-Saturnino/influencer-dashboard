-- ═══════════════════════════════════════════════════════════════════════════
-- PLS sync em partes (ambiente de teste): divide pls_jogador_dados em L lotes
-- e permite listar os cda_id de cada lote para chamar sync-pls-jogador.
--
-- A Edge Function aceita:
--   • body vazio {}  → todos os cda_id (evitar com milhares — timeout).
--   • {"cda_id":"2056197"}
--   • {"cda_ids":["2056197","123",...]}  → um lote inteiro num único POST
--     (limite default 200 IDs; secret PLS_SYNC_MAX_BATCH até 500).
--
-- Fluxo sugerido:
-- 1) Ajuste lote_tamanho (ex.: 150–200 ≤ PLS_SYNC_MAX_BATCH).
-- 2) Rode o bloco "A" para criar/preencher a tabela de lotes (apenas em teste).
-- 3) Rode o bloco "B" ou "B2": para cada lote, um POST com o JSON de cda_ids
--    (não é preciso um POST por jogador).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── A) Criar tabela auxiliar e repartir por ROW_NUMBER (controlo explícito) ─

CREATE TABLE IF NOT EXISTS public.pls_jogador_sync_lotes (
  lote     integer NOT NULL,
  cda_id   text    NOT NULL REFERENCES public.pls_jogador_dados (cda_id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lote, cda_id)
);

COMMENT ON TABLE public.pls_jogador_sync_lotes IS
  'Auxiliar só para teste: mapeia cada cda_id a um número de lote para sync-pls-jogador em série.';

TRUNCATE public.pls_jogador_sync_lotes;

-- ↓ Ajuste só estes dois:
-- lote_tamanho ≈ quantos jogadores por “onda” (ex.: 200 → ~11 ondas para ~2200 IDs)
WITH params AS (
  SELECT 200::int AS lote_tamanho
),
numerados AS (
  SELECT
    j.cda_id,
    (ROW_NUMBER() OVER (ORDER BY j.cda_id) - 1) / p.lote_tamanho + 1 AS lote
  FROM public.pls_jogador_dados j
  CROSS JOIN params p
)
INSERT INTO public.pls_jogador_sync_lotes (lote, cda_id)
SELECT lote, cda_id
FROM numerados;

-- Resumo
SELECT lote, count(*) AS qtd
FROM public.pls_jogador_sync_lotes
GROUP BY lote
ORDER BY lote;

SELECT max(lote) AS total_lotes FROM public.pls_jogador_sync_lotes;


-- ─── B) Listar IDs de UM lote (troque v_lote: 1 .. total_lotes) ──────────────

DO $$
DECLARE
  v_lote integer := 1;  -- ← mude aqui para 2, 3, …
BEGIN
  RAISE NOTICE 'Copie os cda_id abaixo ou use em script; lote %', v_lote;
END $$;

SELECT cda_id
FROM public.pls_jogador_sync_lotes
WHERE lote = 1  -- ← mesmo número que v_lote acima
ORDER BY cda_id;


-- ─── B2) Payload JSON para um lote (colar no body do POST) ───────────────────

-- Troque o 1 pelo número do lote.
-- NÃO use ::text aqui: senão o resultado vira string e o editor mostra algo como
-- { "json_build_object": "{\"cda_ids\" : [...]}" } — JSON duplo e nome feio.
-- Com tipo json + alias "body", copie só o objeto { "cda_ids": [...] }.

SELECT json_build_object(
  'cda_ids',
  json_agg(cda_id ORDER BY cda_id)
) AS body
FROM public.pls_jogador_sync_lotes
WHERE lote = 1;


-- ─── C) (Opcional) Uma linha CSV por lote para colar noutra ferramenta ───────

-- SELECT lote, string_agg(cda_id, ',' ORDER BY cda_id) AS cda_ids_csv
-- FROM public.pls_jogador_sync_lotes
-- GROUP BY lote
-- ORDER BY lote;


-- ─── D) Limpar quando terminar os testes ─────────────────────────────────────

-- DROP TABLE IF EXISTS public.pls_jogador_sync_lotes;
