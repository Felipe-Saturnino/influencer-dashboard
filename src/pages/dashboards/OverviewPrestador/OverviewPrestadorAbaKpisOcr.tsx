import { Fragment, useMemo, useState } from "react";
import { Activity, ChevronRight, Clock, Ticket, Timer } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
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
import { fmtDuracaoMs } from "../../../lib/smSinaisHelpers";
import { KpiCard, SectionTitle, SkeletonKpiCard, SortTableTh, type SortDir } from "../../../components/dashboard";
import type { MesCarrosselEscalaEntry } from "../../../lib/escalaMesCarrosselOverviewStyle";
import { useOverviewPrestadorSmOcr } from "./useOverviewPrestadorSmOcr";

type Props = {
  funcionarioIds: string[];
  prestadores: { id: string; nome: string }[];
  visaoTime: boolean;
  mesSelecionado: MesCarrosselEscalaEntry | undefined;
  historico: boolean;
  staffNome?: string;
};

type SortJogoCol = "jogo" | "sinais" | "tmaTotal" | "tmaAtend" | "tmaRes" | "tickets";
type SortEstCol = "estudio" | "sinais" | "tmaTotal" | "tmaAtend" | "tmaRes" | "tickets";
type SortAtencaoCol = "nome" | "sinais" | "tmaTotal" | "tmaAtend" | "tmaRes" | "tickets" | "performance";
type SortDiaCol = "dia" | "sinais" | "tmaTotal" | "tmaAtend" | "tmaRes" | "tickets";

function fmtDiaBr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function numOrNeg(v: number | null): number {
  return v == null || !Number.isFinite(v) ? Number.NEGATIVE_INFINITY : v;
}

function JogoChip({ jogoKey, isDark }: { jogoKey: GameIdentityKey | "outro"; isDark: boolean }) {
  if (jogoKey === "outro") {
    return <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT.body }}>Outro</span>;
  }
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

