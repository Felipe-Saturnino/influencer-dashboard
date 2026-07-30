-- KPIs operacionais de Game Presenters (origem: ClickHouse via Grafana GP KPI).
-- Carga por scripts/grafana-gp-kpi-run.mjs (service role). Doc: docs/SETUP-GP-KPI-GRAFANA.md
--
-- Granularidade: dia de Brasília × mesa (table_id) × Game Presenter.
-- Médias NÃO são gravadas: guardamos soma + amostras para permitir reagregação correta
-- por mesa, estúdio, GP ou competência sem média de médias.

CREATE TABLE public.gp_kpi_diario (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_brt              date        NOT NULL,
  ambiente             text        NOT NULL,
  table_id             text        NOT NULL,
  game_presenter_id    text        NOT NULL,

  mesa_id              uuid        REFERENCES public.mesas_spin_cadastro (id) ON DELETE SET NULL,
  funcionario_id       uuid        REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,
  estudio_slug         text        REFERENCES public.estudios_spin (slug) ON UPDATE CASCADE ON DELETE SET NULL,
  operadora_slug       text        REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE SET NULL,

  rodadas              bigint      NOT NULL DEFAULT 0,

  dealing_ms_soma      double precision NOT NULL DEFAULT 0,
  dealing_amostras     bigint      NOT NULL DEFAULT 0,
  reaction_ms_soma     double precision NOT NULL DEFAULT 0,
  reaction_amostras    bigint      NOT NULL DEFAULT 0,
  coop_velocidade      bigint      NOT NULL DEFAULT 0,
  coop_roda            bigint      NOT NULL DEFAULT 0,

  sincronizado_em      timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gp_kpi_diario_table_id_trim CHECK (btrim(table_id) <> ''),
  CONSTRAINT gp_kpi_diario_gp_trim CHECK (btrim(game_presenter_id) <> ''),
  CONSTRAINT gp_kpi_diario_ambiente_trim CHECK (btrim(ambiente) <> ''),
  CONSTRAINT gp_kpi_diario_chave UNIQUE (dia_brt, ambiente, table_id, game_presenter_id)
);

COMMENT ON TABLE public.gp_kpi_diario IS
  'KPIs diários de Game Presenters por mesa — extraídos do ClickHouse (dashboard Grafana GP KPI) e vinculados às mesas Spin.';
COMMENT ON COLUMN public.gp_kpi_diario.table_id IS
  'table_id no ClickHouse — igual ao ID Spin em mesas_spin_cadastro.mesa_identificacao (ex.: bac-cmuSG6116).';
COMMENT ON COLUMN public.gp_kpi_diario.game_presenter_id IS
  'Work ID do Game Presenter no Grafana/ClickHouse (ex.: SG000191). Na plataforma é o ID operacional (rh_funcionarios.staff_id_operacional), editado em Gestão de Staff.';
COMMENT ON COLUMN public.gp_kpi_diario.funcionario_id IS
  'UUID do staff em rh_funcionarios, resolvido por staff_id_operacional = game_presenter_id (Work ID). Nulo se o ID operacional não estiver cadastrado.';
COMMENT ON COLUMN public.gp_kpi_diario.dia_brt IS
  'Dia operacional em America/Sao_Paulo — referência temporal única da carga e dos dashboards.';
COMMENT ON COLUMN public.gp_kpi_diario.dealing_ms_soma IS
  'Soma do tempo de distribuição em milissegundos; média = dealing_ms_soma / dealing_amostras.';
COMMENT ON COLUMN public.gp_kpi_diario.coop_velocidade IS
  'Rodadas dentro da faixa de velocidade solicitada (Roleta e DiamondRush).';

CREATE INDEX idx_gp_kpi_diario_dia_brt ON public.gp_kpi_diario (dia_brt);
CREATE INDEX idx_gp_kpi_diario_gp ON public.gp_kpi_diario (game_presenter_id);
CREATE INDEX idx_gp_kpi_diario_table_id ON public.gp_kpi_diario (lower(btrim(table_id)));
CREATE INDEX idx_gp_kpi_diario_estudio ON public.gp_kpi_diario (estudio_slug);
CREATE INDEX idx_gp_kpi_diario_mesa ON public.gp_kpi_diario (mesa_id);
CREATE INDEX idx_gp_kpi_diario_funcionario ON public.gp_kpi_diario (funcionario_id);

CREATE OR REPLACE FUNCTION public.gp_kpi_diario_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gp_kpi_diario_upd ON public.gp_kpi_diario;
CREATE TRIGGER trg_gp_kpi_diario_upd
  BEFORE UPDATE ON public.gp_kpi_diario
  FOR EACH ROW EXECUTE PROCEDURE public.gp_kpi_diario_touch_updated_at();

-- Escrita: somente service role (script de carga). Leitura: admin/gestor ou escopo do estúdio.
ALTER TABLE public.gp_kpi_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY gp_kpi_diario_select
  ON public.gp_kpi_diario FOR SELECT TO authenticated
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
