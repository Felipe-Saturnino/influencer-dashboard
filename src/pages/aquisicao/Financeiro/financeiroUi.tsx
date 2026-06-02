import type { CSSProperties, ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BASE_COLORS, FONT } from "../../../constants/theme";

// ── Componentes base ───────────────────────────────────────────────────────────

export function Badge({ status, config }: { status: string; config: Record<string, { label: string; color: string }> }) {
  const cfg = config[status] ?? { label: status, color: "#6b7280" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "10px",
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: "20px",
        background: `${cfg.color}22`,
        color: cfg.color,
        border: `1px solid ${cfg.color}44`,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

export function SelectInput({ value, onChange, options, style, "aria-label": ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
  "aria-label"?: string;
}) {
  const { theme: t } = useApp();
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "7px 12px", borderRadius: "10px",
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg, color: t.inputText,
        fontSize: "12px", fontFamily: FONT.body,
        outline: "none", cursor: "pointer", ...style,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function BtnPrimary({ onClick, children, disabled, style, title }: {
  onClick: () => void; children: React.ReactNode;
  disabled?: boolean; style?: React.CSSProperties;
  title?: string;
}) {
  const brand = useDashboardBrand();
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px", borderRadius: "10px", border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
        color: "#fff", fontSize: "12px", fontWeight: 700,
        fontFamily: FONT.body, ...style,
      }}
    >
      {children}
    </button>
  );
}

export function BtnAcao({ onClick, children, color }: {
  onClick: () => void; children: React.ReactNode; color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: "8px",
        border: `1px solid ${color}44`,
        background: `${color}15`, color,
        fontSize: "11px", fontWeight: 700,
        fontFamily: FONT.body, cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}
