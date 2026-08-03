import { Fragment, useMemo, useState } from "react";
import { ChevronRight, Gauge, Hash, RotateCw, Timer, Zap } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { BRAND } from "../../../lib/dashboardConstants";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { GAME_IDENTITY_LABEL, getGameTagChipStyle } from "../../../lib/gameIdentityColors";
import { GAME_IDENTITY_ICONS } from "../../../lib/gameIdentityIcons";
import {
  fmtMediaSegundos,
  fmtPctCoop,
  GP_KPI_JOGOS_ORDEM,
  mediaSegundos,
  pctCoop,
  type GpKpiAgregado,
  type GpKpiJogoLinha,
} from "../../../lib/gpKpiMetrics";
import { KpiCard, SectionTitle, SkeletonKpiCard, SortTableTh, type SortDir } from "../../../components/dashboard";
import { useOverviewPrestadorGpKpi } from "./useOverviewPrestadorGpKpi";
import type { MesCarrosselEscalaEntry } from "../../../lib/escalaMesCarrosselOverviewStyle";

type Props = {
  funcionarioId: string | null;
  visaoTime: boolean;
  mesSelecionado: MesCarrosselEscalaEntry | undefined;
  historico: boolean;
  staffNome?: string;
};

type SortDiaCol = "dia" | "rodadas" | "dealing" | "reaction" | "coopVel" | "coopRoda";
type SortJogoCol = "jogo" | "dealing" | "reaction" | "coopVel" | "coopRoda";

function fmtDiaBr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function numOrNeg(v: number | null): number {
  return v == null || !Number.isFinite(v) ? Number.NEGATIVE_INFINITY : v;
}

