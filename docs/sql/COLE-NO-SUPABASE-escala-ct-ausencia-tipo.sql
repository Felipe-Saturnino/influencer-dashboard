-- Cole no Supabase SQL Editor se a migration ainda não estiver aplicada.
-- Espelha: supabase/migrations/20261213180000_escala_ct_ausencia_tipo.sql

ALTER TABLE public.escala_ct_ausencia
  ADD COLUMN IF NOT EXISTS tipo_ausencia text;

ALTER TABLE public.escala_ct_ausencia
  DROP CONSTRAINT IF EXISTS escala_ct_ausencia_tipo_chk;

ALTER TABLE public.escala_ct_ausencia
  ADD CONSTRAINT escala_ct_ausencia_tipo_chk CHECK (
    (
      motivo = 'pessoal'
      AND tipo_ausencia IN ('programada', 'nao_programada')
    )
    OR (
      motivo IS DISTINCT FROM 'pessoal'
      AND tipo_ausencia IS NULL
    )
  );

COMMENT ON COLUMN public.escala_ct_ausencia.tipo_ausencia IS
  'Só com motivo=pessoal: programada (aviso ≥24h) | nao_programada (aviso <24h).';
