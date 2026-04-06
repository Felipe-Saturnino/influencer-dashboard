import type { CSSProperties, ReactNode } from "react";
import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";

export interface SelectComIconeProps {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  /** Rótulo acessível (aria-label) — obrigatório. */
  label: string;
  minWidth?: number;
  /** true: mesmo visual pill do Overview Influencer (border-radius 999). */
  pill?: boolean;
  style?: CSSProperties;
}

export function SelectComIcone({
  icon,
  value,
  onChange,
  children,
  label,
  minWidth = 160,
  pill = false,
  style,
}: SelectComIconeProps) {
  const { theme: t } = useApp();
  const borderRadius = pill ? 999 : 10;
  const padLeft = pill ? 30 : 32;
  const padRight = 28;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          color: t.textMuted,
          zIndex: 1,
        }}
      >
        {icon}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: `6px ${padRight}px 6px ${padLeft}px`,
          borderRadius,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg ?? t.cardBg,
          color: t.text,
          fontSize: 13,
          fontFamily: FONT.body,
          cursor: "pointer",
          outline: "none",
          appearance: "none" as const,
          minWidth,
          ...style,
        }}
      >
        {children}
      </select>
      <span
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: t.textMuted,
          fontSize: 10,
          lineHeight: 1,
        }}
      >
        ▾
      </span>
    </div>
  );
}
