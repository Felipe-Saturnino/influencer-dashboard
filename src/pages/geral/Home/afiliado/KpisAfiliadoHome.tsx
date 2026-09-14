import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart2,
  Coins,
  Loader2,
  TrendingUp,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { fmtBRL } from "../../../../lib/dashboardHelpers";
import { fmtVariacaoPctVsAnterior } from "../../../../lib/homeKpisMesasComparativo";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useHomeCanalKpisProprios } from "../hooks/useHomeCanalKpisProprios";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { HomeSectionMesSubtitle } from "../shared/HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_FOOTER_HINT, HOME_LINK_BUTTON } from "../shared/homeSharedUi";

function comparativoCard(
  atual: number,
  anterior: number,
  fmtValor: (n: number) => string,
  opts?: { inverso?: boolean },
): { anteriorFmt: string; pctLabel: string; up: boolean } | null {
  const varPct = fmtVariacaoPctVsAnterior(atual, anterior);
  if (!varPct) return null;
  const up = opts?.inverso ? !varPct.up : varPct.up;
  return {
    anteriorFmt: fmtValor(anterior),
    pctLabel: varPct.pctLabel,
    up,
  };
}

const fmtNum = (n: number) => n.toLocaleString("pt-BR");
const fmtRoi = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export function KpisAfiliadoHome({
  userId,
  sectionIdPrefix = "home-afiliado",
}: {
  userId: string | undefined;
  sectionIdPrefix?: string;
}) {
  const { theme: t } = useApp();
  const { propsFor } = useAppPageNav();
  const brand = useDashboardBrand();
  const { loading, erro, atual, anterior, mesLabel } = useHomeCanalKpisProprios(userId, {
    comInvestimento: true,
  });
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-kpis-title`;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Principais KPIs
      </h2>
      {mesLabel ? <HomeSectionMesSubtitle label={mesLabel} /> : null}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro || !atual || !anterior ? (
        <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
          Não foi possível carregar os indicadores. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : (
        <>
          <div className="app-grid-kpi-3" style={{ gap: 12, marginBottom: 12 }}>
            <HomeKpiCard
              label="GGR"
              value={fmtBRL(atual.ggr)}
              icon={<TrendingUp size={16} aria-hidden />}
              comparativoMensal={comparativoCard(atual.ggr, anterior.ggr, fmtBRL)}
            />
            <HomeKpiCard
              label="Investimento"
              value={fmtBRL(atual.investimento)}
              icon={<Coins size={16} aria-hidden />}
              accentVar="--brand-secondary"
              comparativoMensal={comparativoCard(atual.investimento, anterior.investimento, fmtBRL)}
            />
            <HomeKpiCard
              label="ROI"
              value={atual.investimento > 0 ? fmtRoi(atual.roi) : "—"}
              icon={<BarChart2 size={16} aria-hidden />}
              comparativoMensal={
                atual.investimento > 0 || anterior.investimento > 0
                  ? comparativoCard(atual.roi, anterior.roi, fmtRoi)
                  : null
              }
            />
          </div>
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            <HomeKpiCard
              label="Registros"
              value={fmtNum(atual.registros)}
              icon={<UserPlus size={16} aria-hidden />}
              comparativoMensal={comparativoCard(atual.registros, anterior.registros, fmtNum)}
            />
            <HomeKpiCard
              label="FTDs"
              value={fmtNum(atual.ftds)}
              icon={<Trophy size={16} aria-hidden />}
              subValue={{ value: fmtBRL(atual.ftd_total), label: "valor" }}
              comparativoMensal={comparativoCard(atual.ftds, anterior.ftds, fmtNum)}
            />
            <HomeKpiCard
              label="Depósitos"
              value={fmtBRL(atual.depositos_valor)}
              icon={<ArrowDownToLine size={16} aria-hidden />}
              accentVar="--brand-accent"
              comparativoMensal={comparativoCard(atual.depositos_valor, anterior.depositos_valor, fmtBRL)}
            />
            <HomeKpiCard
              label="Saques"
              value={fmtBRL(atual.saques_valor)}
              icon={<ArrowUpFromLine size={16} aria-hidden />}
              comparativoMensal={comparativoCard(atual.saques_valor, anterior.saques_valor, fmtBRL, {
                inverso: true,
              })}
            />
          </div>
          <p style={{ ...HOME_FOOTER_HINT, color: t.textMuted }}>
            Quer saber mais? Acessa o Dashboard de{" "}
            <a {...propsFor("dash_overview_afiliado")} style={HOME_LINK_BUTTON}>
              Overview Afiliado
            </a>
          </p>
        </>
      )}
    </section>
  );
}