export function OverviewPrestadorAbaKpisOcr({
  funcionarioIds,
  prestadores,
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

  if (funcionarioIds.length === 0) {
    return (
      <div style={pageBox}>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {visaoTime
            ? "Selecione um time para visualizar os resultados."
            : "Selecione um prestador no filtro Staff para ver os KPIs de OCR."}
        </div>
      </div>
    );
  }

  return (
    <OverviewPrestadorAbaKpisOcrConteudo
      funcionarioIds={funcionarioIds}
      prestadores={prestadores}
      visaoTime={visaoTime}
      mesSelecionado={mesSelecionado}
      historico={historico}
      staffNome={staffNome}
      t={t}
      dataTable={dataTable}
      pageBox={pageBox}
      isDark={isDark}
    />
  );
}

function OverviewPrestadorAbaKpisOcrConteudo({
  funcionarioIds,
  prestadores,
  visaoTime,
  mesSelecionado,
  historico,
  staffNome,
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
    kpisAtual,
    kpisAnterior,
    porJogo,
    porEstudio,
    porPrestador,
    porDia,
    kpiMsParaComparativo,
  } = useOverviewPrestadorSmOcr({
    enabled: true,
    funcionarioIds,
    prestadores,
    mesSelecionado,
    historico,
  });

  const [sortJogo, setSortJogo] = useState<{ col: SortJogoCol; dir: SortDir }>({ col: "jogo", dir: "asc" });
  const [sortEst, setSortEst] = useState<{ col: SortEstCol; dir: SortDir }>({ col: "estudio", dir: "asc" });
  const [sortAtencao, setSortAtencao] = useState<{ col: SortAtencaoCol; dir: SortDir }>({
    col: "sinais",
    dir: "desc",
  });
  const [sortDia, setSortDia] = useState<{ col: SortDiaCol; dir: SortDir }>({ col: "dia", dir: "desc" });
  const [estudiosAbertos, setEstudiosAbertos] = useState<Set<string>>(() => new Set());

  const toggleEstudio = (key: string) => {
    setEstudiosAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const jogosOrdenados = useMemo(() => {
    const rows = [...porJogo];
    const dir = sortJogo.dir;
    const ordem = (k: string) => {
      const i = (["blackjack", "baccarat", "futebol_brasileiro", "roleta", "outro"] as const).indexOf(
        k as GameIdentityKey | "outro",
      );
      return i < 0 ? 99 : i;
    };
    rows.sort((a, b) => {
      switch (sortJogo.col) {
        case "jogo":
          return compareNumber(ordem(a.jogoKey), ordem(b.jogoKey), dir);
        case "sinais":
          return compareNumber(a.total, b.total, dir);
        case "tmaTotal":
          return compareNumber(numOrNeg(a.tmaTotalMs), numOrNeg(b.tmaTotalMs), dir);
        case "tmaAtend":
          return compareNumber(numOrNeg(a.tmaAtendimentoMs), numOrNeg(b.tmaAtendimentoMs), dir);
        case "tmaRes":
          return compareNumber(numOrNeg(a.tmaResolucaoMs), numOrNeg(b.tmaResolucaoMs), dir);
        case "tickets":
          return compareNumber(a.tickets, b.tickets, dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [porJogo, sortJogo]);

  const estudiosOrdenados = useMemo(() => {
    const rows = [...porEstudio];
    const dir = sortEst.dir;
    rows.sort((a, b) => {
      switch (sortEst.col) {
        case "estudio":
          return compareLocaleTexto(a.label, b.label, dir);
        case "sinais":
          return compareNumber(a.total, b.total, dir);
        case "tmaTotal":
          return compareNumber(numOrNeg(a.tmaTotalMs), numOrNeg(b.tmaTotalMs), dir);
        case "tmaAtend":
          return compareNumber(numOrNeg(a.tmaAtendimentoMs), numOrNeg(b.tmaAtendimentoMs), dir);
        case "tmaRes":
          return compareNumber(numOrNeg(a.tmaResolucaoMs), numOrNeg(b.tmaResolucaoMs), dir);
        case "tickets":
          return compareNumber(a.tickets, b.tickets, dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [porEstudio, sortEst]);

  const atencaoOrdenados = useMemo(() => {
    const rows = [...porPrestador];
    const dir = sortAtencao.dir;
    rows.sort((a, b) => {
      switch (sortAtencao.col) {
        case "nome":
          return compareLocaleTexto(a.label, b.label, dir);
        case "sinais":
          return compareNumber(a.total, b.total, dir);
        case "tmaTotal":
          return compareNumber(numOrNeg(a.tmaTotalMs), numOrNeg(b.tmaTotalMs), dir);
        case "tmaAtend":
          return compareNumber(numOrNeg(a.tmaAtendimentoMs), numOrNeg(b.tmaAtendimentoMs), dir);
        case "tmaRes":
          return compareNumber(numOrNeg(a.tmaResolucaoMs), numOrNeg(b.tmaResolucaoMs), dir);
        case "tickets":
          return compareNumber(a.tickets, b.tickets, dir);
        case "performance":
          return 0;
        default:
          return 0;
      }
    });
    return rows;
  }, [porPrestador, sortAtencao]);

  const diasOrdenados = useMemo(() => {
    const rows = [...porDia];
    const dir = sortDia.dir;
    rows.sort((a, b) => {
      switch (sortDia.col) {
        case "dia":
          return compareLocaleTexto(a.dia, b.dia, dir);
        case "sinais":
          return compareNumber(a.total, b.total, dir);
        case "tmaTotal":
          return compareNumber(numOrNeg(a.tmaTotalMs), numOrNeg(b.tmaTotalMs), dir);
        case "tmaAtend":
          return compareNumber(numOrNeg(a.tmaAtendimentoMs), numOrNeg(b.tmaAtendimentoMs), dir);
        case "tmaRes":
          return compareNumber(numOrNeg(a.tmaResolucaoMs), numOrNeg(b.tmaResolucaoMs), dir);
        case "tickets":
          return compareNumber(a.tickets, b.tickets, dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [porDia, sortDia]);

  const subTitulo = historico
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

  const thJogo = (col: SortJogoCol, label: string, sticky?: boolean) => (
    <SortTableTh
      label={label}
      col={col}
      sortCol={sortJogo.col}
      sortDir={sortJogo.dir}
      onSort={(c) =>
        setSortJogo((p) =>
          p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortJogoCol, dir: c === "jogo" ? "asc" : "desc" },
        )
      }
      thStyle={sticky ? dataTable.thHeaderSticky : dataTable.thHeader}
      align="center"
    />
  );

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub={subTitulo}>KPIs de Atendimento</SectionTitle>
        {erro && (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
            {erro}
          </div>
        )}
        {loading ? (
          <div className="app-grid-kpi-5" style={{ gap: 12 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonKpiCard key={i} />
            ))}
          </div>
        ) : (
          <div className="app-grid-kpi-5" style={{ gap: 12 }}>
            <KpiCard
              label="Sinais"
              value={kpisAtual.total.toLocaleString("pt-BR")}
              icon={<Activity size={16} aria-hidden />}
              accentColor="#a78bfa"
              atual={kpisAtual.total}
              anterior={kpisAnterior.total}
              isHistorico={historico}
              vsLegendaSuffix="mês ant."
            />
            <KpiCard
              label="TMA Total"
              value={fmtDuracaoMs(kpisAtual.tmaTotalMs)}
              icon={<Timer size={16} aria-hidden />}
              accentColor="#1e36f8"
              atual={kpiMsParaComparativo(kpisAtual.tmaTotalMs)}
              anterior={kpiMsParaComparativo(kpisAnterior.tmaTotalMs)}
              isHistorico={historico}
              isInverso
              vsLegendaSuffix="mês ant."
            />
            <KpiCard
              label="TMA de Atendimento"
              value={fmtDuracaoMs(kpisAtual.tmaAtendimentoMs)}
              icon={<Clock size={16} aria-hidden />}
              accentColor="#f59e0b"
              atual={kpiMsParaComparativo(kpisAtual.tmaAtendimentoMs)}
              anterior={kpiMsParaComparativo(kpisAnterior.tmaAtendimentoMs)}
              isHistorico={historico}
              isInverso
              vsLegendaSuffix="mês ant."
            />
            <KpiCard
              label="TMA de Resolução"
              value={fmtDuracaoMs(kpisAtual.tmaResolucaoMs)}
              icon={<Timer size={16} aria-hidden />}
              accentColor="#22c55e"
              atual={kpiMsParaComparativo(kpisAtual.tmaResolucaoMs)}
              anterior={kpiMsParaComparativo(kpisAnterior.tmaResolucaoMs)}
              isHistorico={historico}
              isInverso
              vsLegendaSuffix="mês ant."
            />
            <KpiCard
              label="Tickets"
              value={kpisAtual.tickets.toLocaleString("pt-BR")}
              icon={<Ticket size={16} aria-hidden />}
              accentColor="#e84025"
              atual={kpisAtual.tickets}
              anterior={kpisAnterior.tickets}
              isHistorico={historico}
              isInverso
              vsLegendaSuffix="mês ant."
            />
          </div>
        )}
      </div>

      {!loading ? (
        <div style={pageBox}>
          <SectionTitle sub="sinais e tickets por tipo de jogo">Por Jogo</SectionTitle>
          {jogosOrdenados.length === 0 ? (
            vazio
          ) : (
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>KPIs de OCR por jogo</caption>
                <thead>
                  <tr>
                    {thJogo("jogo", "Jogo", true)}
                    {thJogo("sinais", "Sinais")}
                    {thJogo("tmaTotal", "TMA Total")}
                    {thJogo("tmaAtend", "TMA de Atendimento")}
                    {thJogo("tmaRes", "TMA de Resolução")}
                    {thJogo("tickets", "Tickets")}
                  </tr>
                </thead>
                <tbody>
                  {jogosOrdenados.map((row, i) => (
                    <tr key={row.key} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky({ rowIndex: i })}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <JogoChip jogoKey={row.jogoKey} isDark={isDark} />
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>{row.total.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaTotalMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaAtendimentoMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaResolucaoMs)}</td>
                      <td style={dataTable.tdCenter}>{row.tickets.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {!loading ? (
        <div style={pageBox}>
          <SectionTitle sub="expanda o estúdio para ver as mesas">Por Estúdio</SectionTitle>
          {estudiosOrdenados.length === 0 ? (
            vazio
          ) : (
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>KPIs de OCR por estúdio e mesa</caption>
                <thead>
                  <tr>
                    <SortTableTh
                      label="Estúdio"
                      col="estudio"
                      sortCol={sortEst.col}
                      sortDir={sortEst.dir}
                      onSort={(c) =>
                        setSortEst((p) =>
                          p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortEstCol, dir: "asc" },
                        )
                      }
                      thStyle={dataTable.thHeaderSticky}
                      align="center"
                    />
                    <SortTableTh label="Sinais" col="sinais" sortCol={sortEst.col} sortDir={sortEst.dir} onSort={(c) => setSortEst((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortEstCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="TMA Total" col="tmaTotal" sortCol={sortEst.col} sortDir={sortEst.dir} onSort={(c) => setSortEst((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortEstCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="TMA de Atendimento" col="tmaAtend" sortCol={sortEst.col} sortDir={sortEst.dir} onSort={(c) => setSortEst((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortEstCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="TMA de Resolução" col="tmaRes" sortCol={sortEst.col} sortDir={sortEst.dir} onSort={(c) => setSortEst((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortEstCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Tickets" col="tickets" sortCol={sortEst.col} sortDir={sortEst.dir} onSort={(c) => setSortEst((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortEstCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  </tr>
                </thead>
                <tbody>
                  {estudiosOrdenados.map((est, i) => {
                    const aberto = estudiosAbertos.has(est.key);
                    const zebra = dataTable.zebraRow(i);
                    return (
                      <Fragment key={est.key}>
                        <tr
                          style={{ background: zebra, cursor: "pointer" }}
                          tabIndex={0}
                          aria-expanded={aberto}
                          onClick={() => toggleEstudio(est.key)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleEstudio(est.key);
                            }
                          }}
                        >
                          <td style={dataTable.tdSticky({ rowIndex: i })}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              <ChevronRight
                                size={14}
                                aria-hidden
                                style={{
                                  transform: aberto ? "rotate(90deg)" : "rotate(0deg)",
                                  transition: "transform 0.15s ease",
                                  color: GAME_IDENTITY_HEX.baccarat,
                                }}
                              />
                              <span style={{ fontWeight: 600 }}>{est.label}</span>
                            </div>
                          </td>
                          <td style={dataTable.tdCenter}>{est.total.toLocaleString("pt-BR")}</td>
                          <td style={dataTable.tdCenter}>{fmtDuracaoMs(est.tmaTotalMs)}</td>
                          <td style={dataTable.tdCenter}>{fmtDuracaoMs(est.tmaAtendimentoMs)}</td>
                          <td style={dataTable.tdCenter}>{fmtDuracaoMs(est.tmaResolucaoMs)}</td>
                          <td style={dataTable.tdCenter}>{est.tickets.toLocaleString("pt-BR")}</td>
                        </tr>
                        {aberto
                          ? est.mesas.map((mesa, mi) => (
                              <tr key={`${est.key}-${mesa.key}`} style={{ background: dataTable.zebraRow(i + mi + 1) }}>
                                <td style={dataTable.tdSticky({ rowIndex: i + mi + 1 })}>
                                  <span style={{ fontSize: 12, color: t.textMuted }}>{mesa.label}</span>
                                </td>
                                <td style={dataTable.tdCenter}>{mesa.total.toLocaleString("pt-BR")}</td>
                                <td style={dataTable.tdCenter}>{fmtDuracaoMs(mesa.tmaTotalMs)}</td>
                                <td style={dataTable.tdCenter}>{fmtDuracaoMs(mesa.tmaAtendimentoMs)}</td>
                                <td style={dataTable.tdCenter}>{fmtDuracaoMs(mesa.tmaResolucaoMs)}</td>
                                <td style={dataTable.tdCenter}>{mesa.tickets.toLocaleString("pt-BR")}</td>
                              </tr>
                            ))
                          : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {!loading && visaoTime ? (
        <div style={pageBox}>
          <SectionTitle sub="service managers do time com sinais ou tickets no período">Equipe</SectionTitle>
          {atencaoOrdenados.length === 0 ? (
            vazio
          ) : (
            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 780 })}>
                <caption style={{ display: "none" }}>KPIs de OCR por prestador da equipe</caption>
                <thead>
                  <tr>
                    <SortTableTh label="Prestador" col="nome" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortAtencaoCol, dir: "asc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Sinais" col="sinais" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortAtencaoCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="TMA Total" col="tmaTotal" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortAtencaoCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="TMA de Atendimento" col="tmaAtend" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortAtencaoCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="TMA de Resolução" col="tmaRes" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortAtencaoCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Tickets" col="tickets" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortAtencaoCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Performance" col="performance" sortCol={sortAtencao.col} sortDir={sortAtencao.dir} onSort={(c) => setSortAtencao((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortAtencaoCol, dir: "asc" }))} thStyle={dataTable.thHeader} align="center" />
                  </tr>
                </thead>
                <tbody>
                  {atencaoOrdenados.map((r, i) => (
                    <tr key={r.prestadorId} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdCenter}>{r.label}</td>
                      <td style={dataTable.tdCenter}>{r.total.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(r.tmaTotalMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(r.tmaAtendimentoMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(r.tmaResolucaoMs)}</td>
                      <td style={dataTable.tdCenter}>{r.tickets.toLocaleString("pt-BR")}</td>
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
          <SectionTitle sub={historico ? "mês a mês · sinais, TMA e tickets" : "dia a dia · sinais, TMA e tickets"}>
            Detalhamento Diário
          </SectionTitle>
          {diasOrdenados.length === 0 ? (
            vazio
          ) : (
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>KPIs de OCR por dia</caption>
                <thead>
                  <tr>
                    <SortTableTh label="Dia" col="dia" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDiaCol, dir: "desc" }))} thStyle={dataTable.thHeaderSticky} align="center" />
                    <SortTableTh label="Sinais" col="sinais" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDiaCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="TMA Total" col="tmaTotal" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDiaCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="TMA de Atendimento" col="tmaAtend" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDiaCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="TMA de Resolução" col="tmaRes" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDiaCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                    <SortTableTh label="Tickets" col="tickets" sortCol={sortDia.col} sortDir={sortDia.dir} onSort={(c) => setSortDia((p) => (p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDiaCol, dir: "desc" }))} thStyle={dataTable.thHeader} align="center" />
                  </tr>
                </thead>
                <tbody>
                  {diasOrdenados.map((row, i) => (
                    <tr key={row.dia} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky({ rowIndex: i })}>
                        <span style={{ fontWeight: 600 }}>{fmtDiaBr(row.dia)}</span>
                      </td>
                      <td style={dataTable.tdCenter}>{row.total.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaTotalMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaAtendimentoMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaResolucaoMs)}</td>
                      <td style={dataTable.tdCenter}>{row.tickets.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
