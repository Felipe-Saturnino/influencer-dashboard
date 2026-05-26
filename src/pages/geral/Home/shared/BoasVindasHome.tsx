import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { HOME_BODY_MUTED } from "./homeSharedUi";

export function BoasVindasHome({ nome, subtitulo }: { nome: string; subtitulo: string }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const cardBg = brand.useBrand && brand.blockBg ? brand.blockBg : t.cardBg;

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 20,
        padding: "28px 28px 26px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: brand.useBrand
            ? "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))"
            : "linear-gradient(90deg, var(--brand-primary, #7c3aed), var(--brand-secondary, #1e36f8))",
        }}
        aria-hidden
      />
      <h1
        style={{
          margin: "0 0 12px",
          fontSize: 22,
          fontWeight: 800,
          color: t.text,
          fontFamily: FONT_TITLE,
          letterSpacing: "0.02em",
          lineHeight: 1.25,
        }}
      >
        Olá, {nome}!
      </h1>
      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, whiteSpace: "pre-line" }}>{subtitulo}</p>
    </div>
  );
}
