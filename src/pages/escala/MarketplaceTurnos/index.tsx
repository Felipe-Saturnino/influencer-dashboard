import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, Store, User } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import {
  DashboardPageHeader,
  FiltroCalendarioTimeSelect,
  FiltroBarTabButton,
  FiltroHistoricoButton,
  FiltroSolicitacoesTipoAcaoSelect,
  SectionTitle,
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FILTRO_BAR_TAB_ICON_SIZE, getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getCtaCriarButtonStyle } from "../../../lib/ctaCriarStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import {
  ESCALA_ACAO_TIPO_OPCOES_MINHAS,
  ESCALA_ACAO_TIPO_OPCOES_TODAS,
  ESCALA_TIME_OPCOES,
  OFERTA_STATUS_LABEL,
  RH_CALENDARIO_ACAO_LABEL_FORMAL,
  type EscalaAcaoFiltro,
  type EscalaTimeFiltro,
  type LinhaOfertaMarketplace,
  type OfertaStatusUi,
} from "../../../lib/escalaTurnosUiConstants";
import type { RhCalendarioAcaoTipo } from "../../../lib/rhCalendarioAcaoHelpers";
import {
  getMesesDisponiveisEscalaCarrossel,
  idxMesInicialEscalaCarrossel,
} from "../../../lib/escalaMesCarrosselOverviewStyle";
const MOCK_OFERTAS: LinhaOfertaMarketplace[] = [];

const MARKETPLACE_TIME_ITEMS = ESCALA_TIME_OPCOES.filter((o) => o.value !== "todos").map((o) => ({
  id: o.value,
  name: o.label,
}));

const MSG_VAZIO_OFERTAS = "Sem ofertas para os filtros selecionados.";

type OfertaSortCol =
  | "dataOferta"
  | "tipo"
  | "turnoOferta"
  | "operadora"
  | "ofertante"
  | "dataInteresse"
  | "turnoInteresse"
  | "comprador"
  | "status";

function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
}

function valorOrdenacaoOferta(row: LinhaOfertaMarketplace, col: OfertaSortCol): string {
  switch (col) {
    case "dataOferta":
      return row.dataOfertaIso.slice(0, 10);
    case "tipo":
      return RH_CALENDARIO_ACAO_LABEL_FORMAL[row.tipo as RhCalendarioAcaoTipo] ?? row.tipo;
    case "turnoOferta":
      return row.turnoOferta;
    case "operadora":
      return row.operadora;
    case "ofertante":
      return row.ofertante;
    case "dataInteresse":
      return row.dataInteresseIso ?? "";
    case "turnoInteresse":
      return row.turnoInteresse ?? "";
    case "comprador":
      return row.comprador ?? "";
    case "status":
      return row.status ? OFERTA_STATUS_LABEL[row.status] : "";
    default:
      return "";
  }
}

function ordenarOfertas(
  rows: LinhaOfertaMarketplace[],
  sort: { col: OfertaSortCol; dir: SortDir },
): LinhaOfertaMarketplace[] {
  const arr = [...rows];
  const { col, dir } = sort;
  arr.sort((a, b) => {
    const c = compareLocaleTexto(valorOrdenacaoOferta(a, col), valorOrdenacaoOferta(b, col), dir);
    if (c !== 0) return c;
    return compareLocaleTexto(a.id, b.id, "asc");
  });
  return arr;
}

function inicioFimMesUtc(ano: number, mes0: number): { ini: string; fim: string } {
  const ini = new Date(Date.UTC(ano, mes0, 1));
  const fim = new Date(Date.UTC(ano, mes0 + 1, 0));
  const p2 = (n: number) => String(n).padStart(2, "0");
  return {
    ini: `${ini.getUTCFullYear()}-${p2(ini.getUTCMonth() + 1)}-${p2(ini.getUTCDate())}`,
    fim: `${fim.getUTCFullYear()}-${p2(fim.getUTCMonth() + 1)}-${p2(fim.getUTCDate())}`,
  };
}

