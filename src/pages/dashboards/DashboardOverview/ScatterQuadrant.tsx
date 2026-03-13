import { useMemo, useState, useCallback } from "react";
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
  { id: "estrela", label: "ESTRELA", action: "Continuar investindo",   color: "#f59e0b" },
  { id: "escalar", label: "ESCALAR", action: "Aumentar investimento",   color: "#22c55e" },
  { id: "testar",  label: "TESTAR",  action: "Ainda em validação",      color: "#70cae4" },
  { id: "cortar",  label: "CORTAR",  action: "Revisar ou pausar",       color: "#e84025" },
] as const;

type QuadrantId = typeof QUADRANTS[number]["id"];

function getQuadrant(ggr: number, invest: number, medGGR: number, medInvest: number): QuadrantId {
  const highGGR    = ggr    >= medGGR;
  const highInvest = invest >= medInvest;
  if ( highGGR &&  highInvest) return "escalar";
  if ( highGGR && !highInvest) return "estrela";
  if (!highGGR &&  highInvest) return "cortar";
  return "testar";
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── JITTER: afasta bolinhas sobrepostas iterativamente ───────────────────────
const RADIUS = 6;
const MIN_DIST = RADIUS * 2 + 4;

type PointWithCoords = ScatterPoint & { cx: number; cy: number; quadrant: QuadrantId };

function applyJitter(points: PointWithCoords[]): (PointWithCoords & { jx: number; jy: number })[] {
  const result = points.map((p) => ({ ...p, jx: p.cx, jy: p.cy }));
  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx   = result[j].jx - result[i].jx;
        const dy   = result[j].jy - result[i].jy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIN_DIST) {
          moved = true;
          if (dist === 0) {
            const angle = (i * 137.5 * Math.PI) / 180;
            result[i].jx -= Math.cos(angle) * (MIN_DIST / 2);
            result[i].jy -= Math.sin(angle) * (MIN_DIST / 2);
            result[j].jx += Math.cos(angle) * (MIN_DIST / 2);
            result[j].jy += Math.sin(angle) * (MIN_DIST / 2);
          } else {
            const overlap = (MIN_DIST - dist) / 2;
            result[i].jx -= (dx / dist) * overlap;
            result[i].jy -= (dy / dist) * overlap;
            result[j].jx += (dx / dist) * overlap;
            result[j].jy += (dy / dist) * overlap;
          }
        }
      }
    }
    if (!moved) break;
  }
  return result;
}

