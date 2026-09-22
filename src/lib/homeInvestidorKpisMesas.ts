export type RelatorioDailySummaryRow = {
  data: string;
  turnover: number | null;
  ggr: number | null;
  apostas: number | null;
  operadora_slug: string;
};

export type HomeKpiCanalLinha = {
  canal: "dedicado" | "network";
  label: string;
  turnover: number;
  ggr: number;
  apostas: number;
};

export type HomeKpisMesasAgregado = {
  totals: { turnover: number; ggr: number; apostas: number };
  porCanal: HomeKpiCanalLinha[];
};

function somarRows(rows: RelatorioDailySummaryRow[]): {
  turnover: number;
  ggr: number;
  apostas: number;
} {
  let turnover = 0;
  let ggr = 0;
  let apostas = 0;
  for (const r of rows) {
    turnover += Number(r.turnover ?? 0);
    ggr += Number(r.ggr ?? 0);
    apostas += Number(r.apostas ?? 0);
  }
  return { turnover, ggr, apostas };
}

/** Totais MTD = Dedicado + Network; detalhe dos cards = as duas linhas de canal. */
export function aggregateHomeKpisMesasPorCanal(
  dedicado: RelatorioDailySummaryRow[],
  network: RelatorioDailySummaryRow[],
): HomeKpisMesasAgregado {
  const ded = somarRows(dedicado);
  const net = somarRows(network);
  return {
    totals: {
      turnover: ded.turnover + net.turnover,
      ggr: ded.ggr + net.ggr,
      apostas: ded.apostas + net.apostas,
    },
    porCanal: [
      { canal: "dedicado", label: "Dedicada", ...ded },
      { canal: "network", label: "Network", ...net },
    ],
  };
}
