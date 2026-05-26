import type { RelatorioDailySummaryRow } from "./homeInvestidorKpisMesas";

export type HomeKpiTotais = {
  ggr: number;
  turnover: number;
  apostas: number;
};

export function somarKpisMesasMtd(rows: RelatorioDailySummaryRow[], operadoraSlugs: string[]): HomeKpiTotais {
  const slugs = new Set(operadoraSlugs);
  const empty = { ggr: 0, turnover: 0, apostas: 0 };
  if (slugs.size === 0) return empty;

  let ggr = 0;
  let turnover = 0;
  let apostas = 0;
  for (const r of rows) {
    const slug = String(r.operadora_slug ?? "").trim();
    if (!slugs.has(slug)) continue;
    ggr += Number(r.ggr ?? 0);
    turnover += Number(r.turnover ?? 0);
    apostas += Number(r.apostas ?? 0);
  }
  return { ggr, turnover, apostas };
}

export function fmtVariacaoPctVsAnterior(
  atual: number,
  anterior: number,
): { pctLabel: string; up: boolean } | null {
  const diff = atual - anterior;
  if (anterior === 0 && atual === 0) return null;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up = diff >= 0;
  return {
    pctLabel: pct !== null ? `${Math.abs(pct).toFixed(0)}%` : "—",
    up,
  };
}
