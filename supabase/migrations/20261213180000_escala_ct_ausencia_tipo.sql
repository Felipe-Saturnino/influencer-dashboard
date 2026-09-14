-- Controle de Turno → Notificações → Ausência: Tipo de Ausência (só Motivo Pessoal).
-- Valores: programada | nao_programada. Obrigatório na UI quando motivo = pessoal.

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
