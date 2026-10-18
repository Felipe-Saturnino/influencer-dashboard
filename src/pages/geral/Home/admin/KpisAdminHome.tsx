import { Radar, TrendingUp, UserRound, Users } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { HomeSectionMesSubtitle } from "../shared/HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "../shared/homeSharedUi";
import type { HomeAdminKpis } from "../hooks/useHomeAdminData";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function KpisAdminHome({
  kpis,
  erro,
  sectionIdPrefix,
}: {
  kpis: HomeAdminKpis | null;
  erro: boolean;
  sectionIdPrefix: string;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { propsFor } = useAppPageNav();
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-kpis-title`;

  if (erro || !kpis) return null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Principais KPIs
      </h2>
      {kpis.mesLabel ? <HomeSectionMesSubtitle label={kpis.mesLabel} /> : null}

      <div className="app-grid-kpi-4" style={{ gap: 12 }}>
        <HomeKpiCard label="GGR do mês" value={kpis.ggrMtdFmt} icon={<TrendingUp size={16} aria-hidden />} />
        <HomeKpiCard
          label="Integrações ativas"
          value={kpis.integracoesAtivasFmt}
          icon={<Radar size={16} aria-hidden />}
          accentVar="--brand-secondary"
        />
        <HomeKpiCard label="Usuários ativos" value={fmt(kpis.usuariosAtivos)} icon={<Users size={16} aria-hidden />} />
        <HomeKpiCard label="Prestadores" value={fmt(kpis.prestadores)} icon={<UserRound size={16} aria-hidden />} />
      </div>

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginTop: 14, fontSize: 12 }}>
        Quer saber mais? Acessa{" "}
        <a {...propsFor("mesas_spin")} style={HOME_LINK_BUTTON}>
          Overview Spin
        </a>
        {" · "}
        <a {...propsFor("status_tecnico")} style={HOME_LINK_BUTTON}>
          Status Técnico
        </a>
      </p>
    </section>
  );
}
