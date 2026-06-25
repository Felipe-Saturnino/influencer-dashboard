import { HelpCircle, Network } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageMenuLabel } from "../../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../../lib/pageCanonicalCopy";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import type { PageKey } from "../../../../types";
import { HomeAtalhoCard } from "../shared/HomeAtalhoCard";
import { homeSectionTitleStyle, HOME_BODY_MUTED } from "../shared/homeSharedUi";

const ATALHOS_PRESTADOR: { key: PageKey; icon: LucideIcon }[] = [
  { key: "ajuda", icon: HelpCircle },
  { key: "rh_organograma", icon: Network },
];

export function AtalhosPrestador() {
  const { theme: t } = useApp();
  const { propsFor } = useAppPageNav();
  const brand = useDashboardBrand();
  const box = getPageContentBoxStyle(brand, t);
  const accentColor = "var(--brand-primary, #7c3aed)";
  const iconBg = "rgba(74, 32, 130, 0.2)";

  return (
    <section style={box} aria-labelledby="home-prestador-atalhos-title">
      <h2 id="home-prestador-atalhos-title" style={homeSectionTitleStyle(t.sectionTitle)}>
        Acesso rápido
      </h2>
      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 16 }}>
        Clique em um atalho abaixo para ir diretamente à página desejada.
      </p>

      <div className="app-grid-atalhos-operador">
        {ATALHOS_PRESTADOR.map(({ key, icon: Icon }) => {
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
