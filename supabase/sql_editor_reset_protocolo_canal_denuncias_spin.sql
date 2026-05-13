-- =============================================================================
-- Reset do contador de protocolo (CDSPIN00001 …) — Canal de Denúncias Spin
-- Executar manualmente no SQL Editor do Supabase (não é migration automática).
-- =============================================================================
--
-- O número final do protocolo vem da sequência: public.canal_denuncia_spin_protocol_seq
-- (cada INSERT chama nextval; testes repetidos fazem o contador subir.)
--
-- A coluna `protocolo` tem UNIQUE: só pode voltar a CDSPIN00001 se não existir
-- nenhuma linha com esse protocolo (ou apagar as denúncias de teste antes).
--
-- -----------------------------------------------------------------------------
-- Opção A — Ambiente de teste: apagar todas as denúncias e recomeçar do 00001
-- -----------------------------------------------------------------------------
-- CUIDADO: apaga denúncias, histórico de status, anotações e referências a anexos
-- no storage ainda precisam ser limpos pela app ou manualmente no bucket.
/*
BEGIN;

TRUNCATE TABLE public.canal_denuncias_spin CASCADE;

SELECT setval('public.canal_denuncia_spin_protocol_seq', 1, false);
-- Próximo protocolo gerado: CDSPIN00001

COMMIT;
*/

-- -----------------------------------------------------------------------------
-- Opção B — Manter denúncias: alinhar a sequência ao maior número em uso
-- (não “rebaixa” o contador; o próximo protocolo será max+1.)
-- -----------------------------------------------------------------------------
/*
WITH mx AS (
  SELECT COALESCE(MAX(SUBSTRING(protocolo FROM 7 FOR 5)::int), 0) AS n
  FROM public.canal_denuncias_spin
  WHERE protocolo ~ '^CDSPIN[0-9]{5}$'
)
SELECT setval(
  'public.canal_denuncia_spin_protocol_seq',
  (SELECT GREATEST(n, 1) FROM mx),
  (SELECT n > 0 FROM mx)
);
*/

-- -----------------------------------------------------------------------------
-- Opção C — Só reposicionar para 00001 sem apagar (só se a tabela estiver vazia)
-- -----------------------------------------------------------------------------
/*
SELECT setval('public.canal_denuncia_spin_protocol_seq', 1, false);
*/
