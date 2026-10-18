import {
  ArrowDownToLine,
  Bookmark,
  Mic,
  Percent,
  Sparkles,
  TrendingUp,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { HomeSectionMesSubtitle } from "../shared/HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "../shared/homeSharedUi";
import type { HomeGestorMarketingKpis } from "../hooks/useHomeGestorMarketingData";

export function KpisGestorMarketing({
  kpis,
  sectionIdPrefix,
}: {
  kpis: HomeGestorMarketingKpis | null;
  sectionIdPrefix: string;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { propsFor } = useAppPageNav();
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-kpis-title`;

  if (!kpis || kpis.erroKpis) {
    return (
      <section style={box} aria-labelledby={titleId}>
        <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
          Principais KPIs
        </h2>
        {kpis?.mesLabel ? <HomeSectionMesSubtitle label={kpis.mesLabel} /> : null}
        <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 16 }}>
          <HomeKpiCard label="GGR" value={kpis?.resultado.ggrFmt ?? "—"} icon={<TrendingUp size={16} aria-hidden />} />
          <HomeKpiCard
            label="Registros"
            value={kpis?.resultado.registrosFmt ?? "—"}
            icon={<UserPlus size={16} aria-hidden />}
          />
          <HomeKpiCard
            label="FTDs"
            value={kpis?.resultado.ftdsFmt ?? "—"}
            icon={<Trophy size={16} aria-hidden />}
          />
          <HomeKpiCard
            label="Depósitos"
            value={kpis?.resultado.depositosFmt ?? "—"}
            icon={<ArrowDownToLine size={16} aria-hidden />}
          />
        </div>
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar todos os indicadores de mídias. Se o problema persistir, entre em contato com o
          suporte.
        </p>
      </section>
    );
  }

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Principais KPIs
      </h2>
      <HomeSectionMesSubtitle label={kpis.mesLabel} />
      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
        Resultado
      </p>
      <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 16 }}>
        <HomeKpiCard label="GGR" value={kpis.resultado.ggrFmt} icon={<TrendingUp size={16} aria-hidden />} />
        <HomeKpiCard
          label="Registros"
          value={kpis.resultado.registrosFmt}
          icon={<UserPlus size={16} aria-hidden />}
        />
        <HomeKpiCard label="FTDs" value={kpis.resultado.ftdsFmt} icon={<Trophy size={16} aria-hidden />} />
        <HomeKpiCard
          label="Depósitos"
          value={kpis.resultado.depositosFmt}
          icon={<ArrowDownToLine size={16} aria-hidden />}
        />
      </div>
      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
        Ações
      </p>
      <div className="app-grid-kpi-4" style={{ gap: 12 }}>
        <HomeKpiCard
          label="Postagens"
          value={kpis.acoes.postagensFmt}
          icon={<Bookmark size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Novos Seguidores"
          value={kpis.acoes.novosSeguidoresFmt}
          icon={<Mic size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Impressões Totais"
          value={kpis.acoes.impressoesFmt}
          icon={<Sparkles size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Engajamento Médio"
          value={kpis.acoes.engajamentoFmt}
          icon={<Percent size={16} aria-hidden />}
        />
      </div>
      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginTop: 14, fontSize: 12 }}>
        Quer saber mais? Acesse o{" "}
        <a {...propsFor("dash_midias_sociais")} style={HOME_LINK_BUTTON}>
          Mídias Sociais
        </a>
      </p>
    </section>
  );
}
