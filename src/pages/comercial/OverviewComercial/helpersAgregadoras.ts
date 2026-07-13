import {
  COMERCIAL_FILTRO_NENHUM,
  COMERCIAL_FILTRO_TODOS,
} from "../PipelineB2B/constants";
import { pipelineComercialCanonicoIds } from "../PipelineB2B/helpers";
import type { ComercialOpcao } from "../PipelineB2B/types";
import {
  STATUS_PIPELINE_AGREGADORA_COLOR,
  STATUS_PIPELINE_AGREGADORA_LABEL,
  STATUS_PIPELINE_AGREGADORA_ORDEM,
  type StatusPipelineAgregadora,
} from "../PipelineAgregadoras/constants";

export type OverviewAgregadoraRow = {
  id: string;
  nome: string;
  status_pipeline: StatusPipelineAgregadora;
  comercial_user_id: string | null;
  comercial_nome: string | null;
  jogos: number | null;
};

export type OverviewAgregadoraHistorico = {
  agregadora_id: string;
  agregadora_nome: string;
  campo: string;
  valor_novo: string | null;
};

export function filterOverviewAgregadoras(
  rows: OverviewAgregadoraRow[],
  comercialFiltro: string,
  comerciais: ComercialOpcao[],
): OverviewAgregadoraRow[] {
  const canonicalIds = pipelineComercialCanonicoIds(comerciais);
  if (comercialFiltro === COMERCIAL_FILTRO_NENHUM) {
    return rows.filter((r) => !r.comercial_user_id || !canonicalIds.has(r.comercial_user_id));
  }
  if (comercialFiltro !== COMERCIAL_FILTRO_TODOS) {
    return rows.filter((r) => r.comercial_user_id === comercialFiltro);
  }
  return rows;
}

export function countAgregadoraByStatus(
  rows: OverviewAgregadoraRow[],
  status: StatusPipelineAgregadora,
): number {
  return rows.filter((r) => r.status_pipeline === status).length;
}

export function agregadoraFunnelLevels(rows: OverviewAgregadoraRow[]) {
  return STATUS_PIPELINE_AGREGADORA_ORDEM.map((stage) => ({
    id: stage,
    label: STATUS_PIPELINE_AGREGADORA_LABEL[stage],
    count: countAgregadoraByStatus(rows, stage),
    color: STATUS_PIPELINE_AGREGADORA_COLOR[stage],
  }));
}

function taxa(from: number, to: number): number | null {
  if (from <= 0) return null;
  return (to / from) * 100;
}

export function agregadoraFunnelTaxas(rows: OverviewAgregadoraRow[]) {
  const c = Object.fromEntries(
    STATUS_PIPELINE_AGREGADORA_ORDEM.map((s) => [s, countAgregadoraByStatus(rows, s)]),
  ) as Record<StatusPipelineAgregadora, number>;
  return [
    {
      label: "Disponíveis → Conexão",
      taxa: taxa(c.disponiveis, c.conexao),
      color: STATUS_PIPELINE_AGREGADORA_COLOR.conexao,
    },
    {
      label: "Conexão → Negociação",
      taxa: taxa(c.conexao, c.negociacao),
      color: STATUS_PIPELINE_AGREGADORA_COLOR.negociacao,
    },
    {
      label: "Negociação → Fechado",
      taxa: taxa(c.negociacao, c.fechado),
      color: STATUS_PIPELINE_AGREGADORA_COLOR.fechado,
    },
    {
      label: "Disponíveis → Fechado",
      taxa: taxa(c.disponiveis, c.fechado),
      color: STATUS_PIPELINE_AGREGADORA_COLOR.fechado,
      highlight: true,
    },
  ];
}

/** “Produto” das agregadoras: volume por status (barras) — legado; preferir Dedicada/Network via marcas. */
export function agregadoraStatusBars(rows: OverviewAgregadoraRow[]) {
  return STATUS_PIPELINE_AGREGADORA_ORDEM.map((s) => ({
    key: s,
    label: STATUS_PIPELINE_AGREGADORA_LABEL[s],
    count: countAgregadoraByStatus(rows, s),
    color: STATUS_PIPELINE_AGREGADORA_COLOR[s],
  }));
}

/** Marcas do Pipeline B2B vinculadas às agregadoras filtradas (campo `agregadora` = nome). */
export function marcasVinculadasAgregadoras<T extends { agregadora: string | null }>(
  marcas: T[],
  agregadoras: OverviewAgregadoraRow[],
): T[] {
  const nomes = new Set(
    agregadoras.map((a) => a.nome.trim().toLowerCase()).filter(Boolean),
  );
  if (nomes.size === 0) return [];
  return marcas.filter((m) => {
    const n = m.agregadora?.trim().toLowerCase();
    return !!n && nomes.has(n);
  });
}

export function carteiraAgregadorasPorComercial(
  rows: OverviewAgregadoraRow[],
  comerciais: ComercialOpcao[],
): { label: string; userId: string | null; count: number }[] {
  const canonicalIds = pipelineComercialCanonicoIds(comerciais);
  const byId = new Map<string, number>();
  let nenhum = 0;
  for (const r of rows) {
    if (r.comercial_user_id && canonicalIds.has(r.comercial_user_id)) {
      byId.set(r.comercial_user_id, (byId.get(r.comercial_user_id) ?? 0) + 1);
    } else {
      nenhum += 1;
    }
  }
  const list: { label: string; userId: string | null; count: number }[] = comerciais
    .filter((c): c is ComercialOpcao & { id: string } => !!c.id)
    .map((c) => ({
      label: c.name,
      userId: c.id as string | null,
      count: byId.get(c.id) ?? 0,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  if (nenhum > 0) list.push({ label: "Nenhum", userId: null, count: nenhum });
  return list;
}

export function buildAgregadoraMovimentacao(historico: OverviewAgregadoraHistorico[]) {
  const conexao: string[] = [];
  const negociacao: string[] = [];
  const fechado: string[] = [];
  const total = new Set<string>();
  for (const h of historico) {
    total.add(h.agregadora_nome);
    if (h.campo !== "status_pipeline") continue;
    const v = (h.valor_novo ?? "").toLowerCase();
    if (v.includes("conex") || v === "conexao") conexao.push(h.agregadora_nome);
    if (v.includes("negoci") || v === "negociacao") negociacao.push(h.agregadora_nome);
    if (v.includes("fechado") || v === "fechado") fechado.push(h.agregadora_nome);
  }
  const uniq = (arr: string[]) => [...new Set(arr)];
  return {
    conexao: uniq(conexao),
    negociacao: uniq(negociacao),
    fechado: uniq(fechado),
    total: [...total],
  };
}
