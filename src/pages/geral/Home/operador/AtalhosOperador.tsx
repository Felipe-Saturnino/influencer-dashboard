import { ArrowRight, Dices, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { getPageMenuLabel } from "../../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../../lib/pageCanonicalCopy";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import type { PageKey } from "../../../../types";
import { homeSectionTitleStyle, HOME_BODY_MUTED } from "../shared/homeSharedUi";

const ATALHOS_OPERADOR: { key: PageKey; icon: LucideIcon }[] = [
  { key: "mesas_spin", icon: Dices },
  { key: "ajuda", icon: HelpCircle },
];

export function AtalhosOperador() {
  const { theme: t, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const box = getPageContentBoxStyle(brand, t);
  const accentColor = brand.useBrand ? "var(--brand-primary)" : "var(--brand-primary, #7c3aed)";

  return (
    <section style={box} aria-labelledby="home-operador-atalhos-title">
      <h2 id="home-operador-atalhos-title" style={homeSectionTitleStyle(t.sectionTitle)}>
        Acesso rápido
      </h2>
      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 16 }}>
        Clique em um atalho abaixo para ir diretamente à página desejada.
      </p>

      <div className="app-grid-atalhos-operador">
        {ATALHOS_OPERADOR.map(({ key, icon: Icon }) => {
          const subtitle = getPageCanonicalSubtitle(key) ?? "";
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActivePage(key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
                padding: "16px 18px",
                borderRadius: 12,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: brand.useBrand
                      ? "color-mix(in srgb, var(--brand-primary) 15%, transparent)"
                      : "rgba(74, 32, 130, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} color={accentColor} aria-hidden />
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, minWidth: 0 }}>{getPageMenuLabel(key)}</span>
                <ArrowRight size={14} color={t.textMuted} aria-hidden style={{ flexShrink: 0 }} />
              </div>
              {subtitle ? (
                <p style={{ margin: 0, fontSize: 12, color: t.textMuted, lineHeight: 1.5, paddingLeft: 48 }}>
                  {subtitle}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
