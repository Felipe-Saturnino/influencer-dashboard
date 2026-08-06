-- =============================================================================
-- Manual (SQL Editor / service role) — NÃO é migration.
-- Exclui o duplicado ERRO-00033 e reajusta a sequência de protocolos ERRO-
-- para o próximo número ser max(existente) + 1 (ex.: se ficar ERRO-00032 → próximo ERRO-00033).
-- =============================================================================
-- Storage: NÃO apagar storage.objects via SQL (erro 42501 / protect_delete).
-- Anexos em estudio_incidente_anexos caem por ON DELETE CASCADE.
-- Arquivos órfãos no bucket estudio-incidentes (se houver) limpar pelo
-- Dashboard Storage ou Storage API — opcional; não bloqueiam o protocolo.
-- =============================================================================

BEGIN;

-- Conferência (opcional):
-- SELECT id, protocolo, incidente, created_at, prestador_nome, mesa_label
-- FROM public.estudio_incidentes
-- WHERE protocolo = 'ERRO-00033';

DELETE FROM public.estudio_incidentes
WHERE protocolo = 'ERRO-00033';

-- setval(n) com is_called=true ⇒ próximo nextval = n + 1
SELECT setval(
  'public.estudio_incidente_protocolo_erro_seq',
  COALESCE(
    (
      SELECT MAX(SUBSTRING(protocolo FROM 6)::int)
      FROM public.estudio_incidentes
      WHERE protocolo ~ '^ERRO-[0-9]+$'
    ),
    0
  ),
  true
) AS seq_last_value;

COMMIT;

-- Conferência pós-commit:
-- SELECT protocolo FROM public.estudio_incidentes
-- WHERE protocolo LIKE 'ERRO-%' ORDER BY protocolo DESC LIMIT 5;
-- SELECT last_value, is_called FROM public.estudio_incidente_protocolo_erro_seq;
