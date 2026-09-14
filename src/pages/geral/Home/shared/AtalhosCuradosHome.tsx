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

export type HomeAtalhoCurado = { key: PageKey; icon: LucideIcon };

export function AtalhosCuradosHome({
  sectionIdPrefix,
  atalhos,
  gridClassName = "app-grid-atalhos-investidor",
  filtrarPorPermissao = true,
}: {
  sectionIdPrefix: string;
  atalhos: HomeAtalhoCurado[];
  gridClassName?: string;
  /** Se true, só mostra atalhos com Ver = sim | proprios. */
  filtrarPorPermissao?: boolean;
}) {
  const { theme: t, permissions } = useApp();
  const { propsFor } = useAppPageNav();
  const brand = useDashboardBrand();
  const box = getPageContentBoxStyle(brand, t);
  const accentColor = brand.useBrand ? "var(--brand-primary)" : "var(--brand-primary, #7c3aed)";
  const iconBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 15%, transparent)"
    : "rgba(74, 32, 130, 0.2)";
  const titleId = `${sectionIdPrefix}-atalhos-title`;

  const visiveis = filtrarPorPermissao
    ? atalhos.filter((a) => {
        const p = permissions[a.key];
        return p === "sim" || p === "proprios";
      })
    : atalhos;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Acesso rápido
      </h2>
      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 16 }}>
        Clique em um atalho abaixo para ir diretamente à página desejada.
      </p>

      {visiveis.length === 0 ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>Nenhuma página disponível no momento.</p>
      ) : (
        <div className={gridClassName}>
          {visiveis.map(({ key, icon: Icon }) => {
            const nav = propsFor(key);
            return (
              <HomeAtalhoCard
                key={key}
                href={nav.href}
                onClick={nav.onClick}
                icon={<Icon size={18} color={accentColor} aria-hidden />}
                title={getPageMenuLabel(key)}
                subtitle={getPageCanonicalSubtitle(key) || undefined}
                iconBg={iconBg}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
