import { ArrowDownToLine, Clock, Eye, Loader2, Trophy, UserPlus, Video } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { fmtBRL, fmtHorasTotal } from "../../../../lib/dashboardHelpers";
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
): { anteriorFmt: string; pctLabel: string; up: boolean } | null {
  const varPct = fmtVariacaoPctVsAnterior(atual, anterior);
  if (!varPct) return null;
  return {
    anteriorFmt: fmtValor(anterior),
    pctLabel: varPct.pctLabel,
    up: varPct.up,
  };
}

const fmtNum = (n: number) => n.toLocaleString("pt-BR");

export function KpisInfluencerHome({
  userId,
  sectionIdPrefix = "home-influencer",
}: {
  userId: string | undefined;
  sectionIdPrefix?: string;
}) {
  const { theme: t } = useApp();
  const { propsFor } = useAppPageNav();
  const brand = useDashboardBrand();
  const { loading, erro, atual, anterior, mesLabel } = useHomeCanalKpisProprios(userId, {
    comInvestimento: false,
  });
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-kpis-title`;

  const subRegistros =
    atual && (atual.acessos > 0 || atual.registros > 0)
      ? {
          value: `${fmtNum(atual.acessos)} (${
            atual.acessos > 0 ? ((atual.registros / atual.acessos) * 100).toFixed(1) + "%" : "—"
          })`,
          label: "acessos (conv.)",
        }
      : null;

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
              label="Registros"
              value={fmtNum(atual.registros)}
              icon={<UserPlus size={16} aria-hidden />}
              subValue={subRegistros}
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
              value={fmtNum(atual.depositos_qtd)}
              icon={<ArrowDownToLine size={16} aria-hidden />}
              accentVar="--brand-secondary"
              subValue={{ value: fmtBRL(atual.depositos_valor), label: "valor" }}
              comparativoMensal={comparativoCard(atual.depositos_qtd, anterior.depositos_qtd, fmtNum)}
            />
          </div>
          <div className="app-grid-kpi-3" style={{ gap: 12 }}>
            <HomeKpiCard
              label="Lives"
              value={fmtNum(atual.lives)}
              icon={<Video size={16} aria-hidden />}
              accentVar="--brand-secondary"
              comparativoMensal={comparativoCard(atual.lives, anterior.lives, fmtNum)}
            />
            <HomeKpiCard
              label="Horas Realizadas"
              value={fmtHorasTotal(atual.horas)}
              icon={<Clock size={16} aria-hidden />}
              accentVar="--brand-secondary"
              comparativoMensal={comparativoCard(atual.horas, anterior.horas, fmtHorasTotal)}
            />
            <HomeKpiCard
              label="Média de Views"
              value={atual.views > 0 ? fmtNum(atual.views) : "—"}
              icon={<Eye size={16} aria-hidden />}
              accentVar="--brand-accent"
              comparativoMensal={
                atual.views > 0 || anterior.views > 0
                  ? comparativoCard(atual.views, anterior.views, fmtNum)
                  : null
              }
            />
          </div>
          <p style={{ ...HOME_FOOTER_HINT, color: t.textMuted }}>
            Quer saber mais? Acessa o Dashboard de{" "}
            <a {...propsFor("dash_overview_influencer")} style={HOME_LINK_BUTTON}>
              Overview Influencer
            </a>
          </p>
        </>
      )}
    </section>
  );
}
