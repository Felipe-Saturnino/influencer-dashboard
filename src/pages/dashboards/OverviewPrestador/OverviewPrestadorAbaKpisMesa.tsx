import { useMemo, useState } from "react";
import { AlertTriangle, Hash } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { BRAND } from "../../../lib/dashboardConstants";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import {
  GAME_IDENTITY_HEX,
  GAME_IDENTITY_LABEL,
  getGameTagChipStyle,
  type GameIdentityKey,
} from "../../../lib/gameIdentityColors";
import { GAME_IDENTITY_ICONS } from "../../../lib/gameIdentityIcons";
import {
  fmtMediaSegundos,
  fmtPctCoop,
  GP_KPI_JOGOS_ORDEM,
  type GpKpiJogoLinha,
} from "../../../lib/gpKpiMetrics";
import { KpiCard, SectionTitle, SkeletonKpiCard, SortTableTh, type SortDir } from "../../../components/dashboard";
import { OverviewPrestadorKpiDuplaCard } from "./OverviewPrestadorKpiDuplaCard";
import {
  useOverviewPrestadorGpKpi,
  type GpKpiJogoComIncidentes,
} from "./useOverviewPrestadorGpKpi";
import type { MesCarrosselEscalaEntry } from "../../../lib/escalaMesCarrosselOverviewStyle";

type Props = {
  funcionarioId: string | null;
  visaoTime: boolean;
  mesSelecionado: MesCarrosselEscalaEntry | undefined;
  historico: boolean;
  staffNome?: string;
};

type SortDiaCol = "dia" | "rodadas" | "totalInc" | "casos" | "erros" | "graves";
type SortJogoCol = "jogo" | "rodadas" | "dealing" | "reaction" | "coopVel" | "coopRoda" | "incidentes";

function fmtDiaBr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function numOrNeg(v: number | null): number {
  return v == null || !Number.isFinite(v) ? Number.NEGATIVE_INFINITY : v;
}

