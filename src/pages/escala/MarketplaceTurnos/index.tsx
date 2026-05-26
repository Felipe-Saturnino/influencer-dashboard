import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, Store, User } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import {
  DashboardPageHeader,
  FiltroCalendarioTimeSelect,
  FiltroBarTabButton,
  FiltroHistoricoButton,
  FiltroSolicitacoesTipoAcaoSelect,
  SectionTitle,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FILTRO_BAR_TAB_ICON_SIZE, getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getCtaCriarButtonStyle } from "../../../lib/ctaCriarStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
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

  const [aba, setAba] = useState<"todas" | "minhas">("todas");
  const [filtroTipoTodas, setFiltroTipoTodas] = useState<EscalaAcaoFiltro>("todos");
  const [filtroTimeIdsTodas, setFiltroTimeIdsTodas] = useState<string[]>([]);
  const [filtroTipoMinhas, setFiltroTipoMinhas] = useState<EscalaAcaoFiltro>("todos");

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
      <>
        {blocoCarrosselHistorico}
        <FiltroSolicitacoesTipoAcaoSelect
          value={filtroTipoMinhas}
          onChange={setFiltroTipoMinhas}
          opcoes={ESCALA_ACAO_TIPO_OPCOES_MINHAS}
        />
        <button
          type="button"
          aria-label="Ofertar"
          style={{ ...getCtaCriarButtonStyle(brand), marginLeft: "auto" }}
        >
          Ofertar
        </button>
      </>
    );

  const contentBox = getPageContentBoxStyle(brand, t);

  function renderTabelaVendas(rows: LinhaOfertaMarketplace[]) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_VAZIO_OFERTAS}
        </div>
      );
    }
    return (
      <div className="app-table-wrap">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <caption style={{ display: "none" }}>Ofertas de vendas de turno ou folga</caption>
          <thead>
            <tr>
              {["Data da Oferta", "Tipo de Ação", "Turno da Oferta", "Operadora", "Ofertante", "Ações"].map((h) => (
                <th key={h} scope="col" style={getThStyle(t)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.dataOfertaIso}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoOferta}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.operadora}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.ofertante}</td>
                <td style={getTdStyle(t, { textAlign: "center", background: zebraStripe(i) })}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaTrocaTodas(rows: LinhaOfertaMarketplace[]) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_VAZIO_OFERTAS}
        </div>
      );
    }
    const headers = [
      "Data da Oferta",
      "Turno da Oferta",
      "Operadora",
      "Ofertante",
      "Data de Interesse",
      "Turno de Interesse",
      "Ações",
    ];
    return (
      <div className="app-table-wrap">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <caption style={{ display: "none" }}>Ofertas de troca</caption>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col" style={getThStyle(t)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.dataOfertaIso}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoOferta}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.operadora}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.ofertante}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {r.dataInteresseIso ?? "—"}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoInteresse ?? "—"}</td>
                <td style={getTdStyle(t, { textAlign: "center", background: zebraStripe(i) })}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaMinhasComTipo(
    rows: LinhaOfertaMarketplace[],
    variant: "interessado" | "em_analise" | "aberto",
  ) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_VAZIO_OFERTAS}
        </div>
      );
    }
    const headers =
      variant === "interessado"
        ? [
            "Data da Oferta",
            "Tipo de Ação",
            "Turno da Oferta",
            "Operadora",
            "Data de Interesse",
            "Turno de Interesse",
            "Comprador",
            "Ações",
          ]
        : variant === "em_analise"
          ? [
              "Data da Oferta",
              "Tipo de Ação",
              "Turno da Oferta",
              "Operadora",
              "Data de Interesse",
              "Turno de Interesse",
              "Comprador",
              "Status",
              "Ações",
            ]
          : [
              "Data da Oferta",
              "Tipo de Ação",
              "Turno da Oferta",
              "Operadora",
              "Data de Interesse",
              "Turno de Interesse",
              "Ações",
            ];
    return (
      <div className="app-table-wrap">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <caption style={{ display: "none" }}>Minhas ofertas</caption>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col" style={getThStyle(t)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.dataOfertaIso}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoOferta}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.operadora}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {r.dataInteresseIso ?? "—"}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoInteresse ?? "—"}</td>
                {variant !== "aberto" && (
                  <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.comprador ?? "—"}</td>
                )}
                {variant === "em_analise" && (
                  <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                    {r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}
                  </td>
                )}
                <td style={getTdStyle(t, { textAlign: "center", background: zebraStripe(i) })}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaEncerradas(rows: LinhaOfertaMarketplace[]) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_VAZIO_OFERTAS}
        </div>
      );
    }
    const cols = [
      "Data da Oferta",
      "Tipo de Ação",
      "Turno da Oferta",
      "Operadora",
      "Data de Interesse",
      "Turno de Interesse",
      "Comprador",
      "Status",
    ];
    return (
      <div className="app-table-wrap">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <caption style={{ display: "none" }}>Ofertas encerradas</caption>
          <thead>
            <tr>
              {cols.map((h) => (
                <th key={h} scope="col" style={getThStyle(t)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.dataOfertaIso}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoOferta}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.operadora}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {r.dataInteresseIso ?? "—"}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoInteresse ?? "—"}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.comprador ?? "—"}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}
                </td>
              </tr>
            ))}
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
        subtitle="Ofertas de venda e troca de turnos — todas as publicações e as suas."
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
