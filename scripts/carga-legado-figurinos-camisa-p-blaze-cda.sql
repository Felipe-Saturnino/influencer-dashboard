-- Legado Figurinos — Camisa P × 22 (Blaze + CDA)
-- Executar no SQL Editor do Supabase (postgres).
--
-- Pré-requisito: função rh_figurino_criar_pecas_lote no banco
-- (criada ao rodar scripts/carga-lote-rh-figurinos.sql passo 2
--  ou scripts/carga-legado-figurinos-camisa-blaze-cda-2026.sql).
--
-- Estúdios: slug blaze + cda | Data: 01/01/2026
-- Códigos: próximo sequencial CAM-* (ex.: CAM-000078 se já existirem 77 Camisas).

SELECT *
FROM public.rh_figurino_criar_pecas_lote(
  p_estudio_slugs   := ARRAY['blaze', 'cda']::text[],
  p_category        := 'Camisa'::text,
  p_size            := 'P'::text,
  p_purchase_date   := DATE '2026-01-01',
  p_quantidade      := 22,
  p_actor           := 'carga-legado'::text,
  p_description     := 'Legado — Camisa P — Blaze + CDA'::text
);

-- Conferência:
-- SELECT code, size, purchase_date
-- FROM public.rh_figurino_pecas
-- WHERE category = 'Camisa' AND size = 'P'
-- ORDER BY code;
