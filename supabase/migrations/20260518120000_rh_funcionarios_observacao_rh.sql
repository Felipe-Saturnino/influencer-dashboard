-- Nota interna RH no cadastro do prestador (ex.: contexto após reativação; auditável no histórico).

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS observacao_rh text;

COMMENT ON COLUMN public.rh_funcionarios.observacao_rh IS 'Observação interna de RH (texto livre; alterações na reativação são registradas no histórico).';

COMMIT;
