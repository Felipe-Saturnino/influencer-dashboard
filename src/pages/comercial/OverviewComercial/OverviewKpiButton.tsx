import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";

export function OverviewKpiButton({
  label,
  value,
  hint,
  accent,
  active,
  onClick,
  t,
}: {
  label: string;
  value: number;
  hint: string;
  accent: string;
  active?: boolean;
  onClick?: () => void;
  t: { cardBorder: string; inputBg: string };
}) {
  const interactive = typeof onClick === "function";
  const commonStyle = {
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: "16px 18px",
    background: t.inputBg,
    cursor: interactive ? ("pointer" as const) : ("default" as const),
    textAlign: "left" as const,
    borderLeft: `3px solid ${accent}`,
    outline: active ? `2px solid ${accent}` : undefined,
    outlineOffset: active ? 2 : undefined,
    fontFamily: FONT.body,
    width: "100%",
  };

  const body = (
    <>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          color: "var(--text-muted, #6b7280)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT_TITLE,
          fontSize: 28,
          fontWeight: 800,
          marginTop: 4,
          fontVariantNumeric: "tabular-nums",
          color: accent,
        }}
      >
        {value.toLocaleString("pt-BR")}
      </div>
      {hint ? (
        <div style={{ fontSize: 10, color: "var(--text-muted, #6b7280)", marginTop: 6 }}>{hint}</div>
      ) : null}
    </>
  );

  if (!interactive) {
    return <div style={commonStyle}>{body}</div>;
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={active ?? false} style={commonStyle}>
      {body}
    </button>
  );
}
