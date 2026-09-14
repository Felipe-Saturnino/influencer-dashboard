import { PlatLogo } from "../../../../components/PlatLogo";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { fmtDataHoraLiveHome } from "../hooks/useHomeInfluencerData";
import type { HomeAgenciaLiveFutura } from "../hooks/useHomeAgenciaData";
import {
  homeSectionTitleStyle,
  HOME_BODY_MUTED,
  HOME_FOOTER_HINT,
  HOME_LINK_BUTTON,
} from "../shared/homeSharedUi";

export function ProximasLivesAgencia({
  lives,
  sectionIdPrefix = "home-agencia",
}: {
  lives: HomeAgenciaLiveFutura[];
  sectionIdPrefix?: string;
}) {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const { propsFor } = useAppPageNav();
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-proximas-lives-title`;

  if (lives.length === 0) return null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Próximas lives
      </h2>
      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginBottom: 14 }}>
        Lives agendadas dos influencers do seu escopo.
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {lives.map((live) => (
          <li
            key={live.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: t.text,
                  fontFamily: FONT.body,
                  lineHeight: 1.35,
                }}
              >
                {live.influencer_name}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                {fmtDataHoraLiveHome(live.data, live.horario)}
                {live.titulo ? ` · ${live.titulo}` : ""}
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 999,
                background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)",
                color: "var(--brand-primary, #7c3aed)",
                fontFamily: FONT.body,
              }}
            >
              <PlatLogo plataforma={live.plataforma} size={14} isDark={isDark ?? false} />
              {live.plataforma}
            </span>
          </li>
        ))}
      </ul>
      <p style={{ ...HOME_FOOTER_HINT, color: t.textMuted }}>
        <a {...propsFor("agenda")} style={HOME_LINK_BUTTON}>
          Ver Agenda
        </a>
        {" · filtrada pelo escopo da agência."}
      </p>
    </section>
  );
}
