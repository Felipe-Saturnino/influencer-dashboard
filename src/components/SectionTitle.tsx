import type { ReactNode } from "react";
import { FONT } from "../constants/theme";

export type SectionTitleHeading = "h1" | "h2" | "h3";

export interface SectionTitleProps {
  /** Ícone dentro do badge (ex.: `<Lock size={14} color="#fff" strokeWidth={2} />`). */
  icon: ReactNode;
  label: string;
  subtitle?: string;
  titleColor: string;
  subtitleColor?: string;
  /** Nível do heading semântico (contextos aninhados). */
  as?: SectionTitleHeading;
}

/**
 * Título de seção padrão: badge 28×28 (raio 8) com cor de marca + heading Barlow Condensed em caixa alta.
 * Cor do badge: whitelabel via `--brand-primary`.
 */
export function SectionTitle({
  icon,
  label,
  subtitle,
  titleColor,
  subtitleColor,
  as = "h2",
}: SectionTitleProps) {
  const Tag = as;

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
        <Tag
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
        </Tag>
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
