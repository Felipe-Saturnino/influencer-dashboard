import { Boxes, CheckCircle2, ClipboardList, FolderOpen, Package, Wrench } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { HomeKpiCard } from "../shared/HomeKpiCard";
import { HomeSectionMesSubtitle } from "../shared/HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "../shared/homeSharedUi";
import type { HomeGestorTechOpsKpis } from "../hooks/useHomeGestorTechOpsData";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function KpisGestorTechOps({
  kpis,
  erro,
  sectionIdPrefix,
}: {
  kpis: HomeGestorTechOpsKpis | null;
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
        Pendências
      </p>
      <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 16 }}>
        <HomeKpiCard
          label="Solicitadas"
          value={fmt(kpis.pendencias.solicitadas)}
          icon={<ClipboardList size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Abertas"
          value={fmt(kpis.pendencias.abertas)}
          icon={<FolderOpen size={16} aria-hidden />}
          accentVar="--brand-secondary"
        />
        <HomeKpiCard
          label="Concluídas (mês)"
          value={fmt(kpis.pendencias.concluidasMes)}
          icon={<CheckCircle2 size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Total (mês)"
          value={fmt(kpis.pendencias.totalMes)}
          icon={<Boxes size={16} aria-hidden />}
        />
      </div>

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
        Estoque
      </p>
      <div className="app-grid-kpi-4" style={{ gap: 12 }}>
        <HomeKpiCard
          label="Itens em uso"
          value={fmt(kpis.estoque.itensEmUso)}
          icon={<Package size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Eq. em manutenção"
          value={fmt(kpis.estoque.eqManutencao)}
          icon={<Wrench size={16} aria-hidden />}
          accentVar="--brand-secondary"
        />
        <HomeKpiCard
          label="Eq. em estoque"
          value={fmt(kpis.estoque.eqEstoque)}
          icon={<Boxes size={16} aria-hidden />}
        />
        <HomeKpiCard
          label="Itens Totais"
          value={fmt(kpis.estoque.itensTotais)}
          icon={<Package size={16} aria-hidden />}
        />
      </div>

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginTop: 14, fontSize: 12 }}>
        Quer saber mais? Acesse{" "}
        <a {...propsFor("tech_ops_ordem_saida")} style={HOME_LINK_BUTTON}>
          Ordem de Saída
        </a>
        {" · "}
        <a {...propsFor("tech_ops_estoque")} style={HOME_LINK_BUTTON}>
          Gestão de Estoque
        </a>
        {" · "}
        <a {...propsFor("tech_ops_itens_alocados")} style={HOME_LINK_BUTTON}>
          Itens Alocados
        </a>
      </p>
    </section>
  );
}
