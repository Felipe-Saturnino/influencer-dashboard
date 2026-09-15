import type { ReactNode } from "react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import type { PageKey } from "../../../../types";
import { HomeKpiCard } from "./HomeKpiCard";
import { HomeSectionMesSubtitle } from "./HomeSectionMesSubtitle";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_FOOTER_HINT, HOME_LINK_BUTTON } from "./homeSharedUi";

export type HomeEstudioKpiSlot = {
  label: string;
  value: string;
  icon: ReactNode;
  accentVar?: string;
  subValue?: { label: string; value: string } | null;
  comparativoMensal?: {
    anteriorFmt: string;
    pctLabel: string;
    up: boolean;
  } | null;
};

export type HomeEstudioKpiFooterLink = { key: PageKey; label: string };

export function KpisEstudioStaffHomeShell({
  sectionIdPrefix,
  mesSubtitle,
  slots,
  footerLinks,
  loading,
  erro,
  rowClassName = "app-grid-kpi-4",
  secondRow,
}: {
  sectionIdPrefix: string;
  mesSubtitle: string;
  slots: HomeEstudioKpiSlot[];
  footerLinks: HomeEstudioKpiFooterLink[];
  loading: boolean;
  erro: boolean;
  rowClassName?: string;
  secondRow?: HomeEstudioKpiSlot[];
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { propsFor } = useAppPageNav();
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-kpis-title`;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Principais KPIs
      </h2>
      <HomeSectionMesSubtitle label={mesSubtitle} />

      {loading ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>Carregando…</p>
      ) : erro ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar os indicadores. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : (
        <>
          <div className={rowClassName} style={{ gap: 12 }}>
            {slots.map((slot) => (
              <HomeKpiCard
                key={slot.label}
                label={slot.label}
                value={slot.value}
                icon={slot.icon}
                accentVar={slot.accentVar}
                subValue={slot.subValue}
                comparativoMensal={slot.comparativoMensal}
              />
            ))}
          </div>
          {secondRow && secondRow.length > 0 ? (
            <div className="app-grid-kpi-3" style={{ gap: 12, marginTop: 12 }}>
              {secondRow.map((slot) => (
                <HomeKpiCard
                  key={slot.label}
                  label={slot.label}
                  value={slot.value}
                  icon={slot.icon}
                  accentVar={slot.accentVar}
                  subValue={slot.subValue}
                  comparativoMensal={slot.comparativoMensal}
                />
              ))}
            </div>
          ) : null}
          {footerLinks.length > 0 ? (
            <p style={{ ...HOME_FOOTER_HINT, color: t.textMuted }}>
              Quer saber mais?{" "}
              {footerLinks.map((link, i) => (
                <span key={link.key}>
                  {i > 0 ? " · " : null}
                  <a {...propsFor(link.key)} style={HOME_LINK_BUTTON}>
                    {link.label}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
