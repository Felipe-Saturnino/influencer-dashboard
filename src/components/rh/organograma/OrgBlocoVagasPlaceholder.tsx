import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string };

export function OrgBlocoVagasPlaceholder({
  t,
  titulo = "Vagas",
  subtitulo,
}: {
  t: Theme;
  titulo?: string;
  subtitulo?: string;
}) {
  const card: CSSProperties = {
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 14,
    padding: 20,
    background: t.inputBg,
    fontFamily: FONT.body,
    minHeight: 120,
  };

  const showTitulo = (titulo ?? "Vagas").trim().length > 0;

  return (
    <section style={{ marginTop: 20 }} aria-label={subtitulo ? `Vagas — ${subtitulo}` : "Vagas"}>
      {showTitulo ? (
        <h2
          id="org-vagas-heading"
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            fontWeight: 800,
            color: t.textMuted,
            fontFamily: FONT_TITLE,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {titulo}
        </h2>
      ) : null}
      <div style={card}>
        {subtitulo ? (
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: t.text }}>{subtitulo}</p>
        ) : null}
        <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
          Conteúdo em definição.
        </p>
      </div>
    </section>
  );
}
