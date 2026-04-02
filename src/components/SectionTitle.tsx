import type { ReactNode } from "react";
import { FONT } from "../constants/theme";

export interface SectionTitleProps {
  /** Ícone dentro do badge (ex.: `<Lock size={14} color="#fff" strokeWidth={2} />`). */
  icon: ReactNode;
  label: string;
  subtitle?: string;
  titleColor: string;
  subtitleColor?: string;
}

/**
 * Título de seção padrão: badge 28×28 (raio 8) com cor de marca + h2 Barlow Condensed em caixa alta.
 * Cor do badge: whitelabel via `--brand-primary`.
 */
export function SectionTitle({ icon, label, subtitle, titleColor, subtitleColor }: SectionTitleProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--brand-primary, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: titleColor,
            fontFamily: FONT.title,
            margin: 0,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          {label}
        </h2>
      </div>
      {subtitle != null && subtitle !== "" && (
        <p
          style={{
            fontSize: 13,
            color: subtitleColor ?? titleColor,
            fontFamily: FONT.body,
            margin: "0 0 20px 40px",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
