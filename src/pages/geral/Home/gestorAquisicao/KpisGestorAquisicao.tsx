import { Banknote, Clock, Coins, Spade, Trophy, TrendingUp, Video } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { HomeSectionMesSubtitle } from "../shared/HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "../shared/homeSharedUi";
import type { HomeGestorAquisicaoKpis } from "../hooks/useHomeGestorAquisicaoData";

export function KpisGestorAquisicao({
  kpis,
  erro,
  sectionIdPrefix,
}: {
  kpis: HomeGestorAquisicaoKpis | null;
  erro: boolean;
  sectionIdPrefix: string;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { propsFor } = useAppPageNav();
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-kpis-title`;

  if (erro || !kpis) {
    return (
      <section style={box} aria-labelledby={titleId}>
        <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
          Principais KPIs
        </h2>
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar os indicadores. Se o problema persistir, entre em contato com o suporte.
        </p>
      </section>
    );
  }

  const mom = kpis.mom;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Principais KPIs
      </h2>
      <HomeSectionMesSubtitle label={kpis.mesLabel} />

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
        Financeiro
      </p>
      <div className="app-grid-kpi-3" style={{ gap: 12, marginBottom: 16 }}>
        <HomeKpiCard
          label="Pago"
          value={kpis.financeiro.pagoFmt}
          icon={<Banknote size={16} aria-hidden />}
          comparativoMensal={
            mom
              ? { anteriorFmt: mom.pagoAntFmt, pctLabel: mom.pagoPct, up: mom.pagoUp }
              : null
          }
        />
        <HomeKpiCard
          label="Pendente"
          value={kpis.financeiro.pendenteFmt}
          icon={<Coins size={16} aria-hidden />}
          accentVar="--brand-secondary"
          comparativoMensal={
            mom
              ? { anteriorFmt: mom.pendenteAntFmt, pctLabel: mom.pendentePct, up: mom.pendenteUp }
              : null
          }
        />
        <HomeKpiCard
          label="Horas"
          value={kpis.financeiro.horasFmt}
          icon={<Clock size={16} aria-hidden />}
          comparativoMensal={
            mom
              ? { anteriorFmt: mom.horasAntFmt, pctLabel: mom.horasPct, up: mom.horasUp }
              : null
          }
        />
      </div>

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
        Canal
      </p>
      <div className="app-grid-kpi-4" style={{ gap: 12 }}>
        <HomeKpiCard label="Lives" value={String(kpis.canal.lives)} icon={<Video size={16} aria-hidden />} />
        <HomeKpiCard
          label="GGR"
          value={kpis.canal.ggrFmt}
          icon={<TrendingUp size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="FTDs"
          value={kpis.canal.ftds.toLocaleString("pt-BR")}
          icon={<Trophy size={16} aria-hidden />}
          accentVar="--brand-secondary"
        />
        <HomeKpiCard
          label="Bancas abertas"
          value={String(kpis.canal.bancasAbertas)}
          icon={<Spade size={16} aria-hidden />}
        />
      </div>

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginTop: 14, fontSize: 12 }}>
        Quer saber mais?{" "}
        <a {...propsFor("financeiro")} style={HOME_LINK_BUTTON}>
          Financeiro
        </a>
        {" · "}
        <a {...propsFor("streamers")} style={HOME_LINK_BUTTON}>
          Streamers
        </a>
        {" · "}
        <a {...propsFor("dash_overview_influencer")} style={HOME_LINK_BUTTON}>
          Overview Influencer
        </a>
      </p>
    </section>
  );
}
