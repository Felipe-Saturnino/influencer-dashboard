import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleAlert,
  FileWarning,
  Hash,
  Layers,
} from "lucide-react";
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
  SHUFFLER_KPI_JOGOS_ORDEM,
  type GpKpiJogoLinha,
} from "../../../lib/gpKpiMetrics";
import type { OverviewPrestadorKpisMesaMode } from "../../../lib/overviewPrestadorTeamConfig";
import { KpiCard, SectionTitle, SkeletonKpiCard, SortTableTh, type SortDir } from "../../../components/dashboard";
import { OverviewPrestadorKpiDuplaCard } from "./OverviewPrestadorKpiDuplaCard";
import {
  useOverviewPrestadorGpKpi,
  type GpKpiJogoComIncidentes,
} from "./useOverviewPrestadorGpKpi";
import type { MesCarrosselEscalaEntry } from "../../../lib/escalaMesCarrosselOverviewStyle";

type Props = {
  funcionarioIds: string[];
  prestadores: { id: string; nome: string }[];
  visaoTime: boolean;
  mesSelecionado: MesCarrosselEscalaEntry | undefined;
  historico: boolean;
  staffNome?: string;
  mode: OverviewPrestadorKpisMesaMode;
};

type SortDiaCol = "dia" | "rodadas" | "totalInc" | "casos" | "erros" | "outros";
type SortJogoColGp = "jogo" | "rodadas" | "dealing" | "reaction" | "coopVel" | "coopRoda" | "incidentes";
type SortJogoColShuf = "jogo" | "totalInc" | "casos" | "erros" | "outros";
type SortAtencaoCol = "nome" | "totalInc" | "casos" | "erros" | "outros" | "severidade";

function fmtDiaBr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function numOrNeg(v: number | null): number {
  return v == null || !Number.isFinite(v) ? Number.NEGATIVE_INFINITY : v;
}

function JogoChip({ jogoKey, isDark }: { jogoKey: GameIdentityKey; isDark: boolean }) {
  const chip = getGameTagChipStyle(jogoKey, isDark);
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
      {GAME_IDENTITY_ICONS[jogoKey]}
      {GAME_IDENTITY_LABEL[jogoKey]}
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
        label: "Velocidade",
        value: fmtMediaSegundos(atual.dealingSeg),
        atual: atual.dealingSeg,
        anterior: anterior.dealingSeg,
        isInverso: true,
      }}
      right={{
        label: "Reação",
        value: fmtMediaSegundos(atual.reactionSeg),
        atual: atual.reactionSeg,
        anterior: anterior.reactionSeg,
        isInverso: true,
      }}
    />
  );
}

function KpisMesaCardsGp({
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
        vsLegendaSuffix="mês ant."
      />
      {cardDuplaDealingReaction("blackjack", metricasJogo.blackjack.atual, metricasJogo.blackjack.anterior, historico)}
      {cardDuplaDealingReaction("baccarat", metricasJogo.baccarat.atual, metricasJogo.baccarat.anterior, historico)}
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
        vsLegendaSuffix="mês ant."
      />
    </div>
  );
}

function KpisMesaCardsIncidentes({
  total,
  totalAnt,
  casos,
  casosAnt,
  erros,
  errosAnt,
  outros,
  outrosAnt,
  historico,
}: {
  total: number;
  totalAnt: number;
  casos: number;
  casosAnt: number;
  erros: number;
  errosAnt: number;
  outros: number;
  outrosAnt: number;
  historico: boolean;
}) {
  return (
    <div className="app-grid-kpi-4" style={{ gap: 12 }}>
      <KpiCard
        label="Incidentes"
        value={total.toLocaleString("pt-BR")}
        icon={<AlertTriangle size={16} aria-hidden />}
        accentColor="#e84025"
        atual={total}
        anterior={totalAnt}
        isHistorico={historico}
        isInverso
        vsLegendaSuffix="mês ant."
      />
      <KpiCard
        label="Casos"
        value={casos.toLocaleString("pt-BR")}
        icon={<FileWarning size={16} aria-hidden />}
        accentColor={BRAND.amarelo}
        atual={casos}
        anterior={casosAnt}
        isHistorico={historico}
        isInverso
        vsLegendaSuffix="mês ant."
      />
      <KpiCard
        label="Erros"
        value={erros.toLocaleString("pt-BR")}
        icon={<CircleAlert size={16} aria-hidden />}
        accentColor="#e84025"
        atual={erros}
        anterior={errosAnt}
        isHistorico={historico}
        isInverso
        vsLegendaSuffix="mês ant."
      />
      <KpiCard
        label="Outros"
        value={outros.toLocaleString("pt-BR")}
        icon={<Layers size={16} aria-hidden />}
        accentColor="#6b7280"
        atual={outros}
        anterior={outrosAnt}
        isHistorico={historico}
        isInverso
        vsLegendaSuffix="mês ant."
      />
    </div>
  );
}

