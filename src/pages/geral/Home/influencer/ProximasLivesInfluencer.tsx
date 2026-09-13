import type { Live } from "../../../../types";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { PlatLogo } from "../../../../components/PlatLogo";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { fmtDataHoraLiveHome } from "../hooks/useHomeInfluencerData";
import { homeSectionTitleStyle } from "../shared/homeSharedUi";

export function ProximasLivesInfluencer({
  lives,
  sectionIdPrefix = "home-influencer",
}: {
  lives: Live[];
  sectionIdPrefix?: string;
}) {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-proximas-lives-title`;

  if (lives.length === 0) return null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Próximas lives
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
          gap: 12,
        }}
      >
        {lives.map((live) => (
          <article
            key={live.id}
            style={{
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              padding: "14px 16px",
              background: t.inputBg ?? t.cardBg,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: t.text,
                marginBottom: 10,
                lineHeight: 1.4,
                fontFamily: FONT.body,
              }}
            >
              {fmtDataHoraLiveHome(live.data, live.horario)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PlatLogo plataforma={live.plataforma} size={22} isDark={isDark ?? false} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                {live.plataforma}
              </span>
            </div>
            {live.titulo ? (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 12,
                  color: t.textMuted,
                  lineHeight: 1.45,
                  fontFamily: FONT.body,
                }}
              >
                {live.titulo}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
