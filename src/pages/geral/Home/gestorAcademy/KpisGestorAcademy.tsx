import { BookOpen, CheckCircle2, ClipboardList, GraduationCap, MessageSquare } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { HomeSectionMesSubtitle } from "../shared/HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "../shared/homeSharedUi";
import type { HomeGestorAcademyKpis } from "../hooks/useHomeGestorAcademyData";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function KpisGestorAcademy({
  kpis,
  erro,
  sectionIdPrefix,
}: {
  kpis: HomeGestorAcademyKpis | null;
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

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Principais KPIs
      </h2>
      <HomeSectionMesSubtitle label={kpis.mesLabel} />

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
        Avaliações
      </p>
      <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 16 }}>
        <HomeKpiCard label="Aguardando" value={fmt(kpis.avaliacoes.aguardando)} icon={<ClipboardList size={16} aria-hidden />} />
        <HomeKpiCard label="Feedback" value={fmt(kpis.avaliacoes.feedback)} icon={<MessageSquare size={16} aria-hidden />} accentVar="--brand-secondary" />
        <HomeKpiCard label="Aprovadas (mês)" value={fmt(kpis.avaliacoes.aprovadasMes)} icon={<CheckCircle2 size={16} aria-hidden />} />
        <HomeKpiCard label="Publicadas (mês)" value={fmt(kpis.avaliacoes.publicadasMes)} icon={<GraduationCap size={16} aria-hidden />} />
      </div>

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
        Portal
      </p>
      <div className="app-grid-kpi-4" style={{ gap: 12 }}>
        <HomeKpiCard label="Em aprovação" value={fmt(kpis.portal.emAprovacao)} icon={<ClipboardList size={16} aria-hidden />} />
        <HomeKpiCard label="Publicadas (mês)" value={fmt(kpis.portal.publicadasMes)} icon={<BookOpen size={16} aria-hidden />} accentVar="--brand-secondary" />
        <HomeKpiCard label="Manuais publicados" value={fmt(kpis.portal.manuaisPublicados)} icon={<BookOpen size={16} aria-hidden />} />
        <HomeKpiCard label="Ciências pendentes" value={fmt(kpis.portal.cienciasPendentes)} icon={<CheckCircle2 size={16} aria-hidden />} />
      </div>

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginTop: 14, fontSize: 12 }}>
        Quer saber mais? Acesse o{" "}
        <a {...propsFor("academy_performance_hub")} style={HOME_LINK_BUTTON}>
          Performance Hub
        </a>
        {" · "}
        <a {...propsFor("academy_portal")} style={HOME_LINK_BUTTON}>
          Portal da Academy
        </a>
      </p>
    </section>
  );
}