function JogoChip({ jogo, isDark }: { jogo: Pick<GpKpiJogoLinha, "jogoKey">; isDark: boolean }) {
  const chip = getGameTagChipStyle(jogo.jogoKey, isDark);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: FONT.body,
        padding: "3px 10px",
        borderRadius: 20,
        background: chip.bg,
        color: chip.color,
        border: `1px solid ${chip.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {GAME_IDENTITY_ICONS[jogo.jogoKey]}
      {GAME_IDENTITY_LABEL[jogo.jogoKey]}
    </span>
  );
}

function cardDuplaDealingReaction(
  key: GameIdentityKey,
  atual: GpKpiJogoLinha,
  anterior: GpKpiJogoLinha,
  historico: boolean,
) {
  return (
    <OverviewPrestadorKpiDuplaCard
      key={key}
      title={GAME_IDENTITY_LABEL[key]}
      icon={GAME_IDENTITY_ICONS[key]}
      accentHex={GAME_IDENTITY_HEX[key]}
      isHistorico={historico}
      left={{
        label: "Dealing",
        value: fmtMediaSegundos(atual.dealingSeg),
        atual: atual.dealingSeg,
        anterior: anterior.dealingSeg,
        isInverso: true,
      }}
      right={{
        label: "Reaction",
        value: fmtMediaSegundos(atual.reactionSeg),
        atual: atual.reactionSeg,
        anterior: anterior.reactionSeg,
        isInverso: true,
      }}
    />
  );
}

function KpisMesaCards({
  rodadas,
  rodadasAnt,
  metricasJogo,
  incidentesTotal,
  incidentesTotalAnt,
  historico,
}: {
  rodadas: number;
  rodadasAnt: number;
  metricasJogo: Record<GameIdentityKey, { atual: GpKpiJogoLinha; anterior: GpKpiJogoLinha }>;
  incidentesTotal: number;
  incidentesTotalAnt: number;
  historico: boolean;
}) {
  const roleta = metricasJogo.roleta;

  return (
    <div className="app-grid-kpi-6" style={{ gap: 12 }}>
      <KpiCard
        label="Rodadas"
        value={rodadas.toLocaleString("pt-BR")}
        icon={<Hash size={16} aria-hidden />}
        accentColor={BRAND.roxoVivo}
        accentVar="--brand-action"
        atual={rodadas}
        anterior={rodadasAnt}
        isHistorico={historico}
        vsLegendaSuffix="MTD mês ant."
      />
      {cardDuplaDealingReaction(
        "blackjack",
        metricasJogo.blackjack.atual,
        metricasJogo.blackjack.anterior,
        historico,
      )}
      {cardDuplaDealingReaction(
        "baccarat",
        metricasJogo.baccarat.atual,
        metricasJogo.baccarat.anterior,
        historico,
      )}
      {cardDuplaDealingReaction(
        "futebol_brasileiro",
        metricasJogo.futebol_brasileiro.atual,
        metricasJogo.futebol_brasileiro.anterior,
        historico,
      )}
      <OverviewPrestadorKpiDuplaCard
        title={GAME_IDENTITY_LABEL.roleta}
        icon={GAME_IDENTITY_ICONS.roleta}
        accentHex={GAME_IDENTITY_HEX.roleta}
        isHistorico={historico}
        left={{
          label: "Bola",
          value: fmtPctCoop(roleta.atual.coopVelPct),
          atual: roleta.atual.coopVelPct,
          anterior: roleta.anterior.coopVelPct,
        }}
        right={{
          label: "Cilindro",
          value: fmtPctCoop(roleta.atual.coopRodaPct),
          atual: roleta.atual.coopRodaPct,
          anterior: roleta.anterior.coopRodaPct,
        }}
      />
      <KpiCard
        label="Incidentes"
        value={incidentesTotal.toLocaleString("pt-BR")}
        icon={<AlertTriangle size={16} aria-hidden />}
        accentColor="#e84025"
        atual={incidentesTotal}
        anterior={incidentesTotalAnt}
        isHistorico={historico}
        isInverso
        vsLegendaSuffix="MTD mês ant."
      />
    </div>
  );
}

export function OverviewPrestadorAbaKpisMesa({
  funcionarioId,
  visaoTime,
  mesSelecionado,
  historico,
  staffNome,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const isDark = Boolean(t.isDark);

  const {
    loading,
    erro,
    agregado,
    aggAnterior,
    metricasJogo,
    incidentesAgg,
    incidentesAggAnt,
    porDia,
    porJogo,
    temDados,
  } = useOverviewPrestadorGpKpi({
    enabled: !visaoTime && Boolean(funcionarioId),
    funcionarioId,
    mesSelecionado,
    historico,
  });

  const [sortDia, setSortDia] = useState<{ col: SortDiaCol; dir: SortDir }>({ col: "dia", dir: "desc" });
  const [sortJogo, setSortJogo] = useState<{ col: SortJogoCol; dir: SortDir }>({
    col: "jogo",
    dir: "asc",
  });

  const diasOrdenados = useMemo(() => {
    const rows = [...porDia];
    const dir = sortDia.dir;
    rows.sort((a, b) => {
      switch (sortDia.col) {
        case "dia":
          return compareLocaleTexto(a.dia_brt, b.dia_brt, dir);
        case "rodadas":
          return compareNumber(a.rodadas, b.rodadas, dir);
        case "totalInc":
          return compareNumber(a.totalIncidentes, b.totalIncidentes, dir);
        case "casos":
          return compareNumber(a.casos, b.casos, dir);
        case "erros":
          return compareNumber(a.erros, b.erros, dir);
        case "graves":
          return compareNumber(a.graves, b.graves, dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [porDia, sortDia]);

  const jogosOrdenados = useMemo(() => {
    const rows: GpKpiJogoComIncidentes[] = [...porJogo];
    const dir = sortJogo.dir;
    const ordemJogo = (k: string) => {
      const i = GP_KPI_JOGOS_ORDEM.indexOf(k as (typeof GP_KPI_JOGOS_ORDEM)[number]);
      return i < 0 ? 99 : i;
    };
    rows.sort((a, b) => {
      switch (sortJogo.col) {
        case "jogo":
          return compareNumber(ordemJogo(a.jogoKey), ordemJogo(b.jogoKey), dir);
        case "rodadas":
          return compareNumber(a.rodadas, b.rodadas, dir);
        case "dealing":
          return compareNumber(numOrNeg(a.dealingSeg), numOrNeg(b.dealingSeg), dir);
        case "reaction":
          return compareNumber(numOrNeg(a.reactionSeg), numOrNeg(b.reactionSeg), dir);
        case "coopVel":
          return compareNumber(numOrNeg(a.coopVelPct), numOrNeg(b.coopVelPct), dir);
        case "coopRoda":
          return compareNumber(numOrNeg(a.coopRodaPct), numOrNeg(b.coopRodaPct), dir);
        case "incidentes":
          return compareNumber(a.incidentes, b.incidentes, dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [porJogo, sortJogo]);

  const onSortDia = (col: SortDiaCol) => {
    setSortDia((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" },
    );
  };

  const onSortJogo = (col: SortJogoCol) => {
    setSortJogo((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" },
    );
  };

  if (visaoTime || !funcionarioId) {
    return (
      <div style={pageBox}>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Selecione um Game Presenter no filtro Staff para ver os KPIs de mesa.
        </div>
      </div>
    );
  }

  const subPeriodo = historico
    ? "acumulado"
    : staffNome
      ? `${staffNome} · comparativo MTD vs mês anterior`
      : "comparativo MTD vs mês anterior";
  const subTituloKpis = historico
    ? staffNome
      ? `${staffNome} · acumulado`
      : "acumulado"
    : subPeriodo;

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub={subTituloKpis}>KPIs de Mesa</SectionTitle>

        {erro && (
          <div
            role="alert"
            aria-live="polite"
            style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
          >
            {erro}
          </div>
        )}

        {loading ? (
          <div className="app-grid-kpi-6" style={{ gap: 12 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonKpiCard key={i} />
            ))}
          </div>
        ) : !temDados ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <KpisMesaCards
            rodadas={agregado.rodadas}
            rodadasAnt={aggAnterior.rodadas}
            metricasJogo={metricasJogo}
            incidentesTotal={incidentesAgg.total}
            incidentesTotalAnt={incidentesAggAnt.total}
            historico={historico}
          />
        )}
      </div>

      {!loading && temDados && (
        <>
          <div style={pageBox}>
            <SectionTitle sub="todas as mesas do prestador agrupadas por tipo de jogo">Por Jogo</SectionTitle>
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>KPIs de mesa agregados por jogo</caption>
                <thead>
                  <tr>
                    <SortTableTh
                      label="Jogo"
                      col="jogo"
                      sortCol={sortJogo.col}
                      sortDir={sortJogo.dir}
                      onSort={onSortJogo}
                      thStyle={dataTable.thHeaderSticky}
                      align="center"
                    />
                    <SortTableTh
                      label="Rodadas"
                      col="rodadas"
                      sortCol={sortJogo.col}
                      sortDir={sortJogo.dir}
                      onSort={onSortJogo}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Dealing"
                      col="dealing"
                      sortCol={sortJogo.col}
                      sortDir={sortJogo.dir}
                      onSort={onSortJogo}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Reaction"
                      col="reaction"
                      sortCol={sortJogo.col}
                      sortDir={sortJogo.dir}
                      onSort={onSortJogo}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Coop. Vel."
                      col="coopVel"
                      sortCol={sortJogo.col}
                      sortDir={sortJogo.dir}
                      onSort={onSortJogo}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Coop. Roda"
                      col="coopRoda"
                      sortCol={sortJogo.col}
                      sortDir={sortJogo.dir}
                      onSort={onSortJogo}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Incidentes"
                      col="incidentes"
                      sortCol={sortJogo.col}
                      sortDir={sortJogo.dir}
                      onSort={onSortJogo}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                  </tr>
                </thead>
                <tbody>
                  {jogosOrdenados.map((row, i) => (
                    <tr key={row.jogoKey} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky({ rowIndex: i })}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <JogoChip jogo={row} isDark={isDark} />
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>{row.rodadas.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{fmtMediaSegundos(row.dealingSeg)}</td>
                      <td style={dataTable.tdCenter}>{fmtMediaSegundos(row.reactionSeg)}</td>
                      <td style={dataTable.tdCenter}>{fmtPctCoop(row.coopVelPct)}</td>
                      <td style={dataTable.tdCenter}>{fmtPctCoop(row.coopRodaPct)}</td>
                      <td style={dataTable.tdCenter}>{row.incidentes.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...pageBox, marginBottom: 0 }}>
            <SectionTitle
              sub={
                historico
                  ? "mês a mês · rodadas e incidentes por categoria"
                  : "dia a dia · rodadas e incidentes por categoria"
              }
            >
              Detalhamento Diário
            </SectionTitle>
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>Rodadas e incidentes por dia</caption>
                <thead>
                  <tr>
                    <SortTableTh
                      label="Data"
                      col="dia"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeaderSticky}
                      align="center"
                    />
                    <SortTableTh
                      label="Rodadas"
                      col="rodadas"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Total de Incidentes"
                      col="totalInc"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Casos"
                      col="casos"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Erros"
                      col="erros"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Graves"
                      col="graves"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                  </tr>
                </thead>
                <tbody>
                  {diasOrdenados.map((row, i) => (
                    <tr key={row.dia_brt} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky({ rowIndex: i })}>
                        <span style={{ fontWeight: 600 }}>{fmtDiaBr(row.dia_brt)}</span>
                      </td>
                      <td style={dataTable.tdCenter}>{row.rodadas.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.totalIncidentes.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.casos.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.erros.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.graves.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
