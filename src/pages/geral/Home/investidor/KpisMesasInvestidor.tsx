import { ArrowUpDown, Hash, Loader2, TrendingUp } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { fmtBRL } from "../../../../lib/dashboardHelpers";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { getHomeKpiReferenciaMes } from "../../../../lib/homeInvestidorMtd";
import { useHomeInvestidorKpisMesas } from "../hooks/useHomeInvestidorKpisMesas";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { HomeSectionMesSubtitle } from "../shared/HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_FOOTER_HINT, HOME_LINK_BUTTON } from "../shared/homeSharedUi";

export function KpisMesasInvestidor() {
  const { theme: t, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const { loading, erro, data } = useHomeInvestidorKpisMesas();
  const box = getPageContentBoxStyle(brand, t);

  const fmtApostas = (n: number) => n.toLocaleString("pt-BR");

  const mesLabel = getHomeKpiReferenciaMes().label;

  return (
    <section style={box} aria-labelledby="home-investidor-kpis-title">
      <h2 id="home-investidor-kpis-title" style={homeSectionTitleStyle(t.sectionTitle)}>
        Principais KPIs
      </h2>
      <HomeSectionMesSubtitle label={mesLabel} />

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro || !data ? (
        <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
          Não foi possível carregar os indicadores. Se o problema persistir, contate o suporte.
        </p>
      ) : (
        <>
          <div className="app-grid-kpi-3" style={{ gap: 12 }}>
            <HomeKpiCard
              label="GGR"
              value={fmtBRL(data.totals.ggr)}
              icon={<TrendingUp size={16} aria-hidden />}
              breakdown={data.porOperadora.map((o) => ({
                label: o.nome,
                value: fmtBRL(o.ggr),
              }))}
            />
            <HomeKpiCard
              label="Turnover"
              value={fmtBRL(data.totals.turnover)}
              icon={<ArrowUpDown size={16} aria-hidden />}
              accentVar="--brand-secondary"
              breakdown={data.porOperadora.map((o) => ({
                label: o.nome,
                value: fmtBRL(o.turnover),
              }))}
            />
            <HomeKpiCard
              label="Apostas"
              value={fmtApostas(data.totals.apostas)}
              icon={<Hash size={16} aria-hidden />}
              accentVar="--brand-accent"
              breakdown={data.porOperadora.map((o) => ({
                label: o.nome,
                value: fmtApostas(o.apostas),
              }))}
            />
          </div>
          <p style={{ ...HOME_FOOTER_HINT, color: t.textMuted }}>
            Quer saber mais? Acessa o Dashboard de{" "}
            <button type="button" onClick={() => setActivePage("mesas_spin")} style={HOME_LINK_BUTTON}>
              Overview Spin
            </button>
          </p>
        </>
      )}
    </section>
  );
}
