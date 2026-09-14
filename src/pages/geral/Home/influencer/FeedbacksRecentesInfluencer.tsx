import type { Live, LiveResultado } from "../../../../types";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { PlatLogo } from "../../../../components/PlatLogo";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { fmtDataHoraLiveHome, fmtDuracaoLiveHome } from "../hooks/useHomeInfluencerData";
import { homeSectionTitleStyle } from "../shared/homeSharedUi";

export function FeedbacksRecentesInfluencer({
  lives,
  resultadosPorLive,
  sectionIdPrefix = "home-influencer",
}: {
  lives: Live[];
  resultadosPorLive: Record<string, LiveResultado>;
  sectionIdPrefix?: string;
}) {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-feedbacks-title`;

  if (lives.length === 0) return null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Feedbacks recentes
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
          gap: 12,
        }}
      >
        {lives.map((live) => {
          const res = resultadosPorLive[live.id];
          const obs = live.observacao?.trim();
          return (
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <PlatLogo plataforma={live.plataforma} size={22} isDark={isDark ?? false} />
                <span style={{ fontSize: 13, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                  {live.plataforma}
                </span>
              </div>
              {obs ? (
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 12,
                    color: t.textMuted,
                    lineHeight: 1.5,
                    fontFamily: FONT.body,
                  }}
                >
                  <span style={{ fontWeight: 700, color: t.text }}>Obs.: </span>
                  {obs}
                </p>
              ) : null}
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 12,
                  color: t.textMuted,
                  borderTop: `1px solid ${t.cardBorder}`,
                  paddingTop: 10,
                  fontFamily: FONT.body,
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: t.sectionTitle }}>Duração: </span>
                  {fmtDuracaoLiveHome(res)}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: t.sectionTitle }}>Média de views: </span>
                  {res?.media_views != null ? res.media_views.toLocaleString("pt-BR") : "—"}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: t.sectionTitle }}>Pico de views: </span>
                  {res?.max_views != null ? res.max_views.toLocaleString("pt-BR") : "—"}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
