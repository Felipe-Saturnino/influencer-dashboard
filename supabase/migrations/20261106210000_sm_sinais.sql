-- Sinais atendidos por Service Managers (origem: ClickHouse stats_signals via Grafana S&SM Reports).
-- Granularidade: 1 linha = 1 signal_id. Durações calculadas na UI (não gravadas).
-- Creator: Work ID quando Presenter (SG…); Resolver: UUID TOS (signal_resolver_id).
--
-- Tempos: o ClickHouse/Grafana entrega UTC. Gravamos o instante absoluto (*_at timestamptz)
-- e o relógio de parede em America/Sao_Paulo (*_at_brt timestamp sem fuso) + dia_brt.

BEGIN;

CREATE TABLE public.sm_sinais (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id                 text        NOT NULL,
  ambiente                  text        NOT NULL DEFAULT 'live-sg',

  -- Instante absoluto (UTC no fio; timestamptz no Postgres)
  issued_at                 timestamptz NOT NULL,
  taken_at                  timestamptz,
  timer_stopped_at          timestamptz NOT NULL,

  -- Relógio de parede America/Sao_Paulo (sem fuso — valor local BR)
  issued_at_brt             timestamp   NOT NULL,
  taken_at_brt              timestamp,
  timer_stopped_at_brt      timestamp   NOT NULL,
  dia_brt                   date        NOT NULL,

  table_id                  text        NOT NULL,
  game_type                 text,
  signal_type               text        NOT NULL,
  resolution_conclusion     text,

  creator_id                text,
  creator_screen_name       text,
  creator_type              text,
  creator_funcionario_id    uuid        REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,

  resolver_id               text        NOT NULL,
  resolver_screen_name      text,
  resolver_funcionario_id   uuid        REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,

  mesa_id                   uuid        REFERENCES public.mesas_spin_cadastro (id) ON DELETE SET NULL,
  estudio_slug              text        REFERENCES public.estudios_spin (slug) ON UPDATE CASCADE ON DELETE SET NULL,

  sincronizado_em           timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sm_sinais_signal_id_trim CHECK (btrim(signal_id) <> ''),
  CONSTRAINT sm_sinais_ambiente_trim CHECK (btrim(ambiente) <> ''),
  CONSTRAINT sm_sinais_table_id_trim CHECK (btrim(table_id) <> ''),
  CONSTRAINT sm_sinais_resolver_id_trim CHECK (btrim(resolver_id) <> ''),
  CONSTRAINT sm_sinais_chave UNIQUE (ambiente, signal_id)
);

COMMENT ON TABLE public.sm_sinais IS
  'Sinais resolvidos por Service Manager — extraídos do ClickHouse (Grafana S&SM Reports / stats_signals). Tempos em UTC (*_at) e relógio BR (*_at_brt).';
COMMENT ON COLUMN public.sm_sinais.signal_id IS
  'Identificador do sinal no ClickHouse (ex.: SG20260806231952…).';
COMMENT ON COLUMN public.sm_sinais.issued_at IS
  'Signal Issued — instante absoluto (origem UTC no Grafana/ClickHouse).';
COMMENT ON COLUMN public.sm_sinais.taken_at IS
  'Signal Taken — instante absoluto (UTC).';
COMMENT ON COLUMN public.sm_sinais.timer_stopped_at IS
  'Signal Resolved (timer_stopped_at no Grafana) — instante absoluto (UTC).';
COMMENT ON COLUMN public.sm_sinais.issued_at_brt IS
  'Signal Issued em America/Sao_Paulo (timestamp sem fuso = relógio de parede BR).';
COMMENT ON COLUMN public.sm_sinais.taken_at_brt IS
  'Signal Taken em America/Sao_Paulo (relógio de parede BR).';
COMMENT ON COLUMN public.sm_sinais.timer_stopped_at_brt IS
  'Signal Resolved em America/Sao_Paulo (relógio de parede BR).';
COMMENT ON COLUMN public.sm_sinais.dia_brt IS
  'Dia operacional America/Sao_Paulo derivado de issued_at — filtros e carrossel.';
COMMENT ON COLUMN public.sm_sinais.creator_id IS
  'Quem abriu: Work ID (SG…) quando Presenter; UUID quando ServiceManager; vazio quando Workstation.';
COMMENT ON COLUMN public.sm_sinais.resolver_id IS
  'UUID TOS de quem assumiu/resolveu (signal_resolver_id). De-para: rh_funcionarios.staff_id_tos.';
COMMENT ON COLUMN public.sm_sinais.resolver_funcionario_id IS
  'UUID do SM em rh_funcionarios, resolvido por staff_id_tos = resolver_id. Nulo se ID TOS não cadastrado.';
COMMENT ON COLUMN public.sm_sinais.creator_funcionario_id IS
  'UUID do criador quando creator_id é Work ID (staff_id_operacional). Nulo se Workstation ou ID não cadastrado.';

CREATE INDEX idx_sm_sinais_dia_brt ON public.sm_sinais (dia_brt);
CREATE INDEX idx_sm_sinais_issued_at ON public.sm_sinais (issued_at);
CREATE INDEX idx_sm_sinais_timer_stopped ON public.sm_sinais (timer_stopped_at);
CREATE INDEX idx_sm_sinais_issued_at_brt ON public.sm_sinais (issued_at_brt);
CREATE INDEX idx_sm_sinais_timer_stopped_brt ON public.sm_sinais (timer_stopped_at_brt);
CREATE INDEX idx_sm_sinais_table_id ON public.sm_sinais (lower(btrim(table_id)));
CREATE INDEX idx_sm_sinais_resolver_id ON public.sm_sinais (lower(btrim(resolver_id)));
CREATE INDEX idx_sm_sinais_resolver_funcionario ON public.sm_sinais (resolver_funcionario_id);
CREATE INDEX idx_sm_sinais_creator_funcionario ON public.sm_sinais (creator_funcionario_id);
CREATE INDEX idx_sm_sinais_estudio ON public.sm_sinais (estudio_slug);
CREATE INDEX idx_sm_sinais_signal_type ON public.sm_sinais (signal_type);

CREATE OR REPLACE FUNCTION public.sm_sinais_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sm_sinais_upd ON public.sm_sinais;
CREATE TRIGGER trg_sm_sinais_upd
  BEFORE UPDATE ON public.sm_sinais
  FOR EACH ROW EXECUTE PROCEDURE public.sm_sinais_touch_updated_at();

ALTER TABLE public.sm_sinais ENABLE ROW LEVEL SECURITY;

CREATE POLICY sm_sinais_select
  ON public.sm_sinais FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor')
    )
    OR (
      estudio_slug IS NOT NULL
      AND public._estudios_spin_scope_estudio(estudio_slug)
    )
  );

COMMIT;
