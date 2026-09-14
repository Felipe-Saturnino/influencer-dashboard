import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { FONT } from "../../../../constants/theme";
import {
  AFILIADO_HOME_ROLE_LABEL,
  AFILIADO_HOME_WELCOME_SUBTITLE,
} from "../../../../lib/homeAfiliadoCopy";
import { HOME_BODY_MUTED } from "../shared/homeSharedUi";

export function BoasVindasAfiliado({
  nome,
  avatarLabel,
  simulacaoNota,
}: {
  nome: string;
  avatarLabel: string;
  simulacaoNota?: string | null;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const cardBg = brand.useBrand && brand.blockBg ? brand.blockBg : t.cardBg;
  const initial = (avatarLabel.trim()[0] || "?").toUpperCase();

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
          background: "linear-gradient(90deg, var(--brand-primary, #7c3aed), var(--brand-secondary, #1e36f8))",
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
            background: "linear-gradient(135deg, #4a2082, #1e36f8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 20,
            fontFamily: FONT.body,
            border: "2px solid rgba(124, 58, 237, 0.45)",
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
            {AFILIADO_HOME_ROLE_LABEL}
          </p>
          <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, fontSize: 14, whiteSpace: "pre-line" }}>
            {AFILIADO_HOME_WELCOME_SUBTITLE}
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
