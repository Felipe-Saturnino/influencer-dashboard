import { Briefcase, ClipboardList, Scale, UserCheck, UserRound, UserX, Users } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "../shared/homeSharedUi";
import type { HomeGestorRhKpis } from "../hooks/useHomeGestorRhData";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function KpisGestorRh({
  kpis,
  erro,
  sectionIdPrefix,
}: {
  kpis: HomeGestorRhKpis | null;
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

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
        Prestadores
      </p>
      <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 16 }}>
        <HomeKpiCard label="Total" value={fmt(kpis.prestadores.total)} icon={<Users size={16} aria-hidden />} />
        <HomeKpiCard
          label="Cadastro incompleto"
          value={fmt(kpis.prestadores.cadastroIncompleto)}
          icon={<UserX size={16} aria-hidden />}
          accentVar="--brand-secondary"
        />
        <HomeKpiCard
          label="Revisão pendente"
          value={fmt(kpis.prestadores.revisaoPendente)}
          icon={<ClipboardList size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Cadastro completo"
          value={fmt(kpis.prestadores.cadastroCompleto)}
          icon={<UserCheck size={16} aria-hidden />}
        />
      </div>

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
        Filas
      </p>
      <div className="app-grid-kpi-4" style={{ gap: 12 }}>
        <HomeKpiCard
          label="Solicitações em análise"
          value={fmt(kpis.filas.solicitacoesEmAnalise)}
          icon={<ClipboardList size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Vagas abertas"
          value={fmt(kpis.filas.vagasAbertas)}
          icon={<Briefcase size={16} aria-hidden />}
          accentVar="--brand-secondary"
        />
        <HomeKpiCard
          label="Candidaturas ativas"
          value={fmt(kpis.filas.candidaturasAtivas)}
          icon={<UserRound size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Denúncias abertas"
          value={fmt(kpis.filas.denunciasAbertas)}
          icon={<Scale size={16} aria-hidden />}
        />
      </div>

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginTop: 14, fontSize: 12 }}>
        Quer saber mais? Acessa{" "}
        <a {...propsFor("rh_funcionarios")} style={HOME_LINK_BUTTON}>
          Gestão de Prestadores
        </a>
        {" · "}
        <a {...propsFor("rh_solicitacoes")} style={HOME_LINK_BUTTON}>
          Solicitações de RH
        </a>
        {" · "}
        <a {...propsFor("rh_vagas")} style={HOME_LINK_BUTTON}>
          Vagas
        </a>
        {" · "}
        <a {...propsFor("rh_portal")} style={HOME_LINK_BUTTON}>
          Portal de RH
        </a>
      </p>
    </section>
  );
}