export default function ScatterQuadrant({ data, loading }: Props) {
  const { theme: t } = useApp();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const filtered = useMemo(
    () => data.filter((d) => d.investimento > 0 || d.ggr !== 0),
    [data]
  );

  const { medGGR, medInvest, minGGR, maxGGR, minInvest, maxInvest } = useMemo(() => {
    if (!filtered.length)
      return { medGGR: 0, medInvest: 0, minGGR: -1, maxGGR: 1, minInvest: -1, maxInvest: 1 };
    const ggrs = filtered.map((d) => d.ggr);
    const invs = filtered.map((d) => d.investimento);
    const medGGR    = ggrs.reduce((a, b) => a + b, 0) / ggrs.length;
    const medInvest = invs.reduce((a, b) => a + b, 0) / invs.length;
    const rawMinGGR = Math.min(...ggrs);
    const rawMaxGGR = Math.max(...ggrs);
    const rawMinInv = Math.min(...invs);
    const rawMaxInv = Math.max(...invs);
    const padX = (rawMaxGGR - rawMinGGR) * 0.18 || 500;
    const padY = (rawMaxInv - rawMinInv) * 0.18 || 200;
    return {
      medGGR, medInvest,
      minGGR:    rawMinGGR - padX,
      maxGGR:    rawMaxGGR + padX,
      minInvest: rawMinInv - padY,
      maxInvest: rawMaxInv + padY,
    };
  }, [filtered]);

  // Dimensões — sem labels de valores nas laterais
  const W = 560, H = 300;
  const PAD = { top: 28, right: 20, bottom: 36, left: 20 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const toX = useCallback(
    (ggr: number) => PAD.left + ((ggr - minGGR) / (maxGGR - minGGR || 1)) * plotW,
    [minGGR, maxGGR, plotW]
  );
  const toY = useCallback(
    (inv: number) => PAD.top + plotH - ((inv - minInvest) / (maxInvest - minInvest || 1)) * plotH,
    [minInvest, maxInvest, plotH]
  );

  // Divisórias exatamente no centro geométrico do plot
  const midX = PAD.left + plotW / 2;
  const midY = PAD.top  + plotH / 2;

  const rawPoints = useMemo(
    () =>
      filtered.map((d) => ({
        ...d,
        cx: toX(d.ggr),
        cy: toY(d.investimento),
        quadrant: getQuadrant(d.ggr, d.investimento, medGGR, medInvest),
      })),
    [filtered, medGGR, medInvest, toX, toY]
  );

  const points = useMemo(() => applyJitter(rawPoints), [rawPoints]);

  const quadrantColor = (id: string) =>
    QUADRANTS.find((q) => q.id === id)?.color ?? "#6b7280";

  // Tooltip — posição inteligente
  const TT_W = 152, TT_H = 58;
  const activePoint = activeIdx !== null ? points[activeIdx] : null;
  function ttX(cx: number) {
    if (cx + TT_W / 2 + 6 > W) return W - TT_W - 6;
    if (cx - TT_W / 2 - 6 < 0) return 6;
    return cx - TT_W / 2;
  }
  function ttY(cy: number) {
    return cy - TT_H - 14 < PAD.top ? cy + 14 : cy - TT_H - 10;
  }

  if (loading) return (
    <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
      Carregando...
    </div>
  );

  if (!filtered.length) return (
    <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
      Sem dados no período
    </div>
  );

  return (
    <div>
      <div style={{ position: "relative", width: "100%" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: "block" }}
          onClick={() => setActiveIdx(null)}
        >
          {/* ── Fundos dos quadrantes ── */}
          {/* ESCALAR: alto GGR (direita) + alto Invest (cima) */}
          <rect x={midX} y={PAD.top}
            width={PAD.left + plotW - midX} height={midY - PAD.top}
            fill="rgba(34,197,94,0.07)" />
          {/* ESTRELA: alto GGR (direita) + baixo Invest (baixo) */}
          <rect x={midX} y={midY}
            width={PAD.left + plotW - midX} height={PAD.top + plotH - midY}
            fill="rgba(245,158,11,0.07)" />
          {/* CORTAR: baixo GGR (esquerda) + alto Invest (cima) */}
          <rect x={PAD.left} y={PAD.top}
            width={midX - PAD.left} height={midY - PAD.top}
            fill="rgba(232,64,37,0.07)" />
          {/* TESTAR: baixo GGR (esquerda) + baixo Invest (baixo) */}
          <rect x={PAD.left} y={midY}
            width={midX - PAD.left} height={PAD.top + plotH - midY}
            fill="rgba(112,202,228,0.07)" />

          {/* ── Divisórias centralizadas ── */}
          <line x1={midX} x2={midX} y1={PAD.top} y2={PAD.top + plotH}
            stroke="rgba(255,255,255,0.22)" strokeWidth={1} strokeDasharray="5 4" />
          <line x1={PAD.left} x2={PAD.left + plotW} y1={midY} y2={midY}
            stroke="rgba(255,255,255,0.22)" strokeWidth={1} strokeDasharray="5 4" />

          {/* ── Labels dos eixos centralizados nas divisórias ── */}
          <text x={PAD.left + plotW / 2} y={PAD.top + plotH + 24}
            textAnchor="middle" fill={t.textMuted}
            fontSize={10} fontFamily={FONT.body} letterSpacing="0.08em">
            GGR →
          </text>
          <text x={10} y={PAD.top + plotH / 2}
            textAnchor="middle" fill={t.textMuted}
            fontSize={10} fontFamily={FONT.body} letterSpacing="0.08em"
            transform={`rotate(-90, 10, ${PAD.top + plotH / 2})`}>
            INVEST. →
          </text>

          {/* ── Labels dos quadrantes (cantos internos) ── */}
          <text x={midX + 7}    y={PAD.top + 14}        fill="rgba(34,197,94,0.60)"  fontSize={9} fontFamily={FONT.body} fontWeight={700} letterSpacing="0.12em">ESCALAR</text>
          <text x={midX + 7}    y={PAD.top + plotH - 8} fill="rgba(245,158,11,0.60)" fontSize={9} fontFamily={FONT.body} fontWeight={700} letterSpacing="0.12em">ESTRELA</text>
          <text x={PAD.left + 6} y={PAD.top + 14}       fill="rgba(232,64,37,0.60)"  fontSize={9} fontFamily={FONT.body} fontWeight={700} letterSpacing="0.12em">CORTAR</text>
          <text x={PAD.left + 6} y={PAD.top + plotH - 8} fill="rgba(112,202,228,0.60)" fontSize={9} fontFamily={FONT.body} fontWeight={700} letterSpacing="0.12em">TESTAR</text>

          {/* ── Bolinhas com jitter ── */}
          {points.map((p, i) => {
            const col      = quadrantColor(p.quadrant);
            const isActive = activeIdx === i;
            const jx = p.jx as number;
            const jy = p.jy as number;
            return (
              <g key={i} style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); setActiveIdx(isActive ? null : i); }}>
                <circle cx={jx} cy={jy} r={isActive ? 14 : 11} fill={col} opacity={0.10} />
                <circle cx={jx} cy={jy} r={isActive ? 10 : 7}  fill={col} opacity={0.18} />
                <circle cx={jx} cy={jy} r={RADIUS}
                  fill={col} opacity={isActive ? 1 : 0.88}
                  stroke={isActive ? "#fff" : "none"} strokeWidth={isActive ? 1.5 : 0} />
                {!isActive && (
                  <text x={jx} y={jy - RADIUS - 4} textAnchor="middle"
                    fill={col} fontSize={8} fontFamily={FONT.body} fontWeight={600} opacity={0.82}>
                    {p.nome.split(" ")[0]}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Tooltip ao clicar ── */}
          {activePoint && (() => {
            const col = quadrantColor(activePoint.quadrant);
            const jx  = activePoint.jx as number;
            const jy  = activePoint.jy as number;
            const tx  = ttX(jx);
            const ty  = ttY(jy);
            return (
              <g>
                <rect x={tx + 1} y={ty + 1} width={TT_W} height={TT_H}
                  rx={8} fill="rgba(0,0,0,0.30)" />
                <rect x={tx} y={ty} width={TT_W} height={TT_H}
                  rx={8} fill={t.cardBg} stroke={col} strokeWidth={1.2} strokeOpacity={0.65} />
                {/* Nome */}
                <text x={tx + 10} y={ty + 17}
                  fill={col} fontSize={11} fontFamily={FONT.body} fontWeight={700}>
                  {activePoint.nome.split(" ")[0]}
                </text>
                {/* GGR */}
                <text x={tx + 10} y={ty + 33} fill={t.textMuted} fontSize={9} fontFamily={FONT.body}>GGR:</text>
                <text x={tx + 36} y={ty + 33}
                  fill={activePoint.ggr >= 0 ? "#22c55e" : "#e84025"}
                  fontSize={9} fontFamily={FONT.body} fontWeight={700}>
                  {fmtBRL(activePoint.ggr)}
                </text>
                {/* Investimento */}
                <text x={tx + 10} y={ty + 47} fill={t.textMuted} fontSize={9} fontFamily={FONT.body}>Invest.:</text>
                <text x={tx + 46} y={ty + 47}
                  fill={t.text} fontSize={9} fontFamily={FONT.body} fontWeight={700}>
                  {fmtBRL(activePoint.investimento)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* ── Legenda: 2 linhas × 2 colunas ── */}
      <div style={{
        marginTop: 10, paddingTop: 10,
        borderTop: `1px solid ${t.cardBorder}`,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "5px 12px",
      }}>
        {/* Linha 1: Estrela | Escalar */}
        {/* Linha 2: Testar  | Cortar  */}
        {(["estrela","escalar","testar","cortar"] as QuadrantId[]).map((id) => {
          const q = QUADRANTS.find((q) => q.id === id)!;
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: q.color, display: "inline-block",
                boxShadow: `0 0 5px ${q.color}70`,
              }} />
              <span style={{ fontSize: 10, fontFamily: FONT.body }}>
                <span style={{ color: q.color, fontWeight: 700 }}>{q.label}</span>
                <span style={{ color: t.textMuted }}> — {q.action}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
