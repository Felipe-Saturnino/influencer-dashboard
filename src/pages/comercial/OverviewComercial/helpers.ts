import type { PipelineMarcaRow, ComercialOpcao } from "../PipelineB2B/types";
import {
  COMERCIAL_FILTRO_NENHUM,
  COMERCIAL_FILTRO_TODOS,
  PIPELINE_COLOR,
  STATUS_PRODUTO_ORDEM,
  STATUS_PRODUTO_LABEL,
  type StatusPipeline,
  type StatusProduto,
  type ProdutoTipo,
} from "../PipelineB2B/constants";
import {
  countByPipeline,
  pipelineComercialCanonicoIds,
  pipelineComercialExibeSiteOffline,
} from "../PipelineB2B/helpers";

export type OverviewMarcaRow = PipelineMarcaRow & { created_at: string | null };

export type OverviewPipelineFilter = StatusPipeline | "todos";

export const UF_FILTRO_TODAS = "todas";
export const UF_FILTRO_TODAS_LABEL = "Todas UFs";
export const UF_FILTRO_ARIA_LABEL = "UF";

export const UF_NOMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AM: "Amazonas",
  AP: "Amapá",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",
  PA: "Pará",
  PB: "Paraíba",
  PE: "Pernambuco",
  PI: "Piauí",
  PR: "Paraná",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RO: "Rondônia",
  RR: "Roraima",
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  SE: "Sergipe",
  SP: "São Paulo",
  TO: "Tocantins",
};

export function filterOverviewRows(
  rows: OverviewMarcaRow[],
  comercialFiltro: string,
  ufFiltro: string,
  pipelineFiltro: OverviewPipelineFilter,
  comerciais: ComercialOpcao[],
): OverviewMarcaRow[] {
  let list = rows;
  const canonicalIds = pipelineComercialCanonicoIds(comerciais);

  if (pipelineFiltro !== "todos") {
    list = list.filter((r) => r.status_pipeline === pipelineFiltro);
  }

  if (comercialFiltro === COMERCIAL_FILTRO_NENHUM) {
    list = list.filter(
      (r) => !r.comercial_user_id || !canonicalIds.has(r.comercial_user_id),
    );
  } else if (comercialFiltro !== COMERCIAL_FILTRO_TODOS) {
    list = list.filter((r) => r.comercial_user_id === comercialFiltro);
  }

  if (ufFiltro !== UF_FILTRO_TODAS) {
    list = list.filter((r) => (r.empresa.estado ?? "").toUpperCase() === ufFiltro);
  }

  return list;
}

export function countUniqueEmpresas(rows: OverviewMarcaRow[]): number {
  return new Set(rows.map((r) => r.empresa.id)).size;
}

export function countSiteAtivo(rows: OverviewMarcaRow[]): number {
  return rows.filter((r) => r.status_dominio === "ok").length;
}

export function countSemComercial(rows: OverviewMarcaRow[], comerciais: ComercialOpcao[]): number {
  const canonicalIds = pipelineComercialCanonicoIds(comerciais);
  return rows.filter(
    (r) =>
      !pipelineComercialExibeSiteOffline(r) &&
      (!r.comercial_user_id || !canonicalIds.has(r.comercial_user_id)),
  ).length;
}

export function pipelineFunnelCounts(rows: OverviewMarcaRow[]) {
  const stages: StatusPipeline[] = ["disponiveis", "conexao", "negociacao", "fechado"];
  return stages.map((s) => ({
    stage: s,
    count: countByPipeline(rows, s),
    color: PIPELINE_COLOR[s],
  }));
}

export function funnelConversionRates(counts: Record<StatusPipeline, number>) {
  const pct = (num: number, den: number) =>
    den > 0 ? `${((num / den) * 100).toFixed(1).replace(".", ",")}%` : "—";
  return {
    dispConexao: pct(counts.conexao, counts.disponiveis),
    conexNeg: pct(counts.negociacao, counts.conexao),
    negFech: pct(counts.fechado, counts.negociacao),
    dispFech: pct(counts.fechado, counts.disponiveis),
  };
}

export function countProdutoByStatus(
  rows: OverviewMarcaRow[],
  produto: ProdutoTipo,
): Record<StatusProduto, number> {
  const base = Object.fromEntries(
    STATUS_PRODUTO_ORDEM.map((s) => [s, 0]),
  ) as Record<StatusProduto, number>;
  for (const row of rows) {
    const p = row.produtos.find((x) => x.produto === produto);
    if (p?.status_produto) base[p.status_produto] += 1;
  }
  return base;
}

export function maxProdutoCount(counts: Record<StatusProduto, number>): number {
  return Math.max(1, ...Object.values(counts));
}

