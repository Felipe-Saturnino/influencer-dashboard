import { useMemo, useState } from "react";
import { Gauge, Hash, RotateCw, Timer, Zap } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { BRAND } from "../../../lib/dashboardConstants";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import {
  fmtMediaSegundos,
  fmtPctCoop,
  mediaSegundos,
  pctCoop,
  type GpKpiAgregado,
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
type SortMesaCol = "mesa" | "jogo" | "rodadas" | "dealing" | "reaction" | "coopVel" | "coopRoda";

function fmtDiaBr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function numOrNeg(v: number | null): number {
  return v == null || !Number.isFinite(v) ? Number.NEGATIVE_INFINITY : v;
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
      />
      <KpiCard
        label="Coop. Velocidade"
        value={fmtPctCoop(coopVel)}
        icon={<Gauge size={16} aria-hidden />}
        accentColor={BRAND.verde}
        atual={coopVel ?? 0}
        anterior={coopVelAnt ?? 0}
        isHistorico={historico || coopVel == null}
      />
      <KpiCard
        label="Coop. Roda"
        value={fmtPctCoop(coopRoda)}
        icon={<RotateCw size={16} aria-hidden />}
        accentColor={BRAND.amarelo}
        atual={coopRoda ?? 0}
        anterior={coopRodaAnt ?? 0}
        isHistorico={historico || coopRoda == null}
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

  const { loading, erro, agregado, aggAnterior, porDia, porMesa, temDados } = useOverviewPrestadorGpKpi({
    enabled: !visaoTime && Boolean(funcionarioId),
    funcionarioId,
    mesSelecionado,
    historico,
  });

  const [sortDia, setSortDia] = useState<{ col: SortDiaCol; dir: SortDir }>({ col: "dia", dir: "desc" });
  const [sortMesa, setSortMesa] = useState<{ col: SortMesaCol; dir: SortDir }>({
    col: "rodadas",
    dir: "desc",
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

  const mesasOrdenadas = useMemo(() => {
    const rows = [...porMesa];
    const dir = sortMesa.dir;
    rows.sort((a, b) => {
      switch (sortMesa.col) {
        case "mesa":
          return compareLocaleTexto(a.nome_mesa, b.nome_mesa, dir);
        case "jogo":
          return compareLocaleTexto(a.tipo_jogo, b.tipo_jogo, dir);
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
  }, [porMesa, sortMesa]);

  const onSortDia = (col: SortDiaCol) => {
    setSortDia((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" },
    );
  };

  const onSortMesa = (col: SortMesaCol) => {
    setSortMesa((prev) =>
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

  const subPeriodo = historico ? "acumulado" : mesSelecionado?.label;
  const subTitulo =
    staffNome && subPeriodo ? `${staffNome} · ${subPeriodo}` : staffNome || subPeriodo;

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub={subTitulo}>KPIs de Mesa</SectionTitle>

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
            <SectionTitle sub={historico ? "mês a mês" : "dia a dia"}>Detalhamento Diário</SectionTitle>
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>KPIs de mesa por dia</caption>
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
                  {diasOrdenados.map((row, i) => (
                    <tr key={row.dia_brt} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky()}>{fmtDiaBr(row.dia_brt)}</td>
                      <td style={dataTable.tdCenter}>{row.rodadas.toLocaleString("pt-BR")}</td>
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
            <SectionTitle sub="por mesa no período">Por Mesa</SectionTitle>
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 800 })}>
                <caption style={{ display: "none" }}>KPIs de mesa agregados por mesa</caption>
                <thead>
                  <tr>
                    <SortTableTh
                      label="Mesa"
                      col="mesa"
                      sortCol={sortMesa.col}
                      sortDir={sortMesa.dir}
                      onSort={onSortMesa}
                      thStyle={dataTable.thHeaderSticky}
                      align="center"
                    />
                    <SortTableTh
                      label="Jogo"
                      col="jogo"
                      sortCol={sortMesa.col}
                      sortDir={sortMesa.dir}
                      onSort={onSortMesa}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Rodadas"
                      col="rodadas"
                      sortCol={sortMesa.col}
                      sortDir={sortMesa.dir}
                      onSort={onSortMesa}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Dealing"
                      col="dealing"
                      sortCol={sortMesa.col}
                      sortDir={sortMesa.dir}
                      onSort={onSortMesa}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Reaction"
                      col="reaction"
                      sortCol={sortMesa.col}
                      sortDir={sortMesa.dir}
                      onSort={onSortMesa}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Coop. Vel."
                      col="coopVel"
                      sortCol={sortMesa.col}
                      sortDir={sortMesa.dir}
                      onSort={onSortMesa}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Coop. Roda"
                      col="coopRoda"
                      sortCol={sortMesa.col}
                      sortDir={sortMesa.dir}
                      onSort={onSortMesa}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                  </tr>
                </thead>
                <tbody>
                  {mesasOrdenadas.map((row, i) => (
                    <tr key={row.table_id} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky()} title={row.table_id}>
                        {row.nome_mesa}
                      </td>
                      <td style={dataTable.tdCenter}>{row.tipo_jogo}</td>
                      <td style={dataTable.tdCenter}>{row.rodadas.toLocaleString("pt-BR")}</td>
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
        </>
      )}
    </>
  );
}