function JogoChip({ jogo, isDark }: { jogo: GpKpiJogoLinha; isDark: boolean }) {
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

function KpisMesaCards({
  atual,
  anterior,
  historico,
}: {
  atual: GpKpiAgregado;
  anterior: GpKpiAgregado;
  historico: boolean;
}) {
  const dealing = mediaSegundos(atual.dealingMsSoma, atual.dealingAmostras);
  const reaction = mediaSegundos(atual.reactionMsSoma, atual.reactionAmostras);
  const coopVel = pctCoop(atual.coopVelocidade, atual.rodadas);
  const coopRoda = pctCoop(atual.coopRoda, atual.rodadas);

  const dealingAnt = mediaSegundos(anterior.dealingMsSoma, anterior.dealingAmostras);
  const reactionAnt = mediaSegundos(anterior.reactionMsSoma, anterior.reactionAmostras);
  const coopVelAnt = pctCoop(anterior.coopVelocidade, anterior.rodadas);
  const coopRodaAnt = pctCoop(anterior.coopRoda, anterior.rodadas);

  return (
    <div className="app-grid-kpi-5" style={{ gap: 12 }}>
      <KpiCard
        label="Rodadas"
        value={atual.rodadas.toLocaleString("pt-BR")}
        icon={<Hash size={16} aria-hidden />}
        accentColor={BRAND.roxoVivo}
        accentVar="--brand-action"
        atual={atual.rodadas}
        anterior={anterior.rodadas}
        isHistorico={historico}
        vsLegendaSuffix="MTD mês ant."
      />
      <KpiCard
        label="Dealing"
        value={fmtMediaSegundos(dealing)}
        icon={<Timer size={16} aria-hidden />}
        accentColor={BRAND.azul}
        accentVar="--brand-contrast"
        atual={dealing ?? 0}
        anterior={dealingAnt ?? 0}
        isHistorico={historico || dealing == null}
        isInverso
        vsLegendaSuffix="MTD mês ant."
      />
      <KpiCard
        label="Reaction"
        value={fmtMediaSegundos(reaction)}
        icon={<Zap size={16} aria-hidden />}
        accentColor="#a78bfa"
        atual={reaction ?? 0}
        anterior={reactionAnt ?? 0}
        isHistorico={historico || reaction == null}
        isInverso
        vsLegendaSuffix="MTD mês ant."
      />
      <KpiCard
        label="Coop. Velocidade"
        value={fmtPctCoop(coopVel)}
        icon={<Gauge size={16} aria-hidden />}
        accentColor={BRAND.verde}
        atual={coopVel ?? 0}
        anterior={coopVelAnt ?? 0}
        isHistorico={historico || coopVel == null}
        vsLegendaSuffix="MTD mês ant."
      />
      <KpiCard
        label="Coop. Roda"
        value={fmtPctCoop(coopRoda)}
        icon={<RotateCw size={16} aria-hidden />}
        accentColor={BRAND.amarelo}
        atual={coopRoda ?? 0}
        anterior={coopRodaAnt ?? 0}
        isHistorico={historico || coopRoda == null}
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

  const { loading, erro, agregado, aggAnterior, porDia, porJogo, temDados } = useOverviewPrestadorGpKpi({
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
  const [diasExpandidos, setDiasExpandidos] = useState<Set<string>>(() => new Set());

  const diasOrdenados = useMemo(() => {
    const rows = [...porDia];
    const dir = sortDia.dir;
    rows.sort((a, b) => {
      switch (sortDia.col) {
        case "dia":
          return compareLocaleTexto(a.dia_brt, b.dia_brt, dir);
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
        default:
          return 0;
      }
    });
    return rows;
  }, [porDia, sortDia]);

  const jogosOrdenados = useMemo(() => {
    const rows = [...porJogo];
    const dir = sortJogo.dir;
    const ordemJogo = (k: string) => {
      const i = GP_KPI_JOGOS_ORDEM.indexOf(k as (typeof GP_KPI_JOGOS_ORDEM)[number]);
      return i < 0 ? 99 : i;
    };
    rows.sort((a, b) => {
      switch (sortJogo.col) {
        case "jogo":
          return compareNumber(ordemJogo(a.jogoKey), ordemJogo(b.jogoKey), dir);
        case "dealing":
          return compareNumber(numOrNeg(a.dealingSeg), numOrNeg(b.dealingSeg), dir);
        case "reaction":
          return compareNumber(numOrNeg(a.reactionSeg), numOrNeg(b.reactionSeg), dir);
        case "coopVel":
          return compareNumber(numOrNeg(a.coopVelPct), numOrNeg(b.coopVelPct), dir);
        case "coopRoda":
          return compareNumber(numOrNeg(a.coopRodaPct), numOrNeg(b.coopRodaPct), dir);
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

  const toggleDia = (dia: string) => {
    setDiasExpandidos((prev) => {
      const n = new Set(prev);
      if (n.has(dia)) n.delete(dia);
      else n.add(dia);
      return n;
    });
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
          <div className="app-grid-kpi-5" style={{ gap: 12 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonKpiCard key={i} />
            ))}
          </div>
        ) : !temDados ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <KpisMesaCards atual={agregado} anterior={aggAnterior} historico={historico} />
        )}
      </div>

      {!loading && temDados && (
        <>
          <div style={pageBox}>
            <SectionTitle sub="todas as mesas do prestador agrupadas por tipo de jogo">Por Jogo</SectionTitle>
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 640 })}>
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
                  </tr>
                </thead>
                <tbody>
                  {jogosOrdenados.map((row, i) => (
                    <tr key={row.jogoKey} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky()}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <JogoChip jogo={row} isDark={isDark} />
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>{fmtMediaSegundos(row.dealingSeg)}</td>
                      <td style={dataTable.tdCenter}>{fmtMediaSegundos(row.reactionSeg)}</td>
                      <td style={dataTable.tdCenter}>{fmtPctCoop(row.coopVelPct)}</td>
                      <td style={dataTable.tdCenter}>{fmtPctCoop(row.coopRodaPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...pageBox, marginBottom: 0 }}>
            <SectionTitle sub={historico ? "mês a mês · expandir o dia para ver por jogo" : "dia a dia · expandir para ver por jogo"}>
              Detalhamento Diário
            </SectionTitle>
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>KPIs de mesa por dia com drilldown por jogo</caption>
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
                      label="Dealing"
                      col="dealing"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Reaction"
                      col="reaction"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Coop. Vel."
                      col="coopVel"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Coop. Roda"
                      col="coopRoda"
                      sortCol={sortDia.col}
                      sortDir={sortDia.dir}
                      onSort={onSortDia}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                  </tr>
                </thead>
                <tbody>
                  {diasOrdenados.map((row, i) => {
                    const aberto = diasExpandidos.has(row.dia_brt);
                    const labelDia = fmtDiaBr(row.dia_brt);
                    return (
                      <Fragment key={row.dia_brt}>
                        <tr
                          style={{ background: dataTable.zebraRow(i), cursor: "pointer" }}
                          tabIndex={0}
                          aria-expanded={aberto}
                          onClick={() => toggleDia(row.dia_brt)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleDia(row.dia_brt);
                            }
                          }}
                        >
                          <td style={dataTable.tdSticky()}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 6,
                                width: "100%",
                              }}
                            >
                              <ChevronRight
                                size={14}
                                aria-hidden
                                style={{
                                  transform: aberto ? "rotate(90deg)" : "rotate(0deg)",
                                  transition: "transform 0.15s ease",
                                  flexShrink: 0,
                                  color: t.textMuted,
                                }}
                              />
                              <span style={{ fontWeight: 600 }}>{labelDia}</span>
                            </div>
                          </td>
                          <td style={dataTable.tdCenter}>{row.rodadas.toLocaleString("pt-BR")}</td>
                          <td style={dataTable.tdCenter}>{fmtMediaSegundos(row.dealingSeg)}</td>
                          <td style={dataTable.tdCenter}>{fmtMediaSegundos(row.reactionSeg)}</td>
                          <td style={dataTable.tdCenter}>{fmtPctCoop(row.coopVelPct)}</td>
                          <td style={dataTable.tdCenter}>{fmtPctCoop(row.coopRodaPct)}</td>
                        </tr>
                        {aberto &&
                          row.porJogo.map((jogo) => (
                            <tr
                              key={`${row.dia_brt}-${jogo.jogoKey}`}
                              style={{ background: dataTable.zebraRow(i) }}
                            >
                              <td style={dataTable.tdSticky()}>
                                <div style={{ display: "flex", justifyContent: "center", paddingLeft: 18 }}>
                                  <JogoChip jogo={jogo} isDark={isDark} />
                                </div>
                              </td>
                              <td style={dataTable.tdCenter}>{jogo.rodadas.toLocaleString("pt-BR")}</td>
                              <td style={dataTable.tdCenter}>{fmtMediaSegundos(jogo.dealingSeg)}</td>
                              <td style={dataTable.tdCenter}>{fmtMediaSegundos(jogo.reactionSeg)}</td>
                              <td style={dataTable.tdCenter}>{fmtPctCoop(jogo.coopVelPct)}</td>
                              <td style={dataTable.tdCenter}>{fmtPctCoop(jogo.coopRodaPct)}</td>
                            </tr>
                          ))}
                        {aberto && row.porJogo.length === 0 && (
                          <tr style={{ background: dataTable.zebraRow(i) }}>
                            <td colSpan={6} style={{ ...dataTable.tdCenter, color: t.textMuted }}>
                              Sem jogos identificados neste dia.
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
