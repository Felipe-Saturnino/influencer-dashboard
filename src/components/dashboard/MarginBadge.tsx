import { useApp } from "../../context/AppContext";
import { FONT } from "../../constants/theme";
import { BRAND } from "../../lib/dashboardConstants";

function fmtMargemPct(v: number) {
  return `${v.toFixed(1)}%`;
}

export function MarginBadge({ value }: { value: number | null }) {
  const { theme: tt } = useApp();
  if (value == null) {
    return <span style={{ color: tt.textMuted }}>—</span>;
  }
  const v = Number(value);
  let bg: string = "rgba(124,58,237,0.12)";
  let color: string = BRAND.roxoVivo;
  if (v > 10) {
    bg = "rgba(34,197,94,0.12)";
    color = BRAND.verde;
  } else if (v < 0) {
    bg = "rgba(232,64,37,0.12)";
    color = BRAND.vermelho;
  }
  const texto = fmtMargemPct(v);
  const desc = v > 10 ? "excelente" : v < 0 ? "negativa" : "normal";
  return (
    <span
      aria-label={`Margem: ${texto} — ${desc}`}
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: FONT.body,
      }}
    >
      {texto}
    </span>
  );
}
