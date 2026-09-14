import {
  ArrowDownToLine,
  BarChart2,
  Coins,
  Loader2,
  TrendingUp,
  Trophy,
  UserPlus,
  Video,
} from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { fmtBRL, fmtHorasTotal } from "../../../../lib/dashboardHelpers";
import { fmtVariacaoPctVsAnterior } from "../../../../lib/homeKpisMesasComparativo";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useHomeCanalKpisEscopo } from "../hooks/useHomeCanalKpisProprios";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { HomeSectionMesSubtitle } from "../shared/HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_FOOTER_HINT, HOME_LINK_BUTTON, HOME_BODY_MUTED } from "../shared/homeSharedUi";

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
const fmtRoi = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export function KpisAgenciaHome({
  influencerIds,
  sectionIdPrefix = "home-agencia",
}: {
  influencerIds: string[];
  sectionIdPrefix?: string;
}) {
  const { theme: t } = useApp();
  const { propsFor } = useAppPageNav();
  const brand = useDashboardBrand();
  const semEscopo = influencerIds.length === 0;
  const { loading, erro, atual, anterior, mesLabel, zero } = useHomeCanalKpisEscopo(
    semEscopo ? undefined : influencerIds,
    { comInvestimento: true },
  );
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-kpis-title`;

  const kpiAtual = semEscopo ? zero : atual;
  const kpiAnterior = semEscopo ? zero : anterior;
  const escopoSub =
    mesLabel && influencerIds.length > 0
      ? `${mesLabel} · ${influencerIds.length.toLocaleString("pt-BR")} influencer${influencerIds.length === 1 ? "" : "s"} no escopo`
      : mesLabel;

  const subRegistros =
    kpiAtual && (kpiAtual.acessos > 0 || kpiAtual.registros > 0)
      ? {
          value: `${fmtNum(kpiAtual.acessos)} (${
            kpiAtual.acessos > 0 ? ((kpiAtual.registros / kpiAtual.acessos) * 100).toFixed(1) + "%" : "—"
          })`,
          label: "acessos (conv.)",
        }
      : null;

  const subLives =
    kpiAtual && (kpiAtual.horas > 0 || kpiAtual.views > 0)
      ? {
          value: fmtHorasTotal(kpiAtual.horas),
          label: `horas · ${kpiAtual.views > 0 ? fmtNum(kpiAtual.views) : "—"} views méd.`,
        }
      : null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Principais KPIs
      </h2>
      {escopoSub ? <HomeSectionMesSubtitle label={escopoSub} /> : null}

      {semEscopo ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Nenhum influencer no seu escopo. Entre em contato com o suporte para configurar o acesso.
        </p>
      ) : loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro || !kpiAtual || !kpiAnterior ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar os indicadores. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : (
        <>
          <div className="app-grid-kpi-3" style={{ gap: 12, marginBottom: 12 }}>
            <HomeKpiCard
              label="GGR"
              value={fmtBRL(kpiAtual.ggr)}
              icon={<TrendingUp size={16} aria-hidden />}
              comparativoMensal={comparativoCard(kpiAtual.ggr, kpiAnterior.ggr, fmtBRL)}
            />
            <HomeKpiCard
              label="Investimento"
              value={fmtBRL(kpiAtual.investimento)}
              icon={<Coins size={16} aria-hidden />}
              accentVar="--brand-secondary"
              comparativoMensal={comparativoCard(kpiAtual.investimento, kpiAnterior.investimento, fmtBRL)}
            />
            <HomeKpiCard
              label="ROI"
              value={kpiAtual.investimento > 0 ? fmtRoi(kpiAtual.roi) : "—"}
              icon={<BarChart2 size={16} aria-hidden />}
              comparativoMensal={
                kpiAtual.investimento > 0 || kpiAnterior.investimento > 0
                  ? comparativoCard(kpiAtual.roi, kpiAnterior.roi, fmtRoi)
                  : null
              }
            />
          </div>
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            <HomeKpiCard
              label="Registros"
              value={fmtNum(kpiAtual.registros)}
              icon={<UserPlus size={16} aria-hidden />}
              subValue={subRegistros}
              comparativoMensal={comparativoCard(kpiAtual.registros, kpiAnterior.registros, fmtNum)}
            />
            <HomeKpiCard
              label="FTDs"
              value={fmtNum(kpiAtual.ftds)}
              icon={<Trophy size={16} aria-hidden />}
              subValue={{ value: fmtBRL(kpiAtual.ftd_total), label: "valor" }}
              comparativoMensal={comparativoCard(kpiAtual.ftds, kpiAnterior.ftds, fmtNum)}
            />
            <HomeKpiCard
              label="Depósitos"
              value={fmtNum(kpiAtual.depositos_qtd)}
              icon={<ArrowDownToLine size={16} aria-hidden />}
              accentVar="--brand-secondary"
              subValue={{ value: fmtBRL(kpiAtual.depositos_valor), label: "valor" }}
              comparativoMensal={comparativoCard(kpiAtual.depositos_qtd, kpiAnterior.depositos_qtd, fmtNum)}
            />
            <HomeKpiCard
              label="Lives"
              value={fmtNum(kpiAtual.lives)}
              icon={<Video size={16} aria-hidden />}
              accentVar="--brand-accent"
              subValue={subLives}
              comparativoMensal={comparativoCard(kpiAtual.lives, kpiAnterior.lives, fmtNum)}
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