export function empresasPorUf(rows: OverviewMarcaRow[]): Map<string, { count: number; empresas: { id: string; razao: string }[] }> {
  const map = new Map<string, { count: number; empresas: Map<string, string> }>();
  for (const row of rows) {
    const uf = (row.empresa.estado ?? "").toUpperCase().trim();
    if (!uf || uf.length !== 2) continue;
    if (!map.has(uf)) map.set(uf, { count: 0, empresas: new Map() });
    const entry = map.get(uf)!;
    if (!entry.empresas.has(row.empresa.id)) {
      entry.empresas.set(row.empresa.id, row.empresa.razao_social);
      entry.count += 1;
    }
  }
  const out = new Map<string, { count: number; empresas: { id: string; razao: string }[] }>();
  for (const [uf, v] of map) {
    out.set(uf, {
      count: v.count,
      empresas: [...v.empresas.entries()].map(([id, razao]) => ({ id, razao })),
    });
  }
  return out;
}

export function carteiraPorComercial(
  rows: OverviewMarcaRow[],
  comerciais: ComercialOpcao[],
): { label: string; count: number; userId: string | null }[] {
  const counts = new Map<string, number>();
  let semOwner = 0;
  const canonicalIds = pipelineComercialCanonicoIds(comerciais);

  for (const row of rows) {
    if (
      pipelineComercialExibeSiteOffline(row) ||
      !row.comercial_user_id ||
      !canonicalIds.has(row.comercial_user_id)
    ) {
      semOwner += 1;
      continue;
    }
    const id = row.comercial_user_id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const list = comerciais
    .filter((c) => c.id)
    .map((c) => ({ label: c.name, count: counts.get(c.id!) ?? 0, userId: c.id }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  if (semOwner > 0) {
    list.push({ label: "Nenhum", count: semOwner, userId: null });
  }
  return list;
}

export type AlertaPrioridade = {
  tipo: string;
  tipoCor: string;
  marca: string;
  empresa: string;
  uf: string;
  comercial: string;
  motivo: string;
};

export function buildAlertasPrioridade(
  rows: OverviewMarcaRow[],
  comerciais: ComercialOpcao[],
  limit = 15,
): AlertaPrioridade[] {
  const out: AlertaPrioridade[] = [];
  const canonicalIds = pipelineComercialCanonicoIds(comerciais);
  const comercialNome = (row: OverviewMarcaRow) => {
    if (pipelineComercialExibeSiteOffline(row)) return "Site Offline";
    if (!row.comercial_user_id) return "—";
    return (
      row.comercial_nome ??
      comerciais.find((c) => c.id === row.comercial_user_id)?.name ??
      "—"
    );
  };

  for (const row of rows) {
    if (row.contatos.length === 0) {
      out.push({
        tipo: "Sem contato",
        tipoCor: "#e84025",
        marca: row.nome,
        empresa: row.empresa.razao_social,
        uf: row.empresa.estado ?? "—",
        comercial: comercialNome(row),
        motivo: "0 contatos cadastrados",
      });
    }
    if (row.status_dominio === "inativo") {
      out.push({
        tipo: "Site offline",
        tipoCor: "#f59e0b",
        marca: row.nome,
        empresa: row.empresa.razao_social,
        uf: row.empresa.estado ?? "—",
        comercial: comercialNome(row),
        motivo: "Domínio inativo",
      });
    }
    if (
      row.status_dominio === "ok" &&
      (!row.comercial_user_id || !canonicalIds.has(row.comercial_user_id))
    ) {
      out.push({
        tipo: "Sem comercial",
        tipoCor: "#6b7280",
        marca: row.nome,
        empresa: row.empresa.razao_social,
        uf: row.empresa.estado ?? "—",
        comercial: "—",
        motivo: "Domínio OK, sem owner",
      });
    }
    const temContratoEnviado = row.produtos.some((p) => p.status_produto === "contrato_enviado");
    if (temContratoEnviado) {
      out.push({
        tipo: "Oportunidade",
        tipoCor: "#1e36f8",
        marca: row.nome,
        empresa: row.empresa.razao_social,
        uf: row.empresa.estado ?? "—",
        comercial: comercialNome(row),
        motivo: "Contrato enviado",
      });
    }
  }

  return out.slice(0, limit);
}

export type NovaMarcaItem = {
  id: string;
  nome: string;
  empresa: string;
  uf: string;
  created_at: string;
  comercial: string;
  statusLabel: string;
  statusCor: string;
};

export function buildNovasMarcas(
  rows: OverviewMarcaRow[],
  comerciais: ComercialOpcao[],
  dias = 30,
): NovaMarcaItem[] {
  const cutoff = Date.now() - dias * 24 * 60 * 60 * 1000;
  return rows
    .filter((r) => r.created_at && new Date(r.created_at).getTime() >= cutoff)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 8)
    .map((r) => {
      const ativo = r.produtos.some((p) => p.status_produto === "ativo");
      const comercial =
        r.comercial_nome ??
        comerciais.find((c) => c.id === r.comercial_user_id)?.name ??
        "—";
      return {
        id: r.id,
        nome: r.nome,
        empresa: r.empresa.razao_social,
        uf: r.empresa.estado ?? "—",
        created_at: r.created_at!,
        comercial,
        statusLabel: ativo ? "Ativo" : r.status_pipeline === "fechado" ? "Fechado" : "Pendente",
        statusCor: ativo ? "#22c55e" : r.status_pipeline === "fechado" ? "#22c55e" : "#f59e0b",
      };
    });
}

export function formatDataBr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export { STATUS_PRODUTO_LABEL };
