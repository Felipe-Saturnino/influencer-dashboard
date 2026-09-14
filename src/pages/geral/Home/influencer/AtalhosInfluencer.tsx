import {
  BookOpen,
  Calendar,
  HelpCircle,
  MessageCircle,
  Mic,
  Share2,
  Star,
  Trophy,
  Wallet,
} from "lucide-react";
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

/** Ordem curada — só entra se permissão Ver = sim | proprios. Sem páginas de gestão/afiliados. */
const ATALHOS_INFLUENCER: { key: PageKey; icon: LucideIcon }[] = [
  { key: "dash_overview_influencer", icon: Mic },
  { key: "agenda", icon: Calendar },
  { key: "resultados", icon: Trophy },
  { key: "feedback", icon: MessageCircle },
  { key: "influencers", icon: Star },
  { key: "playbook_influencers", icon: BookOpen },
  { key: "links_materiais", icon: Share2 },
  { key: "financeiro", icon: Wallet },
  { key: "ajuda", icon: HelpCircle },
];

export function AtalhosInfluencer({ sectionIdPrefix = "home-influencer" }: { sectionIdPrefix?: string }) {
  const { theme: t, permissions } = useApp();
  const { propsFor } = useAppPageNav();
  const brand = useDashboardBrand();
  const box = getPageContentBoxStyle(brand, t);
  const accentColor = "var(--brand-primary, #7c3aed)";
  const iconBg = "rgba(74, 32, 130, 0.2)";
  const titleId = `${sectionIdPrefix}-atalhos-title`;

  const visiveis = ATALHOS_INFLUENCER.filter((a) => {
    const p = permissions[a.key];
    return p === "sim" || p === "proprios";
  });

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
        <div className="app-grid-atalhos-investidor">
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
