import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Building2, ChevronLeft, ChevronRight, ClipboardPen, Eye, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import {
  DashboardPageHeader,
  FiltroBarTabButton,
  FiltroHistoricoButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
  SectionTitle,
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getPeriodoHistoricoCompetencias, isDataNoPeriodoHistoricoCompetencias } from "../../../lib/dashboardHelpers";
import { getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import {
  getMesesDisponiveisEscalaCarrossel,
  idxMesInicialEscalaCarrossel,
} from "../../../lib/escalaMesCarrosselOverviewStyle";
import {
  contagemManutencoes,
  dataIsoNoMes,
  formatDataBr,
  labelTurno,
  listarRelatoriosEstudio,
  listarRelatoriosTurno,
  totaisRelatorioTurno,
  type RelatorioEstudioRow,
  type RelatorioTurnoRow,
} from "../../../lib/escalaRelatorioTurno";
import { ModalRelatorioTurno } from "./ModalRelatorioTurno";
import { ModalRelatorioEstudio } from "./ModalRelatorioEstudio";
import { ModalVerRelatorioEstudio, ModalVerRelatorioTurno } from "./ModalVerRelatorio";

const SUBTITULO =
  "Registre e consulte os relatórios de turno e de estúdio da operação.";

type SortColTurno = "data" | "turno" | "relator" | "escalados" | "absenteismo";
type SortColEstudio = "data" | "turno" | "relator" | "sos" | "sinais" | "payout" | "manutencoes";

function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
}

export default function EscalaRelatorioTurnoPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_relatorio_turno");
  const dataTable = useDataTableBlock();

  const hoje = useMemo(() => new Date(), []);
  const mesesDisponiveis = useMemo(() => getMesesDisponiveisEscalaCarrossel(hoje), [hoje]);
  const idxMesInicial = useMemo(
    () => idxMesInicialEscalaCarrossel(mesesDisponiveis, hoje),
    [mesesDisponiveis, hoje],
  );
  const [idxMes, setIdxMes] = useState(idxMesInicial);
  const [historico, setHistorico] = useState(false);
  const [aba, setAba] = useRouteTab("escala_relatorio_turno", "turno", ["turno", "estudio"] as const);
  const [busca, setBusca] = useState("");

  const [rowsTurno, setRowsTurno] = useState<RelatorioTurnoRow[]>([]);
  const [rowsEstudio, setRowsEstudio] = useState<RelatorioEstudioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroLoad, setErroLoad] = useState<string | null>(null);

  const [modalNovo, setModalNovo] = useState<"turno" | "estudio" | null>(null);
  const [verTurno, setVerTurno] = useState<RelatorioTurnoRow | null>(null);
  const [verEstudio, setVerEstudio] = useState<RelatorioEstudioRow | null>(null);

  const [sortTurno, setSortTurno] = useState<{ col: SortColTurno; dir: SortDir }>({
    col: "data",
    dir: "desc",
  });
  const [sortEstudio, setSortEstudio] = useState<{ col: SortColEstudio; dir: SortDir }>({
    col: "data",
    dir: "desc",
  });
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    setIdxMes((i) => Math.min(Math.max(0, i), Math.max(0, mesesDisponiveis.length - 1)));
  }, [mesesDisponiveis.length]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroLoad(null);
    try {
      const { inicio, fim } = getPeriodoHistoricoCompetencias();
      const [tRows, eRows] = await Promise.all([
        listarRelatoriosTurno({ dataIni: inicio, dataFim: fim }),
        listarRelatoriosEstudio({ dataIni: inicio, dataFim: fim }),
      ]);
      setRowsTurno(tRows);
      setRowsEstudio(eRows);
    } catch {
      setErroLoad("Não foi possível carregar os relatórios. Se o problema persistir, entre em contato com o suporte.");
      setRowsTurno([]);
      setRowsEstudio([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregar();
  }, [perm.loading, perm.canView, carregar]);

  const mesSelecionado = mesesDisponiveis[idxMes];

  const filtrarPeriodo = useCallback(
    <T extends { data: string }>(rows: T[]): T[] => {
      if (historico) {
        return rows.filter((r) => isDataNoPeriodoHistoricoCompetencias(r.data.slice(0, 10)));
      }
      if (!mesSelecionado) return [];
      return rows.filter((r) => dataIsoNoMes(r.data, mesSelecionado.ano, mesSelecionado.mes));
    },
    [historico, mesSelecionado],
  );

  const turnoFiltrado = useMemo(() => {
    let rows = filtrarPeriodo(rowsTurno);
    if (busca.trim()) {
      rows = rows.filter((r) =>
        textoContemBuscaEmAlgum(busca, r.relator_nome, labelTurno(r.turno), formatDataBr(r.data)),
      );
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const ta = totaisRelatorioTurno(a);
      const tb = totaisRelatorioTurno(b);
      let c = 0;
      if (sortTurno.col === "data") c = compareLocaleTexto(a.data, b.data, sortTurno.dir);
      else if (sortTurno.col === "turno") c = compareLocaleTexto(labelTurno(a.turno), labelTurno(b.turno), sortTurno.dir);
      else if (sortTurno.col === "relator") c = compareLocaleTexto(a.relator_nome, b.relator_nome, sortTurno.dir);
      else if (sortTurno.col === "escalados") c = compareNumber(ta.escalados, tb.escalados, sortTurno.dir);
      else c = compareNumber(ta.absenteismo, tb.absenteismo, sortTurno.dir);
      if (c !== 0) return c;
      return compareLocaleTexto(b.publicado_em, a.publicado_em, "asc");
    });
    return sorted;
  }, [rowsTurno, filtrarPeriodo, busca, sortTurno]);

  const estudioFiltrado = useMemo(() => {
    let rows = filtrarPeriodo(rowsEstudio);
    if (busca.trim()) {
      rows = rows.filter((r) =>
        textoContemBuscaEmAlgum(
          busca,
          r.relator_nome,
          labelTurno(r.turno),
          formatDataBr(r.data),
          String(r.sos),
          String(r.sinais),
          String(r.payout),
        ),
      );
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const ca = contagemManutencoes(a.manutencao);
      const cb = contagemManutencoes(b.manutencao);
      let c = 0;
      if (sortEstudio.col === "data") c = compareLocaleTexto(a.data, b.data, sortEstudio.dir);
      else if (sortEstudio.col === "turno")
        c = compareLocaleTexto(labelTurno(a.turno), labelTurno(b.turno), sortEstudio.dir);
      else if (sortEstudio.col === "relator")
        c = compareLocaleTexto(a.relator_nome, b.relator_nome, sortEstudio.dir);
      else if (sortEstudio.col === "sos") c = compareNumber(a.sos, b.sos, sortEstudio.dir);
      else if (sortEstudio.col === "sinais") c = compareNumber(a.sinais, b.sinais, sortEstudio.dir);
      else if (sortEstudio.col === "payout") c = compareNumber(a.payout, b.payout, sortEstudio.dir);
      else c = compareNumber(ca.feitos, cb.feitos, sortEstudio.dir);
      if (c !== 0) return c;
      return compareLocaleTexto(b.publicado_em, a.publicado_em, "asc");
    });
    return sorted;
  }, [rowsEstudio, filtrarPeriodo, busca, sortEstudio]);

  const filterBarSection = (withTopBorder: boolean): CSSProperties => ({
    ...getFilterBarRowStyle(),
    width: "100%",
    ...(withTopBorder
      ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }
      : {}),
  });

  const tabs = ["turno", "estudio"] as const;

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 size={24} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 13 }}>Carregando…</div>
        </div>
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const carrosselPrimeiro = idxMes === 0;
  const carrosselUltimo = idxMes >= mesesDisponiveis.length - 1;

  return (
    <div className="app-page-shell app-page-shell--pb64">
      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="escala_relatorio_turno" />}
        title={getPageMenuLabel("escala_relatorio_turno")}
        subtitle={SUBTITULO}
        brand={brand}
        t={t}
      />

      <div style={getFilterBarWrapperStyle(brand, t)}>
        <div style={filterBarSection(false)}>
          <button
            type="button"
            aria-label="Mês anterior"
            disabled={historico || carrosselPrimeiro}
            style={getCarouselBtnNavStyle(t, historico || carrosselPrimeiro)}
            onClick={() => setIdxMes((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft size={14} aria-hidden />
          </button>
          <span style={getCarouselPeriodLabelStyle(t, { minWidth: 180 })}>
            {historico ? "Todo o período" : (mesSelecionado?.label ?? "—")}
          </span>
          <button
            type="button"
            aria-label="Próximo mês"
            disabled={historico || carrosselUltimo}
            style={getCarouselBtnNavStyle(t, historico || carrosselUltimo)}
            onClick={() => setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1))}
          >
            <ChevronRight size={14} aria-hidden />
          </button>
          <FiltroHistoricoButton
            active={historico}
            onClick={() => {
              if (historico) {
                setHistorico(false);
                setIdxMes(idxMesInicial);
              } else {
                setHistorico(true);
              }
            }}
          />
        </div>

        <div
          role="tablist"
          aria-label="Tipo de relatório"
          style={filterBarSection(true)}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(e, [...tabs], setAba, (k) => `tab-relatorio-turno-${k}`)
          }
        >
          <FiltroBarTabButton
            id="tab-relatorio-turno-turno"
            active={aba === "turno"}
            aria-controls="panel-relatorio-turno"
            onClick={() => setAba("turno")}
            icon={<ClipboardPen {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Relatório do Turno
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-relatorio-turno-estudio"
            active={aba === "estudio"}
            aria-controls="panel-relatorio-estudio"
            onClick={() => setAba("estudio")}
            icon={<Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Relatório de Estúdio
          </FiltroBarTabButton>
        </div>

        <div style={filterBarSection(true)}>
          <BarraPesquisaPagina
            value={busca}
            onChange={setBusca}
            placeholder="Pesquisar relator, turno..."
            aria-label="Pesquisar relatórios"
            wrapperStyle={{ width: "100%", maxWidth: 480 }}
          />
        </div>
      </div>

      {erroLoad ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, marginBottom: 14 }}>
          {erroLoad}
        </div>
      ) : null}

      {aba === "turno" ? (
        <div
          id="panel-relatorio-turno"
          role="tabpanel"
          aria-labelledby="tab-relatorio-turno-turno"
          style={getPageContentBoxStyle(brand, t)}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <SectionTitle sub="passagem de turno por data e turno">Relatórios</SectionTitle>
            {perm.canCriarOk ? (
              <CtaCriarButton onClick={() => setModalNovo("turno")}>Novo Relatório</CtaCriarButton>
            ) : null}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: t.textMuted }}>
              <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
              <div style={{ marginTop: 8, fontSize: 13 }}>Carregando…</div>
            </div>
          ) : turnoFiltrado.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </div>
          ) : (
            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>Relatórios do turno</caption>
                <thead>
                  <tr>
                    <SortTableTh
                      label="Data"
                      col="data"
                      sortCol={sortTurno.col}
                      sortDir={sortTurno.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={(col) =>
                        setSortTurno((s) => ({
                          col,
                          dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                    />
                    <SortTableTh
                      label="Turno"
                      col="turno"
                      sortCol={sortTurno.col}
                      sortDir={sortTurno.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={(col) =>
                        setSortTurno((s) => ({
                          col,
                          dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                    />
                    <SortTableTh
                      label="Relator"
                      col="relator"
                      sortCol={sortTurno.col}
                      sortDir={sortTurno.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={(col) =>
                        setSortTurno((s) => ({
                          col,
                          dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                    />
                    <SortTableTh
                      label="Escalados"
                      col="escalados"
                      sortCol={sortTurno.col}
                      sortDir={sortTurno.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={(col) =>
                        setSortTurno((s) => ({
                          col,
                          dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                    />
                    <SortTableTh
                      label="Absenteísmo"
                      col="absenteismo"
                      sortCol={sortTurno.col}
                      sortDir={sortTurno.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={(col) =>
                        setSortTurno((s) => ({
                          col,
                          dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                    />
                    <th scope="col" style={dataTable.thHeader}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {turnoFiltrado.map((r, i) => {
                    const tot = totaisRelatorioTurno(r);
                    const bg =
                      hoverId === r.id ? tableRowHoverBg(!!t.isDark) : dataTable.zebraRow(i);
                    return (
                      <tr
                        key={r.id}
                        style={{ background: bg }}
                        onMouseEnter={() => setHoverId(r.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        <td style={dataTable.tdCenter}>{formatDataBr(r.data)}</td>
                        <td style={dataTable.tdCenter}>{labelTurno(r.turno)}</td>
                        <td style={dataTable.tdCenter}>{r.relator_nome}</td>
                        <td style={dataTable.tdCenter}>{tot.escalados}</td>
                        <td style={dataTable.tdCenter}>{tot.absenteismo}</td>
                        <td style={dataTable.tdCenter}>
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <BtnIconeAcaoLinha
                              label={tooltipAcao("Ver relatório")}
                              onClick={() => setVerTurno(r)}
                            >
                              <Eye size={13} aria-hidden />
                            </BtnIconeAcaoLinha>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div
          id="panel-relatorio-estudio"
          role="tabpanel"
          aria-labelledby="tab-relatorio-turno-estudio"
          style={getPageContentBoxStyle(brand, t)}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <SectionTitle sub="SOS, sinais, payout e manutenções do estúdio">Relatórios</SectionTitle>
            {perm.canCriarOk ? (
              <CtaCriarButton onClick={() => setModalNovo("estudio")}>Novo Relatório</CtaCriarButton>
            ) : null}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: t.textMuted }}>
              <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
              <div style={{ marginTop: 8, fontSize: 13 }}>Carregando…</div>
            </div>
          ) : estudioFiltrado.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </div>
          ) : (
            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 860 })}>
                <caption style={{ display: "none" }}>Relatórios de estúdio</caption>
                <thead>
                  <tr>
                    {(
                      [
                        ["data", "Data"],
                        ["turno", "Turno"],
                        ["relator", "Relator"],
                        ["sos", "SOS"],
                        ["sinais", "Sinais"],
                        ["payout", "Payout"],
                        ["manutencoes", "Manutenções"],
                      ] as const
                    ).map(([col, label]) => (
                      <SortTableTh
                        key={col}
                        label={label}
                        col={col}
                        sortCol={sortEstudio.col}
                        sortDir={sortEstudio.dir}
                        thStyle={dataTable.thHeader}
                        align="center"
                        onSort={(c) =>
                          setSortEstudio((s) => ({
                            col: c,
                            dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                          }))
                        }
                      />
                    ))}
                    <th scope="col" style={dataTable.thHeader}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {estudioFiltrado.map((r, i) => {
                    const cnt = contagemManutencoes(r.manutencao);
                    const bg =
                      hoverId === r.id ? tableRowHoverBg(!!t.isDark) : dataTable.zebraRow(i);
                    return (
                      <tr
                        key={r.id}
                        style={{ background: bg }}
                        onMouseEnter={() => setHoverId(r.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        <td style={dataTable.tdCenter}>{formatDataBr(r.data)}</td>
                        <td style={dataTable.tdCenter}>{labelTurno(r.turno)}</td>
                        <td style={dataTable.tdCenter}>{r.relator_nome}</td>
                        <td style={dataTable.tdCenter}>{r.sos.toLocaleString("pt-BR")}</td>
                        <td style={dataTable.tdCenter}>{r.sinais.toLocaleString("pt-BR")}</td>
                        <td style={dataTable.tdCenter}>{r.payout.toLocaleString("pt-BR")}</td>
                        <td style={dataTable.tdCenter}>
                          {cnt.total === 0 ? "—" : `${cnt.feitos} / ${cnt.total}`}
                        </td>
                        <td style={dataTable.tdCenter}>
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <BtnIconeAcaoLinha
                              label={tooltipAcao("Ver relatório")}
                              onClick={() => setVerEstudio(r)}
                            >
                              <Eye size={13} aria-hidden />
                            </BtnIconeAcaoLinha>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalNovo === "turno" ? (
        <ModalRelatorioTurno onClose={() => setModalNovo(null)} onPublicado={() => void carregar()} />
      ) : null}
      {modalNovo === "estudio" ? (
        <ModalRelatorioEstudio onClose={() => setModalNovo(null)} onPublicado={() => void carregar()} />
      ) : null}
      {verTurno ? <ModalVerRelatorioTurno row={verTurno} onClose={() => setVerTurno(null)} /> : null}
      {verEstudio ? (
        <ModalVerRelatorioEstudio row={verEstudio} onClose={() => setVerEstudio(null)} />
      ) : null}
    </div>
  );
}
