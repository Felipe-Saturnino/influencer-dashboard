import type { InfluencerAnalyticsMetrica } from "./influencerAnalyticsQuery";
import { fmt } from "./dashboardHelpers";

export type AfiliadoTotais = {
  ggr: number;
  investimento: number;
  roi: number;
  ftds: number;
  ftd_total: number;
  registros: number;
  acessos: number;
  depositos_qtd: number;
  depositos_valor: number;
  saques_qtd: number;
  saques_valor: number;
  custoPorFTD: number;
  custoPorRegistro: number;
};

export type AfiliadoRankingRow = {
  afiliado_id: string;
  nome: string;
  acessos: number;
  registros: number;
  ftds: number;
  ftd_total: number;
  depositos_qtd: number;
  depositos_valor: number;
  saques_qtd: number;
  saques_valor: number;
  ggr: number;
  investimento: number;
  roi: number | null;
};

export type AfiliadoDiaRow = {
  data: string;
  afiliado_id?: string;
  nome?: string;
  acessos: number;
  registros: number;
  ftd_count: number;
  ftd_total: number;
  deposit_count: number;
  deposit_total: number;
  withdrawal_count: number;
  withdrawal_total: number;
  ggr: number;
};

export const AFILIADO_TOTAIS_ZERO: AfiliadoTotais = {
  ggr: 0,
  investimento: 0,
  roi: 0,
  ftds: 0,
  ftd_total: 0,
  registros: 0,
  acessos: 0,
  depositos_qtd: 0,
  depositos_valor: 0,
  saques_qtd: 0,
  saques_valor: 0,
  custoPorFTD: 0,
  custoPorRegistro: 0,
};

export function calcTotaisAfiliados(
  metricas: InfluencerAnalyticsMetrica[],
  investimentoPago: number,
): AfiliadoTotais {
  const ggr = metricas.reduce((s, x) => s + (x.ggr || 0), 0);
  const ftds = metricas.reduce((s, x) => s + (x.ftd_count || 0), 0);
  const ftd_total = metricas.reduce((s, x) => s + (x.ftd_total || 0), 0);
  const registros = metricas.reduce((s, x) => s + (x.registration_count || 0), 0);
  const acessos = metricas.reduce((s, x) => s + (x.visit_count || 0), 0);
  const depositos_qtd = metricas.reduce((s, x) => s + (x.deposit_count || 0), 0);
  const depositos_valor = metricas.reduce((s, x) => s + (x.deposit_total || 0), 0);
  const saques_qtd = metricas.reduce((s, x) => s + (x.withdrawal_count || 0), 0);
  const saques_valor = metricas.reduce((s, x) => s + (x.withdrawal_total || 0), 0);
  return {
    ggr,
    investimento: investimentoPago,
    roi: investimentoPago > 0 ? ((ggr - investimentoPago) / investimentoPago) * 100 : 0,
    ftds,
    ftd_total,
    registros,
    acessos,
    depositos_qtd,
    depositos_valor,
    saques_qtd,
    saques_valor,
    custoPorFTD: ftds > 0 ? investimentoPago / ftds : 0,
    custoPorRegistro: registros > 0 ? investimentoPago / registros : 0,
  };
}

export function montaRankingAfiliados(
  metricas: InfluencerAnalyticsMetrica[],
  porInvestimento: Record<string, number>,
  nomeById: Map<string, string>,
  afiliadoIdsEscopo: string[],
): AfiliadoRankingRow[] {
  const idSet = new Set(afiliadoIdsEscopo);
  const byId: Record<string, AfiliadoRankingRow> = {};

  for (const id of afiliadoIdsEscopo) {
    byId[id] = {
      afiliado_id: id,
      nome: nomeById.get(id) ?? "—",
      acessos: 0,
      registros: 0,
      ftds: 0,
      ftd_total: 0,
      depositos_qtd: 0,
      depositos_valor: 0,
      saques_qtd: 0,
      saques_valor: 0,
      ggr: 0,
      investimento: porInvestimento[id] ?? 0,
      roi: null,
    };
  }

  for (const m of metricas) {
    if (!idSet.has(m.influencer_id)) continue;
    const row = byId[m.influencer_id];
    if (!row) continue;
    row.acessos += m.visit_count || 0;
    row.registros += m.registration_count || 0;
    row.ftds += m.ftd_count || 0;
    row.ftd_total += m.ftd_total || 0;
    row.depositos_qtd += m.deposit_count || 0;
    row.depositos_valor += m.deposit_total || 0;
    row.saques_qtd += m.withdrawal_count || 0;
    row.saques_valor += m.withdrawal_total || 0;
    row.ggr += m.ggr || 0;
  }

  return Object.values(byId)
    .map((row) => {
      const invest = row.investimento;
      return {
        ...row,
        roi: invest > 0 ? ((row.ggr - invest) / invest) * 100 : null,
      };
    })
    .filter(
      (r) =>
        r.acessos > 0 ||
        r.registros > 0 ||
        r.ftds > 0 ||
        r.ggr !== 0 ||
        r.investimento > 0 ||
        r.depositos_qtd > 0 ||
        r.saques_qtd > 0,
    );
}

