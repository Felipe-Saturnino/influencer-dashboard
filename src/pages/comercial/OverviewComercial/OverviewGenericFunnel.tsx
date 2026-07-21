import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";

export type OverviewFunnelLevel = {
  id: string;
  label: string;
  count: number;
  color: string;
};

type TaxaRow = {
  label: string;
  taxa: number | null;
  color: string;
  highlight?: boolean;
};

type Props = {
  levels: OverviewFunnelLevel[];
  taxas: TaxaRow[];
  ariaLabel: string;
  /** Quando false, renderiza só o SVG do funil (sem painel de taxas). Default true. */
  showTaxas?: boolean;
};

function pct(taxa: number | null): string {
  if (taxa == null || !Number.isFinite(taxa)) return "—";
  return `${taxa.toFixed(1)}%`;
}

/** Funil genérico (layout duo SVG + taxas) — Overview Comercial. */
export function OverviewGenericFunnel({ levels, taxas, ariaLabel, showTaxas = true }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const W = 420;
  const H = 340;
  const n = Math.max(levels.length, 1);
  const stepH = H / n;
  const widthFactors =
    n === 4
      ? [1.0, 0.72, 0.52, 0.32]
      : n === 3
        ? [1.0, 0.7, 0.42]
        : n === 7
          ? [1.0, 0.9, 0.8, 0.68, 0.56, 0.44, 0.32]
          : levels.map((_, i) => Math.max(0.28, 1 - i * (0.7 / Math.max(n - 1, 1))));
  const widths = widthFactors.map((f) => f * W);

  const svg = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        style={{ maxHeight: 340, display: "block" }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        {levels.map((level, i) => {
          const wTop = widths[i] ?? W * 0.4;
          const wBot = widths[i + 1] ?? wTop * 0.7;
          const xTop = (W - wTop) / 2;
          const xBot = (W - wBot) / 2;
          const yTop = i * stepH;
          const yBot = yTop + stepH - 2;
          const path = `M ${xTop} ${yTop} L ${xTop + wTop} ${yTop} L ${xBot + wBot} ${yBot} L ${xBot} ${yBot} Z`;
          return (
            <g key={level.id}>
              <defs>
                <linearGradient id={`ov-gen-funnel-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={level.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={level.color} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <path d={path} fill={`url(#ov-gen-funnel-${i})`} />
              <text
                x={W / 2}
                y={yTop + stepH / 2 - 6}
                textAnchor="middle"
                fill="#fff"
                fontSize={n > 5 ? 11 : 13}
                fontWeight={700}
                fontFamily={FONT.body}
              >
                {level.label}
              </text>
              <text
                x={W / 2}
                y={yTop + stepH / 2 + 12}
                textAnchor="middle"
                fill="#fff"
                fontSize={n > 5 ? 14 : 16}
                fontWeight={800}
                fontFamily={FONT.body}
              >
                {level.count.toLocaleString("pt-BR")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );

  if (!showTaxas) {
    return <div style={{ minHeight: 280 }}>{svg}</div>;
  }

  return (
    <div
      className="app-conversao-funil-duo"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
        alignItems: "stretch",
        minHeight: 340,
      }}
    >
      {svg}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
          fontFamily: FONT.body,
        }}
      >
        {taxas.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: row.highlight
                ? `color-mix(in srgb, ${brand.useBrand ? "var(--brand-contrast, #1e36f8)" : brand.accent} 10%, transparent)`
                : t.inputBg,
            }}
          >
            <span style={{ fontSize: 12, color: t.textMuted }}>{row.label}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: row.color }}>{pct(row.taxa)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
