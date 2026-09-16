import { supabase } from "../../../lib/supabase";
import { fetchAllPages, fetchInBatched } from "../../../lib/supabasePaginate";
import { buscarInvestimentoPago } from "../../../lib/investimentoPago";
import { getPeriodoHistoricoCompetencias } from "../../../lib/dashboardHelpers";
import { periodoDoMes, podeVerPagamentosAgenteFinanceiro } from "./financeiroCiclos";
import type { BlocoFiltros } from "./financeiroFiltros";
import {
  CICLO_IN_CHUNK,
  PAGAMENTO_AGENTE_COLS,
  PAGAMENTO_COLS,
} from "./financeiroTypes";
import type {
  FinanceiroAgenteDbRow,
  FinanceiroPagamentoDbRow,
  FinanceiroPerfilRow,
} from "./financeiroTypes";

export interface FinanceiroKpiMes {
  totalPago: number;
  pendente: number;
  horas: number;
}

export interface FinanceiroConsolidadoRow {
  influencer_id: string;
  nome_artistico: string;
  email: string;
  totalPago: number;
  totalHoras: number;
  pendente: number;
  ultimoPagamento: string | null;
  statusInfluencer: string;
}

export interface FinanceiroAgentesConsolidadoRow {
  totalPago: number;
  pendente: number;
  ultimoPagamento: string | null;
}

export interface FinanceiroMesData {
  kpis: FinanceiroKpiMes;
  consolidadoRows: FinanceiroConsolidadoRow[];
  agentesRow: FinanceiroAgentesConsolidadoRow | null;
}

export interface FinanceiroMesLoadParams {
  filtros: BlocoFiltros;
  userRole: string | undefined;
  podeVerInfluencer: (id: string) => boolean;
  /** Vem dos catálogos — a lista de profiles é carregada uma vez só por página. */
  emailMap: Record<string, string>;
}

function filtrarPagamentos(
  pags: FinanceiroPagamentoDbRow[],
  filtros: BlocoFiltros,
  podeVerInfluencer: (id: string) => boolean,
): FinanceiroPagamentoDbRow[] {
  const { filterInfluencers, filterOperadora, filtroOp } = filtros;
  let out = pags.filter((p) => podeVerInfluencer(p.influencer_id));
  if (filterInfluencers.length > 0) {
    out = out.filter((p) => filterInfluencers.includes(p.influencer_id));
  }
  if (filtroOp?.length) {
    out = out.filter((p) => p.operadora_slug && filtroOp.includes(p.operadora_slug));
  } else if (filterOperadora && filterOperadora !== "todas") {
    out = out.filter((p) => p.operadora_slug === filterOperadora);
  }
  return out;
}

function filtrarAgentes(
  agentes: FinanceiroAgenteDbRow[],
  filtros: BlocoFiltros,
): FinanceiroAgenteDbRow[] {
  const { filterOperadora, filtroOp } = filtros;
  let out = agentes;
  if (filtroOp?.length) {
    out = out.filter((a) => a.operadora_slug && filtroOp.includes(a.operadora_slug));
  } else if (filterOperadora && filterOperadora !== "todas") {
    out = out.filter((a) => a.operadora_slug === filterOperadora);
  }
  return out;
}

function computeKpis(
  pags: FinanceiroPagamentoDbRow[],
  agentes: FinanceiroAgenteDbRow[],
  totalPagoRpc: number | null,
  periodo: { inicio: string; fim: string } | null,
): FinanceiroKpiMes {
  const pagosInf = pags.filter((p) => p.status === "pago");
  const pagosAg = agentes.filter((a) => a.status === "pago");
  const pendInf = pags.filter((p) => p.status === "em_analise" || p.status === "a_pagar");
  const pendAg = agentes.filter((a) => a.status === "em_analise" || a.status === "a_pagar");

  const totalPago =
    periodo && totalPagoRpc !== null
      ? totalPagoRpc
      : [...pagosInf, ...pagosAg].reduce((acc, x) => acc + x.total, 0);

  return {
    totalPago,
    pendente: [...pendInf, ...pendAg].reduce((acc, x) => acc + x.total, 0),
    horas: pags.reduce((acc, p) => acc + p.horas_realizadas, 0),
  };
}

function computeConsolidado(
  perfisFiltrados: FinanceiroPerfilRow[],
  emailMap: Record<string, string>,
  pagamentosData: FinanceiroPagamentoDbRow[],
  agentesData: FinanceiroAgenteDbRow[],
  incluirAgentes: boolean,
): { rows: FinanceiroConsolidadoRow[]; agentesRow: FinanceiroAgentesConsolidadoRow | null } {
  const agtPagos = agentesData.filter((a) => a.status === "pago");
  const agtPendentes = agentesData.filter((a) => a.status === "em_analise" || a.status === "a_pagar");
  const agtTotalPago = agtPagos.reduce((a, x) => a + x.total, 0);
  const agtPendente = agtPendentes.reduce((a, x) => a + x.total, 0);
  const agtUltimoPag =
    agtPagos.sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""))[0]?.pago_em ?? null;

  const rows: FinanceiroConsolidadoRow[] = perfisFiltrados
    .map((perf) => {
      const pags = pagamentosData.filter((p) => p.influencer_id === perf.id);
      const pagos = pags.filter((p) => p.status === "pago");
      const pendentes = pags.filter((p) => p.status === "em_analise" || p.status === "a_pagar");
      const totalPago = pagos.reduce((a, p) => a + p.total, 0);
      const totalHoras = pags.reduce((a, p) => a + p.horas_realizadas, 0);
      const pendente = pendentes.reduce((a, p) => a + p.total, 0);
      const ultimoPag =
        pagos.sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""))[0]?.pago_em ?? null;
      return {
        influencer_id: perf.id,
        nome_artistico: perf.nome_artistico ?? emailMap[perf.id] ?? perf.id,
        email: emailMap[perf.id] ?? "",
        totalPago,
        totalHoras,
        pendente,
        ultimoPagamento: ultimoPag,
        statusInfluencer: perf.status ?? "ativo",
      };
    })
    .filter((r) => r.totalPago > 0 || r.totalHoras > 0 || r.pendente > 0);

  const agentesRow =
    incluirAgentes && (agtTotalPago > 0 || agtPendente > 0)
      ? { totalPago: agtTotalPago, pendente: agtPendente, ultimoPagamento: agtUltimoPag }
      : null;

  return { rows, agentesRow };
}

