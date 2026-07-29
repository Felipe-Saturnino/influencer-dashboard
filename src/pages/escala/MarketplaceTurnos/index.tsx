import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Ban, Check, ChevronLeft, ChevronRight, Loader2, Store, User } from "lucide-react";
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
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { isDataNoPeriodoHistoricoCompetencias } from "../../../lib/dashboardHelpers";
import { FILTRO_BAR_TAB_ICON_SIZE, getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
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
} from "../../../lib/escalaTurnosUiConstants";
import type { RhCalendarioAcaoTipo } from "../../../lib/rhCalendarioAcaoHelpers";
import {
  getMesesDisponiveisEscalaCarrossel,
  idxMesInicialEscalaCarrossel,
} from "../../../lib/escalaMesCarrosselOverviewStyle";
import {
  carregarMeuContextoMarketplace,
  carregarMinhaGradeMarketplace,
  carregarOfertasMarketplace,
  type MarketplaceMeuContexto,
  type MarketplaceMinhaGrade,
} from "../../../lib/escalaMarketplace";
import { ModalOfertarMarketplace } from "./ModalOfertarMarketplace";
import { ModalAceitarOfertaMarketplace } from "./ModalAceitarOfertaMarketplace";
import { ModalCancelarOfertaMarketplace } from "./ModalCancelarOfertaMarketplace";

const MARKETPLACE_TIME_ITEMS = ESCALA_TIME_OPCOES.filter((o) => o.value !== "todos").map((o) => ({
  id: o.value,
  name: o.label,
}));

const MSG_VAZIO_OFERTAS = "Sem ofertas para os filtros selecionados.";
const GRADE_VAZIA: MarketplaceMinhaGrade = { aprovada: false, areaKey: "", valorPorIso: new Map() };

