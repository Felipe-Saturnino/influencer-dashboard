export type RelatorioDailySummaryRow = {
  data: string;
  turnover: number | null;
  ggr: number | null;
  apostas: number | null;
  operadora_slug: string;
};

export type HomeKpiOperadoraLinha = {
  slug: string;
  nome: string;
  turnover: number;
  ggr: number;
  apostas: number;
};

export type HomeKpisMesasAgregado = {
  totals: { turnover: number; ggr: number; apostas: number };
  porOperadora: HomeKpiOperadoraLinha[];
};

export function aggregateHomeKpisMesasMtd(
  rows: RelatorioDailySummaryRow[],
  slugToNome: Map<string, string>,
): HomeKpisMesasAgregado {
  const bySlug = new Map<string, { turnover: number; ggr: number; apostas: number }>();

  for (const r of rows) {
    const slug = String(r.operadora_slug ?? "").trim();
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, { turnover: 0, ggr: 0, apostas: 0 });
    const acc = bySlug.get(slug)!;
    acc.turnover += Number(r.turnover ?? 0);
    acc.ggr += Number(r.ggr ?? 0);
    acc.apostas += Number(r.apostas ?? 0);
  }

  const totals = { turnover: 0, ggr: 0, apostas: 0 };
  for (const v of bySlug.values()) {
    totals.turnover += v.turnover;
    totals.ggr += v.ggr;
    totals.apostas += v.apostas;
  }

  const porOperadora = [...bySlug.entries()]
    .map(([slug, v]) => ({
      slug,
      nome: slugToNome.get(slug) ?? slug,
      ...v,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { totals, porOperadora };
}
