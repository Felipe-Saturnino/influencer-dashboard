-- Legado Figurinos — Camisa P × 22 (Blaze + CDA) — lote isolado
-- Use scripts/carga-legado-figurinos-camisa-blaze-cda-2026.sql para os 5 lotes (99 peças).
--
-- Pré-requisito: função rh_figurino_criar_pecas_lote + migração genero/cor no banco.

SELECT *
FROM public.rh_figurino_criar_pecas_lote(
  p_estudio_slugs   := ARRAY['blaze', 'cda']::text[],
  p_category        := 'Camisa'::text,
  p_size            := 'P'::text,
  p_purchase_date   := DATE '2026-01-01',
  p_quantidade      := 22,
  p_actor           := 'carga-legado'::text,
  p_description     := 'Legado — Camisa P Masculino Branco — Blaze + CDA'::text,
  p_genero          := 'Masculino'::text,
  p_cor             := 'Branco'::text
);
