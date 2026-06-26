import type { LucideIcon } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageMenuLabel } from "../../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../../lib/pageCanonicalCopy";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import type { PageKey } from "../../../../types";
import { HomeAtalhoCard } from "./HomeAtalhoCard";
import { homeSectionTitleStyle, HOME_BODY_MUTED } from "./homeSharedUi";

export type HomeAtalhoConfig = { key: PageKey; icon: LucideIcon };

export function AtalhosStaffHome({
  sectionIdPrefix,
  atalhos,
  gridClassName = "app-grid-atalhos-investidor",
}: {
  sectionIdPrefix: string;
  atalhos: HomeAtalhoConfig[];
  gridClassName?: string;
}) {
  const { theme: t } = useApp();
  const { propsFor } = useAppPageNav();
  const brand = useDashboardBrand();
  const box = getPageContentBoxStyle(brand, t);
  const accentColor = "var(--brand-primary, #7c3aed)";
  const iconBg = "rgba(74, 32, 130, 0.2)";
  const titleId = `${sectionIdPrefix}-atalhos-title`;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Acesso rápido
      </h2>
      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 16 }}>
        Clique em um atalho abaixo para ir diretamente à página desejada.
      </p>

      <div className={gridClassName}>
        {atalhos.map(({ key, icon: Icon }) => {
          const nav = propsFor(key);
          return (
            <HomeAtalhoCard
              key={key}
              href={nav.href}
              onClick={nav.onClick}
              icon={<Icon size={18} color={accentColor} aria-hidden />}
              title={getPageMenuLabel(key)}
              subtitle={getPageCanonicalSubtitle(key) ?? undefined}
              iconBg={iconBg}
            />
          );
        })}
      </div>
    </section>
  );
}
