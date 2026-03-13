import { useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";

interface ScatterPoint {
  nome: string;
  ggr: number;
  investimento: number;
  roi: number | null;
  lives: number;
}

interface Props {
  data: ScatterPoint[];
  loading: boolean;
}

const QUADRANTS = [
  {
    id: "estrela",
    label: "ESTRELA",
    desc: "Alto GGR · Alto Invest.",
    action: "Continuar investindo",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    x: "right",
    y: "top",
  },
  {
    id: "escalar",
    label: "ESCALAR",
    desc: "Alto GGR · Baixo Invest.",
    action: "Aumentar investimento",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    x: "left",
    y: "top",
  },
  {
    id: "testar",
    label: "TESTAR",
    desc: "Baixo GGR · Baixo Invest.",
    action: "Ainda em validação",
    color: "#70cae4",
    bg: "rgba(112,202,228,0.08)",
    x: "right",
    y: "bottom",
  },
  {
    id: "cortar",
    label: "CORTAR",
    desc: "Baixo GGR · Alto Invest.",
    action: "Revisar ou pausar",
    color: "#e84025",
    bg: "rgba(232,64,37,0.08)",
    x: "left",
    y: "bottom",
  },
] as const;

function getQuadrant(ggr: number, invest: number, medGGR: number, medInvest: number) {
  const highGGR = ggr >= medGGR;
  const highInvest = invest >= medInvest;
  if (highGGR && highInvest) return "estrela";
  if (highGGR && !highInvest) return "escalar";
  if (!highGGR && !highInvest) return "testar";
  return "cortar";
}

export default function ScatterQuadrant({ data, loading }: Props) {
  const { theme: t } = useApp();

  const filtered = useMemo(() => data.filter((d) => d.investimento > 0 || d.ggr !== 0), [data]);

  const { medGGR, medInvest, minGGR, maxGGR, minInvest, maxInvest } = useMemo(() => {
    if (!filtered.length) return { medGGR: 0, medInvest: 0, minGGR: 0, maxGGR: 1, minInvest: 0, maxInvest: 1 };
    const ggrs = filtered.map((d) => d.ggr);
    const invs = filtered.map((d) => d.investimento);
    const medGGR = ggrs.reduce((a, b) => a + b, 0) / ggrs.length;
    const medInvest = invs.reduce((a, b) => a + b, 0) / invs.length;
    const pad = (max: number, min: number) => (max - min) * 0.15;
    const minGGR = Math.min(...ggrs);
    const maxGGR = Math.max(...ggrs);
    const minInvest = Math.min(...invs);
    const maxInvest = Math.max(...invs);
    const ggrPad = pad(maxGGR, minGGR);
    const invPad = pad(maxInvest, minInvest);
    return {
      medGGR, medInvest,
      minGGR: minGGR - ggrPad, maxGGR: maxGGR + ggrPad,
      minInvest: minInvest - invPad, maxInvest: maxInvest + invPad,
    };
  }, [filtered]);

  const W = 560, H = 320;
  const PAD = { top: 24, right: 24, bottom: 48, left: 68 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  function toX(ggr: number) {
    return PAD.left + ((ggr - minGGR) / (maxGGR - minGGR || 1)) * plotW;
  }
  function toY(inv: number) {
    return PAD.top + plotH - ((inv - minInvest) / (maxInvest - minInvest || 1)) * plotH;
  }

  const midX = toX(medGGR);
  const midY = toY(medInvest);

  const fmtK = (v: number) => {
    if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
    return `R$${v.toFixed(0)}`;
  };

  // Y axis ticks
  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = minInvest + ((maxInvest - minInvest) / steps) * i;
      return { val, y: toY(val) };
    });
  }, [minInvest, maxInvest, minGGR, maxGGR]);

  // X axis ticks
  const xTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = minGGR + ((maxGGR - minGGR) / steps) * i;
      return { val, x: toX(val) };
    });
  }, [minGGR, maxGGR, minInvest, maxInvest]);

  const points = useMemo(() =>
    filtered.map((d) => ({
      ...d,
      cx: toX(d.ggr),
      cy: toY(d.investimento),
      quadrant: getQuadrant(d.ggr, d.investimento, medGGR, medInvest),
    })),
    [filtered, medGGR, medInvest, minGGR, maxGGR, minInvest, maxInvest]
  );

  const quadrantColor = (id: string) => QUADRANTS.find((q) => q.id === id)?.color ?? "#6b7280";

  if (loading) {
    return (
      <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        Carregando...
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        Sem dados no período
      </div>
    );
  }

  return (
    <div>
      {/* SVG Plot */}
      <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", minWidth: 300 }}>
          {/* Quadrant backgrounds */}
          {/* Escalar: alto GGR, baixo invest (left=midX, top=PAD.top, right=PAD.left+plotW, bottom=midY) */}
          <rect x={midX} y={PAD.top} width={PAD.left + plotW - midX} height={midY - PAD.top}
            fill="rgba(34,197,94,0.06)" />
          {/* Estrela: alto GGR, alto invest */}
          <rect x={midX} y={midY} width={PAD.left + plotW - midX} height={PAD.top + plotH - midY}
            fill="rgba(245,158,11,0.06)" />
          {/* Cortar: baixo GGR, alto invest */}
          <rect x={PAD.left} y={midY} width={midX - PAD.left} height={PAD.top + plotH - midY}
            fill="rgba(232,64,37,0.06)" />
          {/* Testar: baixo GGR, baixo invest */}
          <rect x={PAD.left} y={PAD.top} width={midX - PAD.left} height={midY - PAD.top}
            fill="rgba(112,202,228,0.06)" />

          {/* Grid lines */}
          {yTicks.map(({ y }, i) => (
            <line key={i} x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          ))}
          {xTicks.map(({ x }, i) => (
            <line key={i} x1={x} x2={x} y1={PAD.top} y2={PAD.top + plotH}
              stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          ))}

          {/* Axis labels */}
          {yTicks.map(({ val, y }, i) => (
            <text key={i} x={PAD.left - 6} y={y + 4} textAnchor="end"
              fill={t.textMuted} fontSize={9} fontFamily={FONT.body}>
              {fmtK(val)}
            </text>
          ))}
          {xTicks.map(({ val, x }, i) => (
            <text key={i} x={x} y={PAD.top + plotH + 16} textAnchor="middle"
              fill={t.textMuted} fontSize={9} fontFamily={FONT.body}>
              {fmtK(val)}
            </text>
          ))}

          {/* Axis titles */}
          <text x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle"
            fill={t.textMuted} fontSize={10} fontFamily={FONT.body} letterSpacing="0.08em">
            GGR →
          </text>
          <text x={12} y={PAD.top + plotH / 2} textAnchor="middle"
            fill={t.textMuted} fontSize={10} fontFamily={FONT.body} letterSpacing="0.08em"
            transform={`rotate(-90, 12, ${PAD.top + plotH / 2})`}>
            INVEST. →
          </text>

          {/* Quadrant dividers */}
          <line x1={midX} x2={midX} y1={PAD.top} y2={PAD.top + plotH}
            stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={PAD.left} x2={PAD.left + plotW} y1={midY} y2={midY}
            stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="4 4" />

          {/* Quadrant labels */}
          <text x={midX + 8} y={PAD.top + 14} fill="rgba(34,197,94,0.55)" fontSize={9}
            fontFamily={FONT.body} fontWeight={700} letterSpacing="0.1em">ESCALAR</text>
          <text x={midX + 8} y={PAD.top + plotH - 8} fill="rgba(245,158,11,0.55)" fontSize={9}
            fontFamily={FONT.body} fontWeight={700} letterSpacing="0.1em">ESTRELA</text>
          <text x={PAD.left + 6} y={PAD.top + 14} fill="rgba(112,202,228,0.55)" fontSize={9}
            fontFamily={FONT.body} fontWeight={700} letterSpacing="0.1em">TESTAR</text>
          <text x={PAD.left + 6} y={PAD.top + plotH - 8} fill="rgba(232,64,37,0.55)" fontSize={9}
            fontFamily={FONT.body} fontWeight={700} letterSpacing="0.1em">CORTAR</text>

          {/* Data points */}
          {points.map((p, i) => {
            const col = quadrantColor(p.quadrant);
            return (
              <g key={i}>
                {/* Glow */}
                <circle cx={p.cx} cy={p.cy} r={10} fill={col} opacity={0.12} />
                <circle cx={p.cx} cy={p.cy} r={7} fill={col} opacity={0.22} />
                <circle cx={p.cx} cy={p.cy} r={5} fill={col} opacity={0.9}
                  style={{ cursor: "pointer" }} />
                {/* Name label */}
                <text x={p.cx} y={p.cy - 10} textAnchor="middle"
                  fill={col} fontSize={9} fontFamily={FONT.body} fontWeight={600}
                  opacity={0.85}>
                  {p.nome.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 12, paddingTop: 12, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
        {QUADRANTS.map((q) => (
          <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: q.color, display: "inline-block", boxShadow: `0 0 6px ${q.color}60` }} />
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, letterSpacing: "0.06em" }}>
              <span style={{ color: q.color, fontWeight: 700 }}>{q.label}</span>
              <span style={{ opacity: 0.6 }}> — {q.action}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
