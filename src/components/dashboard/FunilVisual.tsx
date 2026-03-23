import { useApp } from "../../context/AppContext";
import { FONT } from "../../constants/theme";
import { FUNIL_COLORS } from "../../lib/dashboardConstants";

const FUNIL_STEPS = [
  { key: "views", label: "Views (média)" },
  { key: "acessos", label: "Acessos" },
  { key: "registros", label: "Registros" },
  { key: "ftds", label: "FTDs" },
] as const;

interface Props {
  values: number[];
  taxas: string[];
  /** Prefixo único para IDs de gradiente (evita colisão quando há múltiplos funis na página) */
  idPrefix?: string;
}

export default function FunilVisual({
  values,
  taxas,
  idPrefix = "fgrad",
}: Props) {
  const { theme: t } = useApp();
  const W = 420;
  const H = 340;
  const levels = 4;
  const stepH = H / levels;
  const widths = [1.0, 0.72, 0.52, 0.32].map((f) => f * W);
  const getStepColor = (i: number) => FUNIL_COLORS[i];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
        alignItems: "stretch",
        minHeight: 340,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          style={{ maxHeight: 340, display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {FUNIL_STEPS.map((step, i) => {
            const wTop = widths[i];
            const wBot = widths[i + 1] ?? widths[i] * 0.7;
            const xTop = (W - wTop) / 2;
            const xBot = (W - wBot) / 2;
            const yTop = i * stepH;
            const yBot = yTop + stepH - 2;
            const col = getStepColor(i);
            const path = `M ${xTop} ${yTop} L ${xTop + wTop} ${yTop} L ${xBot + wBot} ${yBot} L ${xBot} ${yBot} Z`;
            return (
              <g key={step.key}>
                <defs>
                  <linearGradient
                    id={`${idPrefix}-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={col} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={col} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <path d={path} fill={`url(#${idPrefix}-${i})`} />
                <text
                  x={W / 2}
                  y={yTop + stepH / 2 - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={10}
                  fontFamily={FONT.body}
                  fontWeight={600}
                  letterSpacing="0.08em"
                  style={{ textTransform: "uppercase" }}
                >
                  {step.label}
                </text>
                <text
                  x={W / 2}
                  y={yTop + stepH / 2 + 9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={16}
                  fontFamily={FONT.body}
                  fontWeight={800}
                >
                  {values[i]?.toLocaleString("pt-BR") ?? "—"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: t.textMuted,
            fontFamily: FONT.body,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Taxas de Conversão
        </div>
        {[
          { label: "View → Acesso", taxa: taxas[0], color: FUNIL_COLORS[1] },
          { label: "Acesso → Registro", taxa: taxas[1], color: FUNIL_COLORS[2] },
          { label: "Registro → FTD", taxa: taxas[2], color: FUNIL_COLORS[3] },
          { label: "Acesso → FTD", taxa: taxas[3], color: FUNIL_COLORS[3], highlight: true },
          { label: "View → FTD", taxa: taxas[4], color: FUNIL_COLORS[0], highlight: true },
        ].map((r) => {
          const highlightColor = r.color;
          const border = (r as { highlight?: boolean }).highlight
            ? `1px solid color-mix(in srgb, ${highlightColor} 32%, transparent)`
            : `1px solid ${t.cardBorder}`;
          const bg = (r as { highlight?: boolean }).highlight
            ? `color-mix(in srgb, ${highlightColor} 8%, transparent)`
            : "rgba(255,255,255,0.02)";
          return (
            <div
              key={r.label}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border,
                background: bg,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                  marginBottom: 2,
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  fontFamily: FONT.body,
                  color: (r as { highlight?: boolean }).highlight
                    ? highlightColor
                    : t.text,
                }}
              >
                {r.taxa}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