function dataIsoNoMes(dataIso: string, ano: number, mes0: number): boolean {
  const s = dataIso.slice(0, 10);
  const { ini, fim } = inicioFimMesUtc(ano, mes0);
  return s >= ini && s <= fim;
}

function passaFiltroTipo(row: LinhaOfertaMarketplace, filtro: EscalaAcaoFiltro): boolean {
  if (filtro === "todos") return true;
  return row.tipo === filtro;
}

function passaFiltroTime(row: LinhaOfertaMarketplace, filtro: EscalaTimeFiltro): boolean {
  if (filtro === "todos") return true;
  return row.timeKey === filtro;
}

function filtrarPorMesEscala(rows: LinhaOfertaMarketplace[], ano: number, mes0: number): LinhaOfertaMarketplace[] {
  return rows.filter((r) => dataIsoNoMes(r.dataOfertaIso, ano, mes0));
}

export default function EscalaMarketplaceTurnosPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_marketplace_turnos");

  const hoje = useMemo(() => new Date(), []);
  const mesesDisponiveis = useMemo(() => getMesesDisponiveisEscalaCarrossel(hoje), [hoje]);
  const [idxMes, setIdxMes] = useState(() => idxMesInicialEscalaCarrossel(getMesesDisponiveisEscalaCarrossel(new Date()), new Date()));
  const [historico, setHistorico] = useState(false);

  const idxMesInicial = useMemo(
    () => idxMesInicialEscalaCarrossel(mesesDisponiveis, hoje),
    [mesesDisponiveis, hoje],
  );

  useEffect(() => {
    setIdxMes((i) => Math.min(Math.max(0, i), Math.max(0, mesesDisponiveis.length - 1)));
  }, [mesesDisponiveis.length]);

  const [aba, setAba] = useRouteTab("escala_marketplace_turnos", "todas", ["todas", "minhas"] as const);
  const [filtroTipoTodas, setFiltroTipoTodas] = useState<EscalaAcaoFiltro>("todos");
  const [filtroTimeIdsTodas, setFiltroTimeIdsTodas] = useState<string[]>([]);
  const [filtroTipoMinhas, setFiltroTipoMinhas] = useState<EscalaAcaoFiltro>("todos");
  const [sortOferta, setSortOferta] = useState<{ col: OfertaSortCol; dir: SortDir }>({
    col: "dataOferta",
    dir: "desc",
  });

  const dataTable = useDataTableBlock();

  const onSortOferta = (col: OfertaSortCol) =>
    setSortOferta((s) => ({
      col,
      dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
    }));

  const filtroTimeTodas = useMemo((): EscalaTimeFiltro => {
    if (filtroTimeIdsTodas.length === 0) return "todos";
    return filtroTimeIdsTodas[0] as EscalaTimeFiltro;
  }, [filtroTimeIdsTodas]);

  const linhasMes = useMemo(() => {
    if (historico) return MOCK_OFERTAS;
    const m = mesesDisponiveis[idxMes];
    if (!m) return [];
    return filtrarPorMesEscala(MOCK_OFERTAS, m.ano, m.mes);
  }, [mesesDisponiveis, idxMes, historico]);

  const mesSelecionado = mesesDisponiveis[idxMes];
  const carrosselPrimeiro = idxMes === 0;
  const carrosselUltimo = idxMes >= mesesDisponiveis.length - 1;

  const linhasVendasTodas = useMemo(() => {
    return linhasMes.filter(
      (r) =>
        (r.tipo === "venda_turno" || r.tipo === "venda_folga") &&
        passaFiltroTipo(r, filtroTipoTodas) &&
        passaFiltroTime(r, filtroTimeTodas),
    );
  }, [linhasMes, filtroTipoTodas, filtroTimeTodas]);

  const linhasTrocaTodas = useMemo(() => {
    return linhasMes.filter(
      (r) => r.tipo === "oferta_troca" && passaFiltroTipo(r, filtroTipoTodas) && passaFiltroTime(r, filtroTimeTodas),
    );
  }, [linhasMes, filtroTipoTodas, filtroTimeTodas]);

  const minhasBase = useMemo(() => {
    return linhasMes.filter((r) => passaFiltroTipo(r, filtroTipoMinhas));
  }, [linhasMes, filtroTipoMinhas]);

  const porStatus = (s: OfertaStatusUi) => minhasBase.filter((r) => r.status === s);

  const filterBarSection = (withTopBorder: boolean): CSSProperties => ({
    ...getFilterBarRowStyle(),
    width: "100%",
    ...(withTopBorder
      ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }
      : {}),
  });

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ padding: 24, color: t.textMuted, fontFamily: FONT.body }}>
        Carregando…
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

  const blocoCarrosselHistorico = (
    <>
      <button
        type="button"
        aria-label="Mês anterior"
        style={getCarouselBtnNavStyle(t, historico || carrosselPrimeiro)}
        onClick={() => {
          setHistorico(false);
          setIdxMes((i) => Math.max(0, i - 1));
        }}
        disabled={historico || carrosselPrimeiro}
      >
        <ChevronLeft size={14} aria-hidden="true" />
      </button>
      <span style={getCarouselPeriodLabelStyle(t, { minWidth: "min(100%, 180px)" })}>
        {historico ? "Todo o período" : (mesSelecionado?.label ?? "—")}
      </span>
      <button
        type="button"
        aria-label="Próximo mês"
        style={getCarouselBtnNavStyle(t, historico || carrosselUltimo)}
        onClick={() => {
          setHistorico(false);
          setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
        }}
        disabled={historico || carrosselUltimo}
      >
        <ChevronRight size={14} aria-hidden="true" />
      </button>
      <FiltroHistoricoButton
        active={historico}
        onClick={() => {
          if (historico) {
            setHistorico(false);
            setIdxMes(idxMesInicial >= 0 ? idxMesInicial : Math.max(0, mesesDisponiveis.length - 1));
          } else {
            setHistorico(true);
          }
        }}
      />
    </>
  );

  const blocoFiltrosLinha1 =
    aba === "todas" ? (
      <>
        {blocoCarrosselHistorico}
        <FiltroSolicitacoesTipoAcaoSelect
          value={filtroTipoTodas}
          onChange={setFiltroTipoTodas}
          opcoes={ESCALA_ACAO_TIPO_OPCOES_TODAS}
        />
        <FiltroCalendarioTimeSelect
          selected={filtroTimeIdsTodas}
          onChange={(ids) => setFiltroTimeIdsTodas(ids.length <= 1 ? ids : [ids[ids.length - 1]!])}
          items={MARKETPLACE_TIME_ITEMS}
        />
      </>
    ) : (
      <div className="app-marketplace-filtro-minhas">
        <span className="app-marketplace-filtro-minhas__spacer" aria-hidden="true" />
        <div className="app-marketplace-filtro-minhas__centro" role="group" aria-label="Período e tipo de ação">
          {blocoCarrosselHistorico}
          <FiltroSolicitacoesTipoAcaoSelect
            value={filtroTipoMinhas}
            onChange={setFiltroTipoMinhas}
            opcoes={ESCALA_ACAO_TIPO_OPCOES_MINHAS}
          />
        </div>
        <div className="app-marketplace-filtro-minhas__cta">
          <button type="button" aria-label="Ofertar" style={getCtaCriarButtonStyle(brand)}>
            Ofertar
          </button>
        </div>
      </div>
    );

  const contentBox = getPageContentBoxStyle(brand, t);

  function renderTabelaVendas(rows: LinhaOfertaMarketplace[]) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_VAZIO_OFERTAS}
        </div>
      );
    }
    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Ofertas de vendas de turno ou folga</caption>
          <thead>
            <tr>
              <SortTableTh<OfertaSortCol>
                label="Data da Oferta"
                col="dataOferta"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Tipo de Ação"
                col="tipo"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Turno da Oferta"
                col="turnoOferta"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Operadora"
                col="operadora"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Ofertante"
                col="ofertante"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <th scope="col" style={dataTable.thHeader}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const zebra = dataTable.zebraRow(i);
              return (
                <tr
                  key={r.id}
                  style={{ background: zebra }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = zebra;
                  }}
                >
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>
                    {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                  </td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{r.operadora}</td>
                  <td style={dataTable.tdCenter}>{r.ofertante}</td>
                  <td style={dataTable.tdCenter}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        type="button"
                        aria-label="Ações da oferta"
                        style={{
                          border: `1px solid ${t.cardBorder}`,
                          background: t.inputBg,
                          borderRadius: 8,
                          padding: 6,
                          cursor: "pointer",
                          color: t.text,
                        }}
                      >
                        <MoreHorizontal size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaTrocaTodas(rows: LinhaOfertaMarketplace[]) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_VAZIO_OFERTAS}
        </div>
      );
    }
    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Ofertas de troca</caption>
          <thead>
            <tr>
              <SortTableTh<OfertaSortCol>
                label="Data da Oferta"
                col="dataOferta"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Turno da Oferta"
                col="turnoOferta"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Operadora"
                col="operadora"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Ofertante"
                col="ofertante"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Data de Interesse"
                col="dataInteresse"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Turno de Interesse"
                col="turnoInteresse"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <th scope="col" style={dataTable.thHeader}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const zebra = dataTable.zebraRow(i);
              return (
                <tr
                  key={r.id}
                  style={{ background: zebra }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = zebra;
                  }}
                >
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{r.operadora}</td>
                  <td style={dataTable.tdCenter}>{r.ofertante}</td>
                  <td style={dataTable.tdCenter}>{r.dataInteresseIso ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.turnoInteresse ?? "—"}</td>
                  <td style={dataTable.tdCenter}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        type="button"
                        aria-label="Ações da oferta"
                        style={{
                          border: `1px solid ${t.cardBorder}`,
                          background: t.inputBg,
                          borderRadius: 8,
                          padding: 6,
                          cursor: "pointer",
                          color: t.text,
                        }}
                      >
                        <MoreHorizontal size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaMinhasComTipo(
    rows: LinhaOfertaMarketplace[],
    variant: "interessado" | "em_analise" | "aberto",
  ) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_VAZIO_OFERTAS}
        </div>
      );
    }
    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Minhas ofertas</caption>
          <thead>
            <tr>
              <SortTableTh<OfertaSortCol>
                label="Data da Oferta"
                col="dataOferta"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Tipo de Ação"
                col="tipo"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Turno da Oferta"
                col="turnoOferta"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Operadora"
                col="operadora"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Data de Interesse"
                col="dataInteresse"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Turno de Interesse"
                col="turnoInteresse"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              {variant !== "aberto" && (
                <SortTableTh<OfertaSortCol>
                  label="Comprador"
                  col="comprador"
                  sortCol={sortOferta.col}
                  sortDir={sortOferta.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={onSortOferta}
                />
              )}
              {variant === "em_analise" && (
                <SortTableTh<OfertaSortCol>
                  label="Status"
                  col="status"
                  sortCol={sortOferta.col}
                  sortDir={sortOferta.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={onSortOferta}
                />
              )}
              <th scope="col" style={dataTable.thHeader}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const zebra = dataTable.zebraRow(i);
              return (
                <tr
                  key={r.id}
                  style={{ background: zebra }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = zebra;
                  }}
                >
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>
                    {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                  </td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{r.operadora}</td>
                  <td style={dataTable.tdCenter}>{r.dataInteresseIso ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.turnoInteresse ?? "—"}</td>
                  {variant !== "aberto" && (
                    <td style={dataTable.tdCenter}>{r.comprador ?? "—"}</td>
                  )}
                  {variant === "em_analise" && (
                    <td style={dataTable.tdCenter}>{r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}</td>
                  )}
                  <td style={dataTable.tdCenter}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        type="button"
                        aria-label="Ações da oferta"
                        style={{
                          border: `1px solid ${t.cardBorder}`,
                          background: t.inputBg,
                          borderRadius: 8,
                          padding: 6,
                          cursor: "pointer",
                          color: t.text,
                        }}
                      >
                        <MoreHorizontal size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaEncerradas(rows: LinhaOfertaMarketplace[]) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_VAZIO_OFERTAS}
        </div>
      );
    }
    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Ofertas encerradas</caption>
          <thead>
            <tr>
              <SortTableTh<OfertaSortCol>
                label="Data da Oferta"
                col="dataOferta"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Tipo de Ação"
                col="tipo"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Turno da Oferta"
                col="turnoOferta"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Operadora"
                col="operadora"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Data de Interesse"
                col="dataInteresse"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Turno de Interesse"
                col="turnoInteresse"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Comprador"
                col="comprador"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
              <SortTableTh<OfertaSortCol>
                label="Status"
                col="status"
                sortCol={sortOferta.col}
                sortDir={sortOferta.dir}
                thStyle={dataTable.thHeader}
                align="center"
                onSort={onSortOferta}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const zebra = dataTable.zebraRow(i);
              return (
                <tr
                  key={r.id}
                  style={{ background: zebra }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = zebra;
                  }}
                >
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>
                    {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                  </td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{r.operadora}</td>
                  <td style={dataTable.tdCenter}>{r.dataInteresseIso ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.turnoInteresse ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.comprador ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="escala_marketplace_turnos" />}
        title={getPageMenuLabel("escala_marketplace_turnos")}
        subtitle="Ofertas de venda e troca de turnos — todas as ofertas publicadas e as suas ofertas."
        brand={brand}
        t={t}
      />

      <div style={getFilterBarWrapperStyle(brand, t)}>
          <div style={filterBarSection(false)}>{blocoFiltrosLinha1}</div>
          <div role="tablist" aria-label="Vista do marketplace" style={filterBarSection(true)}>
            <FiltroBarTabButton
              id="tab-mkt-todas"
              active={aba === "todas"}
              aria-controls="panel-mkt-todas"
              onClick={() => setAba("todas")}
              icon={<Store size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
            >
              Todas as Ofertas
            </FiltroBarTabButton>
            <FiltroBarTabButton
              id="tab-mkt-minhas"
              active={aba === "minhas"}
              aria-controls="panel-mkt-minhas"
              onClick={() => setAba("minhas")}
              icon={<User size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
            >
              Minhas Ofertas
            </FiltroBarTabButton>
          </div>
      </div>

      {aba === "todas" && (
        <div role="tabpanel" id="panel-mkt-todas" aria-labelledby="tab-mkt-todas">
          <div style={contentBox}>
            <SectionTitle>Ofertas de Vendas</SectionTitle>
            {renderTabelaVendas(linhasVendasTodas)}
          </div>
          <div style={contentBox}>
            <SectionTitle>Ofertas de Troca</SectionTitle>
            {renderTabelaTrocaTodas(linhasTrocaTodas)}
          </div>
        </div>
      )}

      {aba === "minhas" && (
        <div role="tabpanel" id="panel-mkt-minhas" aria-labelledby="tab-mkt-minhas">
          <div style={contentBox}>
            <SectionTitle>Ofertas em análise</SectionTitle>
            {renderTabelaMinhasComTipo(porStatus("interessado"), "interessado")}
          </div>
          <div style={contentBox}>
            <SectionTitle>Ofertas em aprovação</SectionTitle>
            {renderTabelaMinhasComTipo(porStatus("em_analise"), "em_analise")}
          </div>
          <div style={contentBox}>
            <SectionTitle>Ofertas abertas</SectionTitle>
            {renderTabelaMinhasComTipo(porStatus("aberto"), "aberto")}
          </div>
          <div style={contentBox}>
            <SectionTitle>Ofertas encerradas</SectionTitle>
            {renderTabelaEncerradas(minhasBase.filter((r) => r.status === "aprovada" || r.status === "recusada"))}
          </div>
        </div>
      )}
    </div>
  );
}
