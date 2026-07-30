import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Loader2,
  TrendingUp,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardCatalogos } from "../../../hooks/useDashboardCatalogos";
import { useAfiliadosDashboardData } from "../../../hooks/useAfiliadosDashboardData";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import { BRAND, MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import {
  fmtBRL,
  getIdxMesCarrosselPadrao,
  getMesesDisponiveis,
} from "../../../lib/dashboardHelpers";
import {
  DashboardPageHeader,
  FiltroAfiliadoSelect,
  AFILIADO_FILTRO_TODOS_VALUE,
  FiltroHistoricoButton,
  FiltroOperadoraSelect,
  KpiCard,
  SectionTitle,
  SkeletonKpiCard,
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { FunilAfiliados } from "../AfiliadosDash/FunilAfiliados";

type DetalheSortCol =
  | "afiliado"
  | "periodo"
  | "acessos"
  | "registros"
  | "ftds"
  | "ftdValor"
  | "depositos"
  | "depositosValor"
  | "saques"
  | "saquesValor"
  | "ggr";

function RateCard({ label, value }: { label: string; value: string }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg,
        fontFamily: FONT.body,
      }}
    >
      <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: brand.primary }}>{value}</div>
    </div>
  );
}

export default function DashboardOverviewAfiliado() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("dash_overview_afiliado");
  const { showFiltroOperadora, podeVerOperadora } = useDashboardFiltros();
  const { operadoras } = useDashboardCatalogos();
  const dataTable = useDataTableBlock();

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const idxInicial = useMemo(() => getIdxMesCarrosselPadrao(mesesDisponiveis), [mesesDisponiveis]);
  const [idxMes, setIdxMes] = useState(idxInicial);
  const [historico, setHistorico] = useState(false);
  const [filtroAfiliado, setFiltroAfiliado] = useState(AFILIADO_FILTRO_TODOS_VALUE);
  const [filtroOperadora, setFiltroOperadora] = useState("todas");
  const [sort, setSort] = useState<{ col: DetalheSortCol; dir: SortDir }>({
    col: "ggr",
    dir: "desc",
  });

  const operadorasList = useMemo(
    () => operadoras.filter((o) => podeVerOperadora(o.slug)),
    [operadoras, podeVerOperadora],
  );
  const mesSelecionado = mesesDisponiveis[idxMes];
  const card = getPageContentBoxStyle(brand, t);

  const {
    loading,
    totais,
    totaisAnt,
    detalhe,
    afiliadoOptions,
  } = useAfiliadosDashboardData({
    historico,
    mesSelecionado,
    filtroAfiliado,
    filtroOperadora,
    detalhePorAfiliado: true,
  });

  const detalheOrdenado = useMemo(() => {
    const list = [...detalhe];
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sort.col) {
        case "afiliado":
          cmp = (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
          break;
        case "periodo":
          cmp = (a.data ?? "").localeCompare(b.data ?? "");
          break;
        case "acessos":
          cmp = a.acessos - b.acessos;
          break;
        case "registros":
          cmp = a.registros - b.registros;
          break;
        case "ftds":
          cmp = a.ftd_count - b.ftd_count;
          break;
        case "ftdValor":
          cmp = a.ftd_total - b.ftd_total;
          break;
        case "depositos":
          cmp = a.deposit_count - b.deposit_count;
          break;
        case "depositosValor":
          cmp = a.deposit_total - b.deposit_total;
          break;
        case "saques":
          cmp = a.withdrawal_count - b.withdrawal_count;
          break;
        case "saquesValor":
          cmp = a.withdrawal_total - b.withdrawal_total;
          break;
        case "ggr":
          cmp = a.ggr - b.ggr;
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return list;
  }, [detalhe, sort]);

  const ticketFTD = totais.ftds > 0 ? fmtBRL(totais.ftd_total / totais.ftds) : "—";
  const ticketDep = totais.depositos_qtd > 0 ? fmtBRL(totais.depositos_valor / totais.depositos_qtd) : "—";
  const ticketSaque = totais.saques_qtd > 0 ? fmtBRL(totais.saques_valor / totais.saques_qtd) : "—";
  const ggrPorJogador = totais.ftds > 0 ? fmtBRL(totais.ggr / totais.ftds) : "—";

  if (perm.loading) {
    return (
      <div
        className="app-page-shell"
        style={{
          background: t.bg,
          minHeight: "100vh",
          fontFamily: FONT.body,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={24}
          className="app-lucide-spin"
          color="var(--brand-action, #7c3aed)"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div
        className="app-page-shell"
        style={{
          padding: 24,
          textAlign: "center",
          color: t.textMuted,
          fontFamily: FONT.body,
          background: t.bg,
        }}
      >
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <div className="app-page-shell">
        <DashboardPageHeader
          icon={<PageMenuIcon pageKey="dash_overview_afiliado" />}
          title={getPageMenuLabel("dash_overview_afiliado")}
          subtitle={getPageCanonicalSubtitle("dash_overview_afiliado")}
          brand={brand}
          t={t}
        />

        <div style={getPageFilterBoxStyle(brand, t)}>
          <div className="app-filter-bar-tabs-cta">
            <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
            <div className="app-filter-bar-tabs-cta__tabs">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                aria-label="Mês anterior"
                style={getCarouselBtnNavStyle(t, historico || idxMes === 0)}
                onClick={() => {
                  setHistorico(false);
                  setIdxMes((i) => Math.max(0, i - 1));
                }}
                disabled={historico || idxMes === 0}
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <span style={getCarouselPeriodLabelStyle(t, { minWidth: "clamp(120px, 40vw, 180px)" })}>
                {historico ? "Todo o período" : mesSelecionado?.label}
              </span>
              <button
                type="button"
                aria-label="Próximo mês"
                style={getCarouselBtnNavStyle(t, historico || idxMes === mesesDisponiveis.length - 1)}
                onClick={() => {
                  setHistorico(false);
                  setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
                }}
                disabled={historico || idxMes === mesesDisponiveis.length - 1}
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>

            <FiltroHistoricoButton
              active={historico}
              onClick={() => {
                setHistorico((h) => {
                  if (h) {
                    setIdxMes(idxInicial);
                    return false;
                  }
                  return true;
                });
              }}
            />

            <FiltroAfiliadoSelect
              mode="single"
              value={filtroAfiliado}
              onChange={setFiltroAfiliado}
              afiliados={afiliadoOptions.map((a) => ({ id: a.id, name: a.nome }))}
            />

            {showFiltroOperadora && (
              <FiltroOperadoraSelect
                pill
                minWidth={200}
                value={filtroOperadora}
                onChange={setFiltroOperadora}
                operadoras={operadorasList}
                podeVerOperadora={podeVerOperadora}
              />
            )}
            </div>
            <div className="app-filter-bar-tabs-cta__actions">
              <AjudaContextualAcoes pageKey="dash_overview_afiliado" />
            </div>
          </div>
        </div>

        <div style={card}>
          <SectionTitle
            sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
          >
            KPIs Executivos
          </SectionTitle>
          {loading ? (
            <>
              <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
                <SkeletonKpiCard />
                <SkeletonKpiCard />
                <SkeletonKpiCard />
              </div>
              <div className="app-grid-kpi-4">
                <SkeletonKpiCard />
                <SkeletonKpiCard />
                <SkeletonKpiCard />
                <SkeletonKpiCard />
              </div>
            </>
          ) : (
            <>
              <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
                <KpiCard
                  label="GGR"
                  value={fmtBRL(totais.ggr)}
                  icon={<TrendingUp size={16} aria-hidden />}
                  accentColor={totais.ggr >= 0 ? BRAND.verde : BRAND.vermelho}
                  atual={totais.ggr}
                  anterior={totaisAnt.ggr}
                  isBRL
                  isHistorico={historico}
                />
                <KpiCard
                  label="Investimento"
                  value={fmtBRL(totais.investimento)}
                  icon={<Coins size={16} aria-hidden />}
                  accentVar="--brand-contrast"
                  accentColor={BRAND.azul}
                  atual={totais.investimento}
                  anterior={totaisAnt.investimento}
                  isBRL
                  isHistorico={historico}
                />
                <KpiCard
                  label="ROI"
                  value={
                    totais.investimento > 0
                      ? `${totais.roi >= 0 ? "+" : ""}${totais.roi.toFixed(1)}%`
                      : "—"
                  }
                  icon={<BarChart2 size={16} aria-hidden />}
                  accentColor={
                    totais.investimento > 0
                      ? totais.roi >= 0
                        ? BRAND.verde
                        : BRAND.vermelho
                      : BRAND.verde
                  }
                  atual={totais.roi}
                  anterior={totaisAnt.roi}
                  isHistorico={historico}
                />
              </div>
              <div className="app-grid-kpi-4">
                <KpiCard
                  label="Registros"
                  value={totais.registros.toLocaleString("pt-BR")}
                  icon={<UserPlus size={16} aria-hidden />}
                  accentVar="--brand-action"
                  accentColor={BRAND.roxo}
                  atual={totais.registros}
                  anterior={totaisAnt.registros}
                  isHistorico={historico}
                />
                <KpiCard
                  label="FTDs"
                  value={totais.ftds.toLocaleString("pt-BR")}
                  icon={<Trophy size={16} aria-hidden />}
                  accentVar="--brand-action"
                  accentColor={BRAND.roxo}
                  atual={totais.ftds}
                  anterior={totaisAnt.ftds}
                  isHistorico={historico}
                  subValue={{ label: "valor", value: fmtBRL(totais.ftd_total) }}
                />
                <KpiCard
                  label="Depósitos"
                  value={fmtBRL(totais.depositos_valor)}
                  icon={<ArrowDownToLine size={16} aria-hidden />}
                  accentVar="--brand-icon-color"
                  accentColor={BRAND.ciano}
                  atual={totais.depositos_valor}
                  anterior={totaisAnt.depositos_valor}
                  isBRL
                  isHistorico={historico}
                />
                <KpiCard
                  label="Saques"
                  value={fmtBRL(totais.saques_valor)}
                  icon={<ArrowUpFromLine size={16} aria-hidden />}
                  accentColor={BRAND.vermelho}
                  atual={totais.saques_valor}
                  anterior={totaisAnt.saques_valor}
                  isBRL
                  isHistorico={historico}
                  isInverso
                />
              </div>
            </>
          )}
        </div>

        <div style={card}>
          <SectionTitle sub={historico ? "acumulado" : undefined}>Funil de Conversão</SectionTitle>
          <FunilAfiliados
            acessos={totais.acessos}
            registros={totais.registros}
            ftds={totais.ftds}
          />
        </div>

        <div style={card}>
          <SectionTitle sub={historico ? "acumulado" : undefined}>Eficiência</SectionTitle>
          <div className="app-grid-kpi-4">
            <RateCard label="Ticket Médio FTD" value={ticketFTD} />
            <RateCard label="Ticket Médio Depósito" value={ticketDep} />
            <RateCard label="Ticket Médio Saque" value={ticketSaque} />
            <RateCard label="GGR por Jogador" value={ggrPorJogador} />
          </div>
        </div>

        <div style={{ ...card, marginBottom: 0 }}>
          <SectionTitle sub={historico ? "por afiliado (acumulado)" : "por afiliado"}>
            Detalhamento por Afiliado
          </SectionTitle>
          {!loading && detalheOrdenado.length === 0 ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: t.textMuted,
                fontSize: 13,
                fontFamily: FONT.body,
              }}
            >
              {MSG_SEM_DADOS_FILTRO}
            </div>
          ) : (
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 960 })}>
                <caption style={{ display: "none" }}>Detalhamento de métricas por afiliado</caption>
                <thead>
                  <tr>
                    {(
                      [
                        ["afiliado", "Afiliado"],
                        ["acessos", "Acessos"],
                        ["registros", "Registros"],
                        ["ftds", "# FTDs"],
                        ["ftdValor", "R$ FTDs"],
                        ["depositos", "# Depósitos"],
                        ["depositosValor", "R$ Depósitos"],
                        ["saques", "# Saques"],
                        ["saquesValor", "R$ Saques"],
                        ["ggr", "R$ GGR"],
                      ] as const
                    ).map(([col, label]) => (
                      <SortTableTh
                        key={col}
                        col={col}
                        label={label}
                        sortCol={sort.col}
                        sortDir={sort.dir}
                        thStyle={col === "afiliado" ? dataTable.thHeaderSticky : dataTable.thHeader}
                        align="center"
                        onSort={(c) =>
                          setSort((s) => ({
                            col: c,
                            dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                          }))
                        }
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? null
                    : detalheOrdenado.map((r, i) => (
                        <tr key={r.afiliado_id ?? `${r.nome}-${i}`} style={{ background: dataTable.zebraRow(i) }}>
                          <td style={dataTable.tdSticky({ rowIndex: i })}>{r.nome ?? "—"}</td>
                          <td style={dataTable.tdCenter}>{r.acessos.toLocaleString("pt-BR")}</td>
                          <td style={dataTable.tdCenter}>{r.registros.toLocaleString("pt-BR")}</td>
                          <td style={dataTable.tdCenter}>{r.ftd_count.toLocaleString("pt-BR")}</td>
                          <td style={dataTable.tdCenter}>{fmtBRL(r.ftd_total)}</td>
                          <td style={dataTable.tdCenter}>{r.deposit_count.toLocaleString("pt-BR")}</td>
                          <td style={dataTable.tdCenter}>{fmtBRL(r.deposit_total)}</td>
                          <td style={dataTable.tdCenter}>{r.withdrawal_count.toLocaleString("pt-BR")}</td>
                          <td style={dataTable.tdCenter}>{fmtBRL(r.withdrawal_total)}</td>
                          <td style={dataTable.tdCenter}>{fmtBRL(r.ggr)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
