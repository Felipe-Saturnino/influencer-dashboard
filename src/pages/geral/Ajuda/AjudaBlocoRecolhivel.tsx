import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { FONT, FONT_TITLE, type Theme } from "../../../constants/theme";

/** Bloco recolhível da Ajuda (Conheça / Troubleshooting) — visual alinhado ao Glossário. */
export function AjudaBlocoRecolhivel({
  titulo,
  children,
  t,
  accentColor,
  defaultAberto = false,
}: {
  titulo: string;
  children: ReactNode;
  t: Theme;
  accentColor: string;
  defaultAberto?: boolean;
}) {
  const [aberta, setAberta] = useState(defaultAberto);

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderBottom: aberta ? `1px solid ${t.cardBorder}` : "none",
        }}
      >
        <div
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 12,
            fontWeight: 700,
            color: t.text,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            flex: 1,
            textAlign: "left",
          }}
        >
          {titulo}
        </span>
        <ChevronRight
          size={14}
          color={t.textMuted}
          aria-hidden="true"
          style={{
            transform: aberta ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {aberta ? (
        <div style={{ padding: "16px 18px 18px" }}>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              color: t.text,
              fontFamily: FONT.body,
              whiteSpace: "pre-line",
            }}
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
