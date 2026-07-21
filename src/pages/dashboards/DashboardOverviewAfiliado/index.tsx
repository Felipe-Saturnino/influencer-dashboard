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
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { FunilAfiliados } from "../AfiliadosDash/FunilAfiliados";

type DetalheSortCol =
  | "afiliado"
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              width: "100%",
            }}
          >
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
              afiliados={[]}
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
        </div>

        {/* KPIs Executivos — sem Lives / Horas / Média de Views */}
        <div style={card}>
          <SectionTitle
            sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
          >
            KPIs Executivos
          </SectionTitle>
          <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
            <KpiCard
              label="GGR"
              value="—"
              icon={<TrendingUp size={16} aria-hidden />}
              accentColor={BRAND.verde}
              atual={0}
              anterior={0}
              isBRL
              isHistorico={historico}
            />
            <KpiCard
              label="Investimento"
              value="—"
              icon={<Coins size={16} aria-hidden />}
              accentVar="--brand-contrast"
              accentColor={BRAND.azul}
              atual={0}
              anterior={0}
              isBRL
              isHistorico={historico}
            />
            <KpiCard
              label="ROI"
              value="—"
              icon={<BarChart2 size={16} aria-hidden />}
              accentColor={BRAND.verde}
              atual={0}
              anterior={0}
              isHistorico={historico}
            />
          </div>
          <div className="app-grid-kpi-4">
            <KpiCard
              label="Registros"
              value="—"
              icon={<UserPlus size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={BRAND.roxo}
              atual={0}
              anterior={0}
              isHistorico={historico}
            />
            <KpiCard
              label="FTDs"
              value="—"
              icon={<Trophy size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={BRAND.roxo}
              atual={0}
              anterior={0}
              isHistorico={historico}
            />
            <KpiCard
              label="Depósitos"
              value="—"
              icon={<ArrowDownToLine size={16} aria-hidden />}
              accentVar="--brand-icon-color"
              accentColor={BRAND.ciano}
              atual={0}
              anterior={0}
              isBRL
              isHistorico={historico}
            />
            <KpiCard
              label="Saques"
              value="—"
              icon={<ArrowUpFromLine size={16} aria-hidden />}
              accentColor={BRAND.vermelho}
              atual={0}
              anterior={0}
              isBRL
              isHistorico={historico}
              isInverso
            />
          </div>
        </div>

        <div style={card}>
          <SectionTitle sub={historico ? "acumulado" : undefined}>Funil de Conversão</SectionTitle>
          <FunilAfiliados />
        </div>

        <div style={card}>
          <SectionTitle sub={historico ? "acumulado" : undefined}>Eficiência</SectionTitle>
          <div className="app-grid-kpi-4">
            <RateCard label="Ticket Médio FTD" value="—" />
            <RateCard label="Ticket Médio Depósito" value="—" />
            <RateCard label="Ticket Médio Saque" value="—" />
            <RateCard label="GGR por Jogador" value="—" />
          </div>
        </div>

        <div style={{ ...card, marginBottom: 0 }}>
          <SectionTitle sub={historico ? "mês a mês" : "dia a dia"}>
            {historico ? "Detalhamento Mensal" : "Detalhamento Diário"}
          </SectionTitle>
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
          <div
            className="app-table-wrap"
            style={{ ...getDataTableWrapStyle(), opacity: 0.55, pointerEvents: "none" }}
            aria-hidden
          >
            <table style={getDataTableStyle({ minWidth: 960 })}>
              <caption style={{ display: "none" }}>
                Detalhamento de afiliados — estrutura de colunas
              </caption>
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
                      thStyle={dataTable.thHeader}
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
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
