import { useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";

interface BulletPoint {
  nome: string;
  ggr: number;
  investimento: number;
  roi: number | null;
}

interface Props {
  data: BulletPoint[];
  loading: boolean;
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtK(v: number) {
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1000) return sign + "R$" + (abs / 1000).toFixed(1) + "k";
  return sign + "R$" + abs.toFixed(0);
}

const BRAND = {
  verde:    "#22c55e",
  vermelho: "#e84025",
  amarelo:  "#f59e0b",
  roxo:     "#4a2082",
  azul:     "#1e36f8",
  ciano:    "#70cae4",
};

function getRoiBadge(roi: number | null, ggr: number, investimento: number) {
  if (investimento === 0) {
    if (ggr > 0)  return { label: "Bônus",        cor: "#a855f7" };
    if (ggr < 0)  return { label: "Atenção",       cor: BRAND.amarelo };
    return              { label: "Sem dados",      cor: "#6b7280" };
  }
  const r = roi ?? 0;
  const roiStr = `${r >= 0 ? "+" : ""}${r.toFixed(0)}%`;
  if (r >= 0)   return { label: roiStr, cor: BRAND.verde   };
  if (r >= -30) return { label: roiStr, cor: BRAND.amarelo };
  return              { label: roiStr, cor: BRAND.vermelho };
}

export default function BulletChart({ data, loading }: Props) {
  const { theme: t } = useApp();

  // Top 10 por investimento
  const rows = useMemo(() =>
    [...data]
      .filter((d) => d.investimento > 0 || Math.abs(d.ggr) > 0)
      .sort((a, b) => b.investimento - a.investimento)
      .slice(0, 10),
    [data]
  );

  // Escala simétrica: domínio é o maior valor absoluto entre GGR e Invest
  const maxAbs = useMemo(() => {
    if (!rows.length) return 1;
    return Math.max(
      ...rows.map((r) => Math.abs(r.ggr)),
      ...rows.map((r) => r.investimento),
      1
    ) * 1.12; // 12% de padding
  }, [rows]);

  const ROW_H   = 36;   // altura por linha
  const NAME_W  = 110;  // largura da coluna de nomes
  const BADGE_W = 64;   // largura da coluna de ROI
  const CHART_W = 340;  // largura da área de barras
  const ZERO_X  = NAME_W + CHART_W / 2; // posição do eixo zero
  const PAD_TOP = 28;   // espaço para labels dos ticks
  const H       = PAD_TOP + rows.length * ROW_H + 16;
  const W       = NAME_W + CHART_W + BADGE_W + 8;

  function toW(v: number) {
    return (Math.abs(v) / maxAbs) * (CHART_W / 2);
  }

  // Ticks do eixo X: 0 + 2 de cada lado
  const ticks = useMemo(() => {
    const steps = [-0.75, -0.375, 0, 0.375, 0.75];
    return steps.map((f) => ({
      val: f * maxAbs,
      x: ZERO_X + f * (CHART_W / 1),
    }));
  }, [maxAbs]);

  if (loading) return (
    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
      Carregando...
    </div>
  );

  if (!rows.length) return (
    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
      Sem dados no período
    </div>
  );

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", minWidth: 320 }}>

        {/* ── Ticks e labels do eixo X ── */}
        {ticks.map(({ val, x }, i) => (
          <g key={i}>
            <line
              x1={x} x2={x}
              y1={PAD_TOP - 6}
              y2={PAD_TOP + rows.length * ROW_H}
              stroke={val === 0
                ? "rgba(255,255,255,0.22)"
                : "rgba(255,255,255,0.06)"}
              strokeWidth={val === 0 ? 1.5 : 1}
              strokeDasharray={val === 0 ? "none" : "3 3"}
            />
            <text
              x={x} y={PAD_TOP - 8}
              textAnchor="middle"
              fill={val === 0 ? t.textMuted : "rgba(150,150,170,0.55)"}
              fontSize={8} fontFamily={FONT.body}
            >
              {val === 0 ? "0" : fmtK(val)}
            </text>
          </g>
        ))}

        {/* ── Label do eixo central ── */}
        <text
          x={ZERO_X} y={PAD_TOP - 18}
          textAnchor="middle"
          fill={t.textMuted} fontSize={9}
          fontFamily={FONT.body} letterSpacing="0.07em"
        >
          ← Negativo · Positivo →
        </text>

        {/* ── Linhas por influencer ── */}
        {rows.map((r, i) => {
          const y      = PAD_TOP + i * ROW_H;
          const barY   = y + ROW_H / 2 - 5;
          const barH   = 10;
          const invH   = 18; // altura do marcador de investimento

          // GGR
          const ggrW   = toW(r.ggr);
          const ggrX   = r.ggr >= 0 ? ZERO_X : ZERO_X - ggrW;
          const ggrCol = r.ggr >= 0 ? BRAND.verde : BRAND.vermelho;

          // Investimento — marcador vertical
          const invX   = ZERO_X + toW(r.investimento); // invest é sempre positivo
          const invY   = y + ROW_H / 2 - invH / 2;

          // Badge ROI
          const badge  = getRoiBadge(r.roi, r.ggr, r.investimento);
          const badgeX = NAME_W + CHART_W + 8;
          const badgeY = y + ROW_H / 2;

          return (
            <g key={r.nome}>
              {/* Fundo zebra */}
              {i % 2 === 0 && (
                <rect
                  x={0} y={y}
                  width={W} height={ROW_H}
                  fill="rgba(74,32,130,0.04)"
                />
              )}

              {/* Nome */}
              <text
                x={NAME_W - 8} y={y + ROW_H / 2 + 4}
                textAnchor="end"
                fill={t.text} fontSize={11}
                fontFamily={FONT.body} fontWeight={600}
              >
                {r.nome.split(" ")[0]}
              </text>

              {/* Trilho de fundo da barra */}
              <rect
                x={NAME_W} y={barY}
                width={CHART_W} height={barH}
                rx={4} fill="rgba(255,255,255,0.04)"
              />

              {/* Barra de GGR */}
              {ggrW > 0 && (
                <rect
                  x={ggrX} y={barY}
                  width={ggrW} height={barH}
                  rx={3}
                  fill={ggrCol} opacity={0.85}
                />
              )}

              {/* Marcador de Investimento — linha vertical com sombra */}
              {r.investimento > 0 && (
                <g>
                  {/* Sombra */}
                  <line
                    x1={invX + 1} x2={invX + 1}
                    y1={invY + 1} y2={invY + invH + 1}
                    stroke="rgba(0,0,0,0.4)" strokeWidth={2.5}
                  />
                  {/* Linha principal */}
                  <line
                    x1={invX} x2={invX}
                    y1={invY} y2={invY + invH}
                    stroke="#ffffff" strokeWidth={2}
                    strokeOpacity={0.9}
                  />
                  {/* Topo e base do marcador */}
                  <line x1={invX - 3} x2={invX + 3} y1={invY}        y2={invY}
                    stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.9} />
                  <line x1={invX - 3} x2={invX + 3} y1={invY + invH} y2={invY + invH}
                    stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.9} />
                </g>
              )}

              {/* Badge de ROI */}
              <text
                x={badgeX + BADGE_W / 2} y={badgeY + 4}
                textAnchor="middle"
                fill={badge.cor} fontSize={11}
                fontFamily={FONT.body} fontWeight={700}
              >
                {badge.label}
              </text>
            </g>
          );
        })}

        {/* ── Legenda ── */}
        <g transform={`translate(${NAME_W}, ${PAD_TOP + rows.length * ROW_H + 4})`}>
          {/* GGR positivo */}
          <rect x={0} y={0} width={10} height={8} rx={2} fill={BRAND.verde} opacity={0.85} />
          <text x={14} y={8} fill={t.textMuted} fontSize={9} fontFamily={FONT.body}>GGR positivo</text>
          {/* GGR negativo */}
          <rect x={90} y={0} width={10} height={8} rx={2} fill={BRAND.vermelho} opacity={0.85} />
          <text x={104} y={8} fill={t.textMuted} fontSize={9} fontFamily={FONT.body}>GGR negativo</text>
          {/* Marcador de investimento */}
          <line x1={190} x2={190} y1={0} y2={10} stroke="#ffffff" strokeWidth={2} strokeOpacity={0.85} />
          <line x1={187} x2={193} y1={0}  y2={0}  stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.85} />
          <line x1={187} x2={193} y1={10} y2={10} stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.85} />
          <text x={196} y={8} fill={t.textMuted} fontSize={9} fontFamily={FONT.body}>Investimento</text>
        </g>

      </svg>
    </div>
  );
}