export function OverviewPrestadorAbaKpisMesa({
  funcionarioIds,
  prestadores,
  visaoTime,
  mesSelecionado,
  historico,
  staffNome,
  mode,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const isDark = Boolean(t.isDark);

  if (mode === "hidden" || mode === "sm") return null;

  if (funcionarioIds.length === 0) {
    return (
      <div style={pageBox}>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {visaoTime
            ? "Selecione um time para visualizar os resultados."
            : "Selecione um prestador no filtro Staff para ver os KPIs de mesa."}
        </div>
      </div>
    );
  }

  return (
    <OverviewPrestadorAbaKpisMesaConteudo
      funcionarioIds={funcionarioIds}
      prestadores={prestadores}
      visaoTime={visaoTime}
      mesSelecionado={mesSelecionado}
      historico={historico}
      staffNome={staffNome}
      mode={mode}
      t={t}
      dataTable={dataTable}
      pageBox={pageBox}
      isDark={isDark}
    />
  );
}

function OverviewPrestadorAbaKpisMesaConteudo({
  funcionarioIds,
  prestadores,
  visaoTime,
  mesSelecionado,
  historico,
  staffNome,
  mode,
  t,
  dataTable,
  pageBox,
  isDark,
}: Props & {
  t: ReturnType<typeof useApp>["theme"];
  dataTable: ReturnType<typeof useDataTableBlock>;
  pageBox: ReturnType<typeof getPageContentBoxStyle>;
  isDark: boolean;
}) {
  const {
    loading,
    erro,
    agregado,
    aggAnterior,
    metricasJogo,
    incidentesAgg,
    incidentesAggAnt,
    porDia,
    porDiaShuffler,
    porJogo,
    porJogoShuffler,
    pontosAtencao,
  } = useOverviewPrestadorGpKpi({
    enabled: mode === "gp" || mode === "shuffler",
    funcionarioIds,
    prestadores,
    mesSelecionado,
    historico,
    mode,
  });

  const [sortDia, setSortDia] = useState<{ col: SortDiaCol; dir: SortDir }>({ col: "dia", dir: "desc" });
  const [sortJogoGp, setSortJogoGp] = useState<{ col: SortJogoColGp; dir: SortDir }>({
    col: "jogo",
    dir: "asc",
  });
  const [sortJogoShuf, setSortJogoShuf] = useState<{ col: SortJogoColShuf; dir: SortDir }>({
    col: "jogo",
    dir: "asc",
  });
  const [sortAtencao, setSortAtencao] = useState<{ col: SortAtencaoCol; dir: SortDir }>({
    col: "totalInc",
    dir: "desc",
  });

  const diasGpOrdenados = useMemo(() => {
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
        case "outros":
          return compareNumber(a.outros, b.outros, dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [porDia, sortDia]);

  const diasShufOrdenados = useMemo(() => {
    const rows = [...porDiaShuffler];
    const dir = sortDia.dir;
    rows.sort((a, b) => {
      switch (sortDia.col) {
        case "dia":
          return compareLocaleTexto(a.dia, b.dia, dir);
        case "totalInc":
          return compareNumber(a.total, b.total, dir);
        case "casos":
          return compareNumber(a.casos, b.casos, dir);
        case "erros":
          return compareNumber(a.erros, b.erros, dir);
        case "outros":
          return compareNumber(a.outros, b.outros, dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [porDiaShuffler, sortDia]);

  const jogosGpOrdenados = useMemo(() => {
    const rows: GpKpiJogoComIncidentes[] = [...porJogo];
    const dir = sortJogoGp.dir;
    const ordemJogo = (k: string) => {
      const i = GP_KPI_JOGOS_ORDEM.indexOf(k as GameIdentityKey);
      return i < 0 ? 99 : i;
    };
    rows.sort((a, b) => {
      switch (sortJogoGp.col) {
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
  }, [porJogo, sortJogoGp]);

  const jogosShufOrdenados = useMemo(() => {
    const rows = [...porJogoShuffler];
    const dir = sortJogoShuf.dir;
    const ordemJogo = (k: string) => {
      const i = SHUFFLER_KPI_JOGOS_ORDEM.indexOf(k as GameIdentityKey);
      return i < 0 ? 99 : i;
    };
    rows.sort((a, b) => {
      switch (sortJogoShuf.col) {
        case "jogo":
          return compareNumber(ordemJogo(a.jogoKey), ordemJogo(b.jogoKey), dir);
        case "totalInc":
          return compareNumber(a.total, b.total, dir);
        case "casos":
          return compareNumber(a.casos, b.casos, dir);
        case "erros":
          return compareNumber(a.erros, b.erros, dir);
        case "outros":
          return compareNumber(a.outros, b.outros, dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [porJogoShuffler, sortJogoShuf]);

  const atencaoOrdenados = useMemo(() => {
    const rows = [...pontosAtencao];
    const dir = sortAtencao.dir;
    const rank = { alta: 0, media: 1, ok: 2 };
    rows.sort((a, b) => {
      switch (sortAtencao.col) {
        case "nome":
          return compareLocaleTexto(a.nome, b.nome, dir);
        case "totalInc":
          return compareNumber(a.total, b.total, dir);
        case "casos":
          return compareNumber(a.casos, b.casos, dir);
        case "erros":
          return compareNumber(a.erros, b.erros, dir);
        case "outros":
          return compareNumber(a.outros, b.outros, dir);
        case "severidade":
          return compareNumber(rank[a.severidade], rank[b.severidade], dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [pontosAtencao, sortAtencao]);

  const subTituloKpis = historico
    ? staffNome
      ? `${staffNome} · acumulado`
      : visaoTime
        ? "consolidado do time · acumulado"
        : "acumulado"
    : staffNome
      ? `${staffNome} · mês completo vs mês anterior`
      : visaoTime
        ? "consolidado do time · mês completo vs mês anterior"
        : "mês completo vs mês anterior";

  const vazio = (
    <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
      Sem dados para o período selecionado.
    </div>
  );

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
          <div className={mode === "gp" ? "app-grid-kpi-6" : "app-grid-kpi-4"} style={{ gap: 12 }}>
            {Array.from({ length: mode === "gp" ? 6 : 4 }, (_, i) => (
              <SkeletonKpiCard key={i} />
            ))}
          </div>
        ) : mode === "gp" ? (
          <KpisMesaCardsGp
            rodadas={agregado.rodadas}
            rodadasAnt={aggAnterior.rodadas}
            metricasJogo={metricasJogo}
            incidentesTotal={incidentesAgg.total}
            incidentesTotalAnt={incidentesAggAnt.total}
            historico={historico}
          />
        ) : (
          <KpisMesaCardsIncidentes
            total={incidentesAgg.total}
            totalAnt={incidentesAggAnt.total}
            casos={incidentesAgg.casos}
            casosAnt={incidentesAggAnt.casos}
            erros={incidentesAgg.erros}
            errosAnt={incidentesAggAnt.erros}
            outros={incidentesAgg.outros}
            outrosAnt={incidentesAggAnt.outros}
            historico={historico}
          />
        )}
      </div>

      {!loading && mode === "gp" ? (
        <div style={pageBox}>
          <SectionTitle sub={visaoTime ? "soma e médias do time por tipo de jogo" : "mesas do prestador agrupadas por tipo de jogo"}>
            Por Jogo
          </SectionTitle>
          {jogosGpOrdenados.length === 0 ? (
            vazio
          ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>KPIs de mesa agregados por jogo</caption>
              <thead>
                <tr>
                  <SortTableTh label="Jogo" col="jogo" sortCol={sortJogoGp.col} sortDir={sortJogoGp.dir} onSort={(c) => setSortJogoGp((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "asc" }))} thStyle={dataTable.thHeaderSticky} align="center" />
                  <SortTableTh label="Rodadas" col="rodadas" sortCol={sortJogoGp.col} sortDir={sortJogoGp.dir} onSort={(c) => setSortJogoGp((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Velocidade" col="dealing" sortCol={sortJogoGp.col} sortDir={sortJogoGp.dir} onSort={(c) => setSortJogoGp((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Reação" col="reaction" sortCol={sortJogoGp.col} sortDir={sortJogoGp.dir} onSort={(c) => setSortJogoGp((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Bola" col="coopVel" sortCol={sortJogoGp.col} sortDir={sortJogoGp.dir} onSort={(c) => setSortJogoGp((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Cilindro" col="coopRoda" sortCol={sortJogoGp.col} sortDir={sortJogoGp.dir} onSort={(c) => setSortJogoGp((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Incidentes" col="incidentes" sortCol={sortJogoGp.col} sortDir={sortJogoGp.dir} onSort={(c) => setSortJogoGp((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                </tr>
              </thead>
              <tbody>
                {jogosGpOrdenados.map((row, i) => (
                  <tr key={row.jogoKey} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdSticky({ rowIndex: i })}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <JogoChip jogoKey={row.jogoKey} isDark={isDark} />
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
          )}
        </div>
      ) : null}

      {!loading && mode === "shuffler" ? (
        <div style={pageBox}>
          <SectionTitle sub="incidentes por tipo de jogo (sem Roleta)">Por Jogo</SectionTitle>
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 560 })}>
              <caption style={{ display: "none" }}>Incidentes por jogo — Shuffler</caption>
              <thead>
                <tr>
                  <SortTableTh label="Jogo" col="jogo" sortCol={sortJogoShuf.col} sortDir={sortJogoShuf.dir} onSort={(c) => setSortJogoShuf((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "asc" }))} thStyle={dataTable.thHeaderSticky} align="center" />
                  <SortTableTh label="Total de Incidentes" col="totalInc" sortCol={sortJogoShuf.col} sortDir={sortJogoShuf.dir} onSort={(c) => setSortJogoShuf((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Casos" col="casos" sortCol={sortJogoShuf.col} sortDir={sortJogoShuf.dir} onSort={(c) => setSortJogoShuf((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Erros" col="erros" sortCol={sortJogoShuf.col} sortDir={sortJogoShuf.dir} onSort={(c) => setSortJogoShuf((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Outros" col="outros" sortCol={sortJogoShuf.col} sortDir={sortJogoShuf.dir} onSort={(c) => setSortJogoShuf((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                </tr>
              </thead>
              <tbody>
                {jogosShufOrdenados.map((row, i) => (
                  <tr key={row.jogoKey} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdSticky({ rowIndex: i })}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <JogoChip jogoKey={row.jogoKey} isDark={isDark} />
                      </div>
                    </td>
                    <td style={dataTable.tdCenter}>{row.total.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{row.casos.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{row.erros.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{row.outros.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && visaoTime ? (
        <div style={pageBox}>
          <SectionTitle sub="prestadores com incidentes no período">Pontos de atenção</SectionTitle>
          {atencaoOrdenados.length === 0 ? (
            vazio
          ) : (
            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 640 })}>
                <caption style={{ display: "none" }}>Prestadores com incidentes</caption>
                <thead>
                  <tr>
                    <SortTableTh label="Prestador" col="nome" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "asc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Incidentes" col="totalInc" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Casos" col="casos" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Erros" col="erros" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Outros" col="outros" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Severidade" col="severidade" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "asc" }))} thStyle={dataTable.thHeader} align="center" />
                  </tr>
                </thead>
                <tbody>
                  {atencaoOrdenados.map((r, i) => (
                    <tr key={r.prestadorId} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdCenter}>{r.nome}</td>
                      <td style={dataTable.tdCenter}>{r.total}</td>
                      <td style={dataTable.tdCenter}>{r.casos}</td>
                      <td style={dataTable.tdCenter}>{r.erros}</td>
                      <td style={dataTable.tdCenter}>{r.outros}</td>
                      <td style={dataTable.tdCenter}>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {!loading ? (
        <div style={{ ...pageBox, marginBottom: 0 }}>
          <SectionTitle
            sub={
              historico
                ? "mês a mês · incidentes por categoria"
                : mode === "gp"
                  ? "dia a dia · rodadas e incidentes por categoria"
                  : "dia a dia · incidentes por categoria"
            }
          >
            Detalhamento Diário
          </SectionTitle>
          {(mode === "gp" ? diasGpOrdenados.length === 0 : diasShufOrdenados.length === 0) ? (
            vazio
          ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            {mode === "gp" ? (
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>Rodadas e incidentes por dia</caption>
                <thead>
                  <tr>
                    <SortTableTh label="Data" col="dia" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeaderSticky} align="center" />
                    <SortTableTh label="Rodadas" col="rodadas" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Total de Incidentes" col="totalInc" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Casos" col="casos" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Erros" col="erros" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Outros" col="outros" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  </tr>
                </thead>
                <tbody>
                  {diasGpOrdenados.map((row, i) => (
                    <tr key={row.dia_brt} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky({ rowIndex: i })}>
                        <span style={{ fontWeight: 600 }}>{fmtDiaBr(row.dia_brt)}</span>
                      </td>
                      <td style={dataTable.tdCenter}>{row.rodadas.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.totalIncidentes.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.casos.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.erros.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.outros.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={getDataTableStyle({ minWidth: 560 })}>
                <caption style={{ display: "none" }}>Incidentes por dia — Shuffler</caption>
                <thead>
                  <tr>
                    <SortTableTh label="Data" col="dia" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeaderSticky} align="center" />
                    <SortTableTh label="Total de Incidentes" col="totalInc" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Casos" col="casos" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Erros" col="erros" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Outros" col="outros" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  </tr>
                </thead>
                <tbody>
                  {diasShufOrdenados.map((row, i) => (
                    <tr key={row.dia} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky({ rowIndex: i })}>
                        <span style={{ fontWeight: 600 }}>{fmtDiaBr(row.dia)}</span>
                      </td>
                      <td style={dataTable.tdCenter}>{row.total.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.casos.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.erros.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{row.outros.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}
        </div>
      ) : null}
    </>
  );
}