function refMesIsoPrimeiroDia(ano: number, mes0: number): string {
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${ano}-${p2(mes0 + 1)}-01`;
}

function refMesIsoDaData(dataIso: string): string {
  return `${dataIso.slice(0, 7)}-01`;
}

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

/** Blocos da aba Minhas Ofertas — cada um com o seu conjunto de colunas. */
type MinhasVariant = "abertas" | "aceitei" | "historico";

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

/** Oferta ainda disponível para aceite. */
function ofertaEmAberto(row: LinhaOfertaMarketplace): boolean {
  return row.status === "aberto" || row.status === "interessado";
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
  const [ofertas, setOfertas] = useState<LinhaOfertaMarketplace[]>([]);
  const [loadingOfertas, setLoadingOfertas] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [contexto, setContexto] = useState<MarketplaceMeuContexto | null>(null);
  const [gradeMes, setGradeMes] = useState<MarketplaceMinhaGrade>(GRADE_VAZIA);
  const [gradeAceite, setGradeAceite] = useState<MarketplaceMinhaGrade>(GRADE_VAZIA);

  const [ofertarAberto, setOfertarAberto] = useState(false);
  const [ofertaAceitar, setOfertaAceitar] = useState<LinhaOfertaMarketplace | null>(null);
  const [ofertaCancelar, setOfertaCancelar] = useState<LinhaOfertaMarketplace | null>(null);
  const [preparandoAceiteId, setPreparandoAceiteId] = useState<string | null>(null);

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

  const mesSelecionado = mesesDisponiveis[idxMes];

  const refMesGrade = useMemo(() => {
    const m = historico ? mesesDisponiveis[idxMesInicial >= 0 ? idxMesInicial : mesesDisponiveis.length - 1] : mesSelecionado;
    return m ? refMesIsoPrimeiroDia(m.ano, m.mes) : null;
  }, [historico, mesSelecionado, mesesDisponiveis, idxMesInicial]);

  const recarregar = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    void carregarMeuContextoMarketplace().then((ctx) => {
      if (!cancelled) setContexto(ctx);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingOfertas(true);
    const refMes = historico
      ? null
      : mesSelecionado
        ? refMesIsoPrimeiroDia(mesSelecionado.ano, mesSelecionado.mes)
        : null;
    void carregarOfertasMarketplace(refMes)
      .then((rows) => {
        if (!cancelled) setOfertas(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingOfertas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historico, mesSelecionado, reloadKey]);

  useEffect(() => {
    if (!refMesGrade) {
      setGradeMes(GRADE_VAZIA);
      return;
    }
    let cancelled = false;
    void carregarMinhaGradeMarketplace(refMesGrade).then((g) => {
      if (!cancelled) setGradeMes(g);
    });
    return () => {
      cancelled = true;
    };
  }, [refMesGrade, reloadKey]);

  const linhasMes = useMemo(() => {
    if (historico) {
      return ofertas.filter((r) => isDataNoPeriodoHistoricoCompetencias(r.dataOfertaIso));
    }
    const m = mesesDisponiveis[idxMes];
    if (!m) return [];
    return filtrarPorMesEscala(ofertas, m.ano, m.mes);
  }, [ofertas, mesesDisponiveis, idxMes, historico]);

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
      (r) =>
        (r.tipo === "oferta_troca" || r.tipo === "troca_cassada") &&
        passaFiltroTipo(r, filtroTipoTodas) &&
        passaFiltroTime(r, filtroTimeTodas),
    );
  }, [linhasMes, filtroTipoTodas, filtroTimeTodas]);

  const minhasBase = useMemo(
    () => linhasMes.filter((r) => passaFiltroTipo(r, filtroTipoMinhas)),
    [linhasMes, filtroTipoMinhas],
  );

  const minhasAbertas = useMemo(
    () => minhasBase.filter((r) => r.souOfertante === true && ofertaEmAberto(r)),
    [minhasBase],
  );
  const minhasAceitas = useMemo(
    () => minhasBase.filter((r) => r.souInteressado === true),
    [minhasBase],
  );
  const minhasEncerradas = useMemo(
    () => minhasBase.filter((r) => r.souOfertante === true && !ofertaEmAberto(r)),
    [minhasBase],
  );

  const souPrestadorCadastrado = !!contexto?.funcionarioId;
  const podeOfertar = perm.canCriarOk && souPrestadorCadastrado;

  const abrirAceite = useCallback(async (row: LinhaOfertaMarketplace) => {
    setPreparandoAceiteId(row.id);
    const grade = await carregarMinhaGradeMarketplace(refMesIsoDaData(row.dataOfertaIso));
    setGradeAceite(grade);
    setOfertaAceitar(row);
    setPreparandoAceiteId(null);
  }, []);

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

  const ctaOfertar = podeOfertar ? (
    <CtaCriarButton onClick={() => setOfertarAberto(true)}>Nova Oferta</CtaCriarButton>
  ) : null;

  const blocoFiltrosLinha1 = (
    <div className="app-marketplace-filtro-minhas">
      <span className="app-marketplace-filtro-minhas__spacer" aria-hidden="true" />
      <div className="app-marketplace-filtro-minhas__centro" role="group" aria-label="Período e tipo de ação">
        {blocoCarrosselHistorico}
        {aba === "todas" ? (
          <>
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
          <FiltroSolicitacoesTipoAcaoSelect
            value={filtroTipoMinhas}
            onChange={setFiltroTipoMinhas}
            opcoes={ESCALA_ACAO_TIPO_OPCOES_MINHAS}
          />
        )}
      </div>
      <div className="app-marketplace-filtro-minhas__cta">{ctaOfertar}</div>
    </div>
  );

  const contentBox = getPageContentBoxStyle(brand, t);

  function celulaVazia() {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        {MSG_VAZIO_OFERTAS}
      </div>
    );
  }

  function thSort(label: string, col: OfertaSortCol) {
    return (
      <SortTableTh<OfertaSortCol>
        label={label}
        col={col}
        sortCol={sortOferta.col}
        sortDir={sortOferta.dir}
        thStyle={dataTable.thHeader}
        align="center"
        onSort={onSortOferta}
      />
    );
  }

  function acoesTodas(row: LinhaOfertaMarketplace) {
    if (row.souOfertante) {
      return <span style={{ color: t.textMuted, fontSize: 12 }}>Sua oferta</span>;
    }
    if (!ofertaEmAberto(row) || !podeOfertar || row.mesmoTime === false) {
      return <span style={{ color: t.textMuted }}>—</span>;
    }
    if (preparandoAceiteId === row.id) {
      return <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color={brand.accent} />;
    }
    return (
      <BtnIconeAcaoLinha label={tooltipAcao("Aceitar Oferta")} onClick={() => void abrirAceite(row)}>
        <Check size={14} aria-hidden="true" />
      </BtnIconeAcaoLinha>
    );
  }

  function linhaTabela(row: LinhaOfertaMarketplace, i: number, celulas: React.ReactNode) {
    const zebra = dataTable.zebraRow(i);
    return (
      <tr
        key={row.id}
        style={{ background: zebra }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = tableRowHoverBg(t.isDark);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = zebra;
        }}
      >
        {celulas}
      </tr>
    );
  }

  function tdAcoes(conteudo: React.ReactNode) {
    return (
      <td style={dataTable.tdCenter}>
        <div style={{ display: "flex", justifyContent: "center" }}>{conteudo}</div>
      </td>
    );
  }

  function labelTipo(row: LinhaOfertaMarketplace) {
    return RH_CALENDARIO_ACAO_LABEL_FORMAL[row.tipo as RhCalendarioAcaoTipo] ?? row.tipo;
  }

  function renderTabelaVendas(rows: LinhaOfertaMarketplace[]) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) return celulaVazia();
    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Ofertas de vendas de turno ou folga</caption>
          <thead>
            <tr>
              {thSort("Data da Oferta", "dataOferta")}
              {thSort("Tipo de Ação", "tipo")}
              {thSort("Turno da Oferta", "turnoOferta")}
              {thSort("Operadora", "operadora")}
              {thSort("Ofertante", "ofertante")}
              {thSort("Status", "status")}
              <th scope="col" style={dataTable.thHeader}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) =>
              linhaTabela(
                r,
                i,
                <>
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>{labelTipo(r)}</td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{r.operadora}</td>
                  <td style={dataTable.tdCenter}>{r.ofertante}</td>
                  <td style={dataTable.tdCenter}>{r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}</td>
                  {tdAcoes(acoesTodas(r))}
                </>,
              ),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaTrocaTodas(rows: LinhaOfertaMarketplace[]) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) return celulaVazia();
    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Ofertas de troca</caption>
          <thead>
            <tr>
              {thSort("Data da Oferta", "dataOferta")}
              {thSort("Turno da Oferta", "turnoOferta")}
              {thSort("Operadora", "operadora")}
              {thSort("Ofertante", "ofertante")}
              {thSort("Data de Interesse", "dataInteresse")}
              {thSort("Turno de Interesse", "turnoInteresse")}
              {thSort("Status", "status")}
              <th scope="col" style={dataTable.thHeader}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) =>
              linhaTabela(
                r,
                i,
                <>
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{r.operadora}</td>
                  <td style={dataTable.tdCenter}>{r.ofertante}</td>
                  <td style={dataTable.tdCenter}>{r.dataInteresseIso ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.turnoInteresse ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}</td>
                  {tdAcoes(acoesTodas(r))}
                </>,
              ),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaMinhas(rows: LinhaOfertaMarketplace[], variant: MinhasVariant) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) return celulaVazia();
    const mostrarOfertante = variant === "aceitei";
    const mostrarComprador = variant === "historico";
    const mostrarStatus = variant !== "abertas";
    const mostrarAcoes = variant === "abertas";

    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Minhas ofertas no Marketplace</caption>
          <thead>
            <tr>
              {thSort("Data da Oferta", "dataOferta")}
              {thSort("Tipo de Ação", "tipo")}
              {thSort("Turno da Oferta", "turnoOferta")}
              {thSort("Operadora", "operadora")}
              {mostrarOfertante && thSort("Ofertante", "ofertante")}
              {thSort("Data de Interesse", "dataInteresse")}
              {thSort("Turno de Interesse", "turnoInteresse")}
              {mostrarComprador && thSort("Aceito por", "comprador")}
              {mostrarStatus && thSort("Status", "status")}
              {mostrarAcoes && (
                <th scope="col" style={dataTable.thHeader}>
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) =>
              linhaTabela(
                r,
                i,
                <>
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>{labelTipo(r)}</td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{r.operadora}</td>
                  {mostrarOfertante && <td style={dataTable.tdCenter}>{r.ofertante}</td>}
                  <td style={dataTable.tdCenter}>{r.dataInteresseIso ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.turnoInteresse ?? "—"}</td>
                  {mostrarComprador && <td style={dataTable.tdCenter}>{r.comprador ?? "—"}</td>}
                  {mostrarStatus && (
                    <td style={dataTable.tdCenter}>{r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}</td>
                  )}
                  {mostrarAcoes &&
                    tdAcoes(
                      <BtnIconeAcaoLinha
                        label={tooltipAcao("Cancelar Oferta")}
                        onClick={() => setOfertaCancelar(r)}
                      >
                        <Ban size={14} aria-hidden="true" />
                      </BtnIconeAcaoLinha>,
                    )}
                </>,
              ),
            )}
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

      {loadingOfertas ? (
        <div style={contentBox}>
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Carregando…
          </div>
        </div>
      ) : (
        <>
          {aba === "todas" && (
            <div role="tabpanel" id="panel-mkt-todas" aria-labelledby="tab-mkt-todas">
              <div style={contentBox}>
                <SectionTitle sub="Turnos e folgas disponíveis para assumir">
                  Ofertas de Vendas
                </SectionTitle>
                {renderTabelaVendas(linhasVendasTodas)}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Turnos oferecidos em troca de outro dia">Ofertas de Troca</SectionTitle>
                {renderTabelaTrocaTodas(linhasTrocaTodas)}
              </div>
            </div>
          )}

          {aba === "minhas" && (
            <div role="tabpanel" id="panel-mkt-minhas" aria-labelledby="tab-mkt-minhas">
              <div style={contentBox}>
                <SectionTitle sub="Publicadas por você e ainda disponíveis">
                  Minhas ofertas abertas
                </SectionTitle>
                {renderTabelaMinhas(minhasAbertas, "abertas")}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Ofertas de colegas que você assumiu">Ofertas que aceitei</SectionTitle>
                {renderTabelaMinhas(minhasAceitas, "aceitei")}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Suas ofertas já aceitas ou canceladas">Histórico encerrado</SectionTitle>
                {renderTabelaMinhas(minhasEncerradas, "historico")}
              </div>
            </div>
          )}
        </>
      )}

      <ModalOfertarMarketplace
        open={ofertarAberto}
        onClose={() => setOfertarAberto(false)}
        onCriada={recarregar}
        contexto={contexto}
        grade={gradeMes}
        labelMes={mesSelecionado?.label ?? ""}
      />

      <ModalAceitarOfertaMarketplace
        oferta={ofertaAceitar}
        onClose={() => setOfertaAceitar(null)}
        onAceita={recarregar}
        contexto={contexto}
        grade={gradeAceite}
      />

      <ModalCancelarOfertaMarketplace
        oferta={ofertaCancelar}
        onClose={() => setOfertaCancelar(null)}
        onCancelada={recarregar}
      />
    </div>
  );
}
