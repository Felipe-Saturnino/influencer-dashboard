import type { ReactNode } from "react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { FONT } from "../../../../constants/theme";
import { HOME_BODY_MUTED } from "./homeSharedUi";

export function BoasVindasPerfilHome({
  nome,
  roleLabel,
  subtitulo,
  avatarLabel,
  simulacaoNota,
  chip,
}: {
  nome: string;
  roleLabel: string;
  subtitulo: string;
  avatarLabel?: string;
  simulacaoNota?: string | null;
  /** Chip opcional (ex.: nome da operadora no Operador). */
  chip?: ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const cardBg = brand.useBrand && brand.blockBg ? brand.blockBg : t.cardBg;
  const label = (avatarLabel ?? nome).trim();
  const initial = (label[0] || "?").toUpperCase();
  const faixa = brand.useBrand
    ? "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))"
    : "linear-gradient(90deg, var(--brand-primary, #7c3aed), var(--brand-secondary, #1e36f8))";
  const avatarBg = brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 20,
        padding: 28,
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
          background: faixa,
        }}
        aria-hidden
      />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            flexShrink: 0,
            background: avatarBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 20,
            fontFamily: FONT.body,
            border: brand.useBrand
              ? "2px solid color-mix(in srgb, var(--brand-primary) 45%, transparent)"
              : "2px solid rgba(124, 58, 237, 0.45)",
          }}
          aria-hidden
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1
            style={{
              margin: "0 0 6px",
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
          <p style={{ margin: "0 0 8px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            {roleLabel}
          </p>
          {chip ? <div style={{ marginBottom: 8 }}>{chip}</div> : null}
          <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, fontSize: 14, whiteSpace: "pre-line" }}>
            {subtitulo}
          </p>
          {simulacaoNota ? (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.45, fontFamily: FONT.body }}>
              {simulacaoNota}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
