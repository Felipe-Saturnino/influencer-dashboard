import { ArrowUpDown, Hash, Loader2, TrendingUp } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { fmtBRL } from "../../../../lib/dashboardHelpers";
import { fmtVariacaoPctVsAnterior } from "../../../../lib/homeKpisMesasComparativo";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { getHomeKpiReferenciaMes } from "../../../../lib/homeInvestidorMtd";
import { useHomeKpisMesasOperadora } from "../hooks/useHomeKpisMesasOperadora";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { HomeSectionMesSubtitle } from "../shared/HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_FOOTER_HINT, HOME_LINK_BUTTON } from "../shared/homeSharedUi";

function comparativoCard(
  atual: number,
  anterior: number,
  fmtValor: (n: number) => string,
): { anteriorFmt: string; pctLabel: string; up: boolean } | null {
  const varPct = fmtVariacaoPctVsAnterior(atual, anterior);
  if (!varPct) return null;
  return {
    anteriorFmt: fmtValor(anterior),
    pctLabel: varPct.pctLabel,
    up: varPct.up,
  };
}

export function KpisMesasOperador() {
  const { theme: t } = useApp();
  const { propsFor } = useAppPageNav();
  const brand = useDashboardBrand();
  const { loading, erro, data, semOperadora } = useHomeKpisMesasOperadora();
  const box = getPageContentBoxStyle(brand, t);

  const fmtApostas = (n: number) => n.toLocaleString("pt-BR");

  const mesLabel = getHomeKpiReferenciaMes().label;

  return (
    <section style={box} aria-labelledby="home-operador-kpis-title">
      <h2 id="home-operador-kpis-title" style={homeSectionTitleStyle(t.sectionTitle)}>
        Principais KPIs
      </h2>
      <HomeSectionMesSubtitle label={mesLabel} />

      {semOperadora ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Nenhuma operadora vinculada ao seu perfil. Contate o administrador para configurar o escopo.
        </p>
      ) : loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro || !data ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar os indicadores. Se o problema persistir, contate o suporte.
        </p>
      ) : (
        <>
          <div className="app-grid-kpi-3" style={{ gap: 12 }}>
            <HomeKpiCard
              label="GGR do mês"
              value={fmtBRL(data.atual.ggr)}
              icon={<TrendingUp size={16} aria-hidden />}
              comparativoMensal={comparativoCard(data.atual.ggr, data.anterior.ggr, fmtBRL)}
            />
            <HomeKpiCard
              label="Turnover do mês"
              value={fmtBRL(data.atual.turnover)}
              icon={<ArrowUpDown size={16} aria-hidden />}
              accentVar="--brand-secondary"
              comparativoMensal={comparativoCard(data.atual.turnover, data.anterior.turnover, fmtBRL)}
            />
            <HomeKpiCard
              label="Apostas do mês"
              value={fmtApostas(data.atual.apostas)}
              icon={<Hash size={16} aria-hidden />}
              accentVar="--brand-accent"
              comparativoMensal={comparativoCard(data.atual.apostas, data.anterior.apostas, fmtApostas)}
            />
          </div>
          <p style={{ ...HOME_FOOTER_HINT, color: t.textMuted }}>
            Quer saber mais? Acessa o Dashboard de{" "}
            <a {...propsFor("mesas_spin")} style={HOME_LINK_BUTTON}>
              Overview Spin
            </a>
          </p>
        </>
      )}
    </section>
  );
}
