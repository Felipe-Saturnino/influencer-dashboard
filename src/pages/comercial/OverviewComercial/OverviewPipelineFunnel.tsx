import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { PIPELINE_COLOR } from "../PipelineB2B/constants";
import { funnelConversionRates } from "./helpers";
import type { StatusPipeline } from "../PipelineB2B/constants";

type FunnelLevel = {
  stage: StatusPipeline;
  label: string;
  count: number;
  color: string;
};

type Props = {
  funnel: FunnelLevel[];
  funnelCounts: Record<StatusPipeline, number>;
};

export function OverviewPipelineFunnel({ funnel, funnelCounts }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const taxas = funnelConversionRates(funnelCounts);

  const W = 420;
  const H = 340;
  const levels = 4;
  const stepH = H / levels;
  const widths = [1.0, 0.72, 0.52, 0.32].map((f) => f * W);

  const taxaRows = [
    { label: "Disponíveis → Conexão", taxa: taxas.dispConexao, color: PIPELINE_COLOR.conexao },
    { label: "Conexão → Negociação", taxa: taxas.conexNeg, color: PIPELINE_COLOR.negociacao },
    { label: "Negociação → Fechado", taxa: taxas.negFech, color: PIPELINE_COLOR.fechado },
    {
      label: "Disponíveis → Fechado",
      taxa: taxas.dispFech,
      color: brand.useBrand ? "var(--brand-contrast, #1e36f8)" : brand.accent,
      highlight: true,
    },
  ];

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
          aria-label="Funil do pipeline comercial"
        >
          {funnel.map((level, i) => {
            const wTop = widths[i];
            const wBot = widths[i + 1] ?? widths[i] * 0.7;
            const xTop = (W - wTop) / 2;
            const xBot = (W - wBot) / 2;
            const yTop = i * stepH;
            const yBot = yTop + stepH - 2;
            const path = `M ${xTop} ${yTop} L ${xTop + wTop} ${yTop} L ${xBot + wBot} ${yBot} L ${xBot} ${yBot} Z`;
            return (
              <g key={level.stage}>
                <defs>
                  <linearGradient id={`ov-pipe-funnel-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={level.color} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={level.color} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <path d={path} fill={`url(#ov-pipe-funnel-${i})`} />
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
                  {level.label}
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
                  {level.count.toLocaleString("pt-BR")}
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
            textTransform: "uppercase",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Taxas de Conversão
        </div>
        {taxaRows.map((r) => {
          const highlight = "highlight" in r && r.highlight;
          const border = highlight
            ? `1px solid color-mix(in srgb, ${r.color} 32%, transparent)`
            : `1px solid ${t.cardBorder}`;
          const bg = highlight
            ? `color-mix(in srgb, ${r.color} 8%, transparent)`
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
                  textTransform: "uppercase",
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
                  color: highlight ? r.color : t.text,
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