export function montaDetalheDiarioAfiliados(
  metricas: InfluencerAnalyticsMetrica[],
  ano: number,
  mes: number,
): AfiliadoDiaRow[] {
  const dias: Record<string, AfiliadoDiaRow> = {};
  for (
    let d = new Date(ano, mes, 1);
    d <= new Date(ano, mes + 1, 0);
    d.setDate(d.getDate() + 1)
  ) {
    const ds = fmt(d);
    dias[ds] = {
      data: ds,
      acessos: 0,
      registros: 0,
      ftd_count: 0,
      ftd_total: 0,
      deposit_count: 0,
      deposit_total: 0,
      withdrawal_count: 0,
      withdrawal_total: 0,
      ggr: 0,
    };
  }
  for (const m of metricas) {
    const row = dias[m.data];
    if (!row) continue;
    row.acessos += m.visit_count || 0;
    row.registros += m.registration_count || 0;
    row.ftd_count += m.ftd_count || 0;
    row.ftd_total += m.ftd_total || 0;
    row.deposit_count += m.deposit_count || 0;
    row.deposit_total += m.deposit_total || 0;
    row.withdrawal_count += m.withdrawal_count || 0;
    row.withdrawal_total += m.withdrawal_total || 0;
    row.ggr += m.ggr || 0;
  }
  return Object.values(dias).sort((a, b) => b.data.localeCompare(a.data));
}

export function montaDetalheMensalAfiliados(
  metricas: InfluencerAnalyticsMetrica[],
): AfiliadoDiaRow[] {
  const byYm: Record<string, AfiliadoDiaRow> = {};
  for (const m of metricas) {
    const ym = m.data.slice(0, 7);
    if (!byYm[ym]) {
      byYm[ym] = {
        data: `${ym}-01`,
        acessos: 0,
        registros: 0,
        ftd_count: 0,
        ftd_total: 0,
        deposit_count: 0,
        deposit_total: 0,
        withdrawal_count: 0,
        withdrawal_total: 0,
        ggr: 0,
      };
    }
    const row = byYm[ym];
    row.acessos += m.visit_count || 0;
    row.registros += m.registration_count || 0;
    row.ftd_count += m.ftd_count || 0;
    row.ftd_total += m.ftd_total || 0;
    row.deposit_count += m.deposit_count || 0;
    row.deposit_total += m.deposit_total || 0;
    row.withdrawal_count += m.withdrawal_count || 0;
    row.withdrawal_total += m.withdrawal_total || 0;
    row.ggr += m.ggr || 0;
  }
  return Object.values(byYm).sort((a, b) => b.data.localeCompare(a.data));
}

/** Detalhamento por afiliado (Overview Afiliado — tabela consolidada). */
export function montaDetalhePorAfiliado(
  metricas: InfluencerAnalyticsMetrica[],
  nomeById: Map<string, string>,
  afiliadoIdsEscopo: string[],
): AfiliadoDiaRow[] {
  const idSet = new Set(afiliadoIdsEscopo);
  const byId: Record<string, AfiliadoDiaRow> = {};
  for (const m of metricas) {
    if (!idSet.has(m.influencer_id)) continue;
    if (!byId[m.influencer_id]) {
      byId[m.influencer_id] = {
        data: "",
        afiliado_id: m.influencer_id,
        nome: nomeById.get(m.influencer_id) ?? "—",
        acessos: 0,
        registros: 0,
        ftd_count: 0,
        ftd_total: 0,
        deposit_count: 0,
        deposit_total: 0,
        withdrawal_count: 0,
        withdrawal_total: 0,
        ggr: 0,
      };
    }
    const row = byId[m.influencer_id];
    row.acessos += m.visit_count || 0;
    row.registros += m.registration_count || 0;
    row.ftd_count += m.ftd_count || 0;
    row.ftd_total += m.ftd_total || 0;
    row.deposit_count += m.deposit_count || 0;
    row.deposit_total += m.deposit_total || 0;
    row.withdrawal_count += m.withdrawal_count || 0;
    row.withdrawal_total += m.withdrawal_total || 0;
    row.ggr += m.ggr || 0;
  }
  return Object.values(byId);
}