/** Carga unificada de KPIs + Consolidado para o período/filtros atuais (uma ida à rede). */
export async function loadFinanceiroMesData({
  filtros,
  userRole,
  podeVerInfluencer,
  emailMap,
}: FinanceiroMesLoadParams): Promise<FinanceiroMesData> {
  const { filterInfluencers, filterOperadora, filtroOp, mesFiltro, historico } = filtros;
  /** Sem mês selecionado, a janela é a das 13 competências — nunca consulta all-time. */
  const periodo = historico
    ? getPeriodoHistoricoCompetencias()
    : (periodoDoMes(mesFiltro) ?? getPeriodoHistoricoCompetencias());
  const incluirAgentes = podeVerPagamentosAgenteFinanceiro(userRole);

  const { data: ciclos } = await supabase
    .from("ciclos_pagamento")
    .select("id")
    .gte("data_fim", periodo.inicio)
    .lte("data_fim", periodo.fim);
  const cicloIds = (ciclos ?? []).map((c: { id: string }) => c.id);
  if (cicloIds.length === 0) {
    return {
      kpis: { totalPago: 0, pendente: 0, horas: 0 },
      consolidadoRows: [],
      agentesRow: null,
    };
  }

  const pQuery = fetchInBatched<FinanceiroPagamentoDbRow>(cicloIds, CICLO_IN_CHUNK, async (slice) => {
    const { data, error } = await supabase.from("pagamentos").select(PAGAMENTO_COLS).in("ciclo_id", slice);
    if (error) throw new Error(error.message);
    return (data ?? []) as FinanceiroPagamentoDbRow[];
  });

  const aQuery = incluirAgentes
    ? fetchInBatched<FinanceiroAgenteDbRow>(cicloIds, CICLO_IN_CHUNK, async (slice) => {
        const { data, error } = await supabase
          .from("pagamentos_agentes")
          .select(PAGAMENTO_AGENTE_COLS)
          .in("ciclo_id", slice);
        if (error) throw new Error(error.message);
        return (data ?? []) as FinanceiroAgenteDbRow[];
      })
    : Promise.resolve([] as FinanceiroAgenteDbRow[]);

  const investimentoPagoPromise = periodo
    ? buscarInvestimentoPago(periodo, {
        influencerIds: filterInfluencers.length > 0 ? filterInfluencers : undefined,
        operadora_slug: filtroOp?.length
          ? filtroOp[0]
          : filterOperadora !== "todas"
            ? filterOperadora
            : undefined,
        includeAgentes: incluirAgentes,
      }).then((r) => r.total)
    : Promise.resolve(null);

  const [perfis, pags, agentes, totalPagoRpc] = await Promise.all([
    fetchAllPages<FinanceiroPerfilRow>(async (from, to) =>
      await supabase
        .from("influencer_perfil")
        .select("id, nome_artistico, status")
        .order("nome_artistico")
        .range(from, to),
    ),
    pQuery,
    aQuery,
    investimentoPagoPromise,
  ]);

  let perfisFiltrados = perfis.filter((p) => podeVerInfluencer(p.id));
  if (filterInfluencers.length > 0) {
    perfisFiltrados = perfisFiltrados.filter((p) => filterInfluencers.includes(p.id));
  }

  const pagamentosData = filtrarPagamentos(pags, filtros, podeVerInfluencer);
  const agentesData = incluirAgentes ? filtrarAgentes(agentes, filtros) : [];

  if (filtroOp?.length) {
    const infIdsComPag = [...new Set(pagamentosData.map((p) => p.influencer_id))];
    perfisFiltrados = perfisFiltrados.filter((p) => infIdsComPag.includes(p.id));
  } else if (filterOperadora && filterOperadora !== "todas") {
    const infIdsComPag = [...new Set(pagamentosData.map((p) => p.influencer_id))];
    perfisFiltrados = perfisFiltrados.filter((p) => infIdsComPag.includes(p.id));
  }

  const kpis = computeKpis(pagamentosData, agentesData, totalPagoRpc, periodo);
  const { rows, agentesRow } = computeConsolidado(
    perfisFiltrados,
    emailMap,
    pagamentosData,
    agentesData,
    incluirAgentes,
  );

  return { kpis, consolidadoRows: rows, agentesRow };
}
