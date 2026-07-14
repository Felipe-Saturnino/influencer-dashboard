/**
 * Canal de dados financeiros do Overview Spin.
 * Dedicado / Network = tabelas próprias; consolidado = soma dos dois canais.
 */

export type OverviewSpinCanal = "consolidado" | "dedicado" | "network";

export const RELATORIO_TABELAS_DEDICADO = {
  daily: "relatorio_daily_summary",
  monthly: "relatorio_monthly_summary",
  porTabela: "relatorio_por_tabela",
  uapJogo: "relatorio_uap_por_jogo",
} as const;

export const RELATORIO_TABELAS_NETWORK = {
  daily: "relatorio_network_daily_summary",
  monthly: "relatorio_network_monthly_summary",
  porTabela: "relatorio_network_por_tabela",
  uapJogo: "relatorio_network_uap_por_jogo",
} as const;

export type RelatorioTabelasCanal = {
  daily: string;
  monthly: string;
  porTabela: string;
  uapJogo: string;
};

export function tabelasRelatorioDoCanal(canal: "dedicado" | "network"): RelatorioTabelasCanal {
  return canal === "network" ? RELATORIO_TABELAS_NETWORK : RELATORIO_TABELAS_DEDICADO;
}

/** Soma financeira + UAP por (data, operadora_slug) entre canais Dedicado e Network. */
export function mergeDailyRawEntreCanais(
  a: Array<{
    data: string;
    turnover: number | null;
    ggr: number | null;
    apostas: number | null;
    uap: number | null;
    operadora_slug: string;
  }>,
  b: Array<{
    data: string;
    turnover: number | null;
    ggr: number | null;
    apostas: number | null;
    uap: number | null;
    operadora_slug: string;
  }>,
): Array<{
  data: string;
  turnover: number | null;
  ggr: number | null;
  apostas: number | null;
  uap: number | null;
  operadora_slug: string;
}> {
  const key = (d: string, slug: string) => `${String(d).slice(0, 10)}|${slug}`;
  const map = new Map<
    string,
    {
      data: string;
      turnover: number | null;
      ggr: number | null;
      apostas: number | null;
      uap: number | null;
      operadora_slug: string;
      hasT: boolean;
      hasG: boolean;
      hasB: boolean;
      hasU: boolean;
    }
  >();

  const fold = (
    rows: Array<{
      data: string;
      turnover: number | null;
      ggr: number | null;
      apostas: number | null;
      uap: number | null;
      operadora_slug: string;
    }>,
  ) => {
    for (const r of rows) {
      const data = String(r.data).slice(0, 10);
      const k = key(data, r.operadora_slug);
      const cur = map.get(k);
      if (!cur) {
        map.set(k, {
          data,
          operadora_slug: r.operadora_slug,
          turnover: r.turnover != null ? Number(r.turnover) : null,
          ggr: r.ggr != null ? Number(r.ggr) : null,
          apostas: r.apostas != null ? Number(r.apostas) : null,
          uap: r.uap != null ? Number(r.uap) : null,
          hasT: r.turnover != null,
          hasG: r.ggr != null,
          hasB: r.apostas != null,
          hasU: r.uap != null,
        });
        continue;
      }
      if (r.turnover != null) {
        cur.turnover = (cur.turnover ?? 0) + Number(r.turnover);
        cur.hasT = true;
      }
      if (r.ggr != null) {
        cur.ggr = (cur.ggr ?? 0) + Number(r.ggr);
        cur.hasG = true;
      }
      if (r.apostas != null) {
        cur.apostas = (cur.apostas ?? 0) + Number(r.apostas);
        cur.hasB = true;
      }
      if (r.uap != null) {
        cur.uap = (cur.uap ?? 0) + Number(r.uap);
        cur.hasU = true;
      }
    }
  };

  fold(a);
  fold(b);

  return [...map.values()].map((x) => ({
    data: x.data,
    operadora_slug: x.operadora_slug,
    turnover: x.hasT ? x.turnover : null,
    ggr: x.hasG ? x.ggr : null,
    apostas: x.hasB ? x.apostas : null,
    /** Soma de UAP por canal (não é UAP único entre Dedicado e Network). */
    uap: x.hasU ? x.uap : null,
  }));
}

/** Soma UAP/ARPU mensal por (mes, operadora_slug). ARPU ponderado por UAP quando ambos os canais têm valor. */
export function mergeMonthlyRawEntreCanais(
  a: Array<{ mes: string; uap: number | null; arpu: number | null; operadora_slug: string }>,
  b: Array<{ mes: string; uap: number | null; arpu: number | null; operadora_slug: string }>,
): Array<{ mes: string; uap: number | null; arpu: number | null; operadora_slug: string }> {
  const key = (m: string, slug: string) => `${String(m).slice(0, 10)}|${slug}`;
  type Acc = {
    mes: string;
    operadora_slug: string;
    uap: number;
    ggrProxy: number;
    hasUap: boolean;
    hasArpu: boolean;
  };
  const map = new Map<string, Acc>();

  const fold = (
    rows: Array<{ mes: string; uap: number | null; arpu: number | null; operadora_slug: string }>,
  ) => {
    for (const r of rows) {
      const mes = String(r.mes).slice(0, 10);
      const k = key(mes, r.operadora_slug);
      const u = r.uap != null ? Number(r.uap) : null;
      const arpu = r.arpu != null ? Number(r.arpu) : null;
      const cur = map.get(k);
      if (!cur) {
        map.set(k, {
          mes,
          operadora_slug: r.operadora_slug,
          uap: u ?? 0,
          ggrProxy: u != null && arpu != null ? u * arpu : 0,
          hasUap: u != null,
          hasArpu: u != null && arpu != null,
        });
        continue;
      }
      if (u != null) {
        cur.uap += u;
        cur.hasUap = true;
        if (arpu != null) {
          cur.ggrProxy += u * arpu;
          cur.hasArpu = true;
        }
      }
    }
  };

  fold(a);
  fold(b);

  return [...map.values()].map((x) => ({
    mes: x.mes,
    operadora_slug: x.operadora_slug,
    uap: x.hasUap ? x.uap : null,
    arpu: x.hasArpu && x.uap > 0 ? x.ggrProxy / x.uap : null,
  }));
}

/** Soma UAP por (data, jogo, operadora_slug) entre canais. */
export function mergeUapRawEntreCanais(
  a: Array<{ data: string; jogo: string; uap: number; operadora_slug: string }>,
  b: Array<{ data: string; jogo: string; uap: number; operadora_slug: string }>,
): Array<{ data: string; jogo: string; uap: number; operadora_slug: string }> {
  const map = new Map<string, { data: string; jogo: string; uap: number; operadora_slug: string }>();
  for (const r of [...a, ...b]) {
    const data = String(r.data).slice(0, 10);
    const k = `${data}|${r.jogo}|${r.operadora_slug}`;
    const cur = map.get(k);
    if (!cur) {
      map.set(k, { data, jogo: r.jogo, uap: Number(r.uap), operadora_slug: r.operadora_slug });
    } else {
      cur.uap += Number(r.uap);
    }
  }
  return [...map.values()];
}
