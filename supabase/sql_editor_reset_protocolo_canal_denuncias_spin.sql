-- =============================================================================
-- Protocolo do Canal de Denúncias Spin — notas (SQL Editor, não é migration)
-- =============================================================================
--
-- A partir de 20261113120000 os NOVOS protocolos são imprevisíveis:
--   CDSPIN- + 16 caracteres hex (ex.: CDSPIN-A1B2C3D4E5F67890)
-- A sequência public.canal_denuncia_spin_protocol_seq NÃO é mais usada.
-- Protocolos antigos no formato CDSPIN00001… continuam válidos na consulta.
--
-- Resetar a sequência não altera o gerador novo. Só faz sentido em ambiente
-- de teste se ainda existirem linhas no formato legado e alguém for recriar
-- denúncias pelo código antigo (não aplicar em produção).
--
-- -----------------------------------------------------------------------------
-- Ambiente de teste: apagar denúncias de teste (CUIDADO — produção = real)
-- -----------------------------------------------------------------------------
-- CUIDADO: apaga denúncias, histórico de status, anotações. Limpe o bucket
-- canal-denuncias-spin à parte se houver arquivos.
/*
BEGIN;

TRUNCATE TABLE public.canal_denuncias_spin CASCADE;
TRUNCATE TABLE public.canal_denuncia_spin_rate_event;

COMMIT;
*/
