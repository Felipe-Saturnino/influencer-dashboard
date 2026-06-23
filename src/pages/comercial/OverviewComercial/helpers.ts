import type { PipelineMarcaRow, ComercialOpcao } from "../PipelineB2B/types";
import {
  COMERCIAL_FILTRO_NENHUM,
  COMERCIAL_FILTRO_TODOS,
  PIPELINE_COLOR,
  PIPELINE_TAB_LABEL,
  STATUS_PRODUTO_ORDEM,
  STATUS_PRODUTO_LABEL,
  STATUS_PRODUTO_LINHA_SEM_INTERESSE,
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
export const UF_FILTRO_TODAS_LABEL = "Todos Estados";
export const UF_FILTRO_ARIA_LABEL = "Estados";

/** Corte pontual — exclui legado do import em massa anterior a 20/06/2026. */
export const NOVAS_MARCAS_DESDE_ISO = "2026-06-20T00:00:00.000-03:00";

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

export const UF_FILTRO_OPTIONS = Object.keys(UF_NOMES)
  .sort((a, b) => UF_NOMES[a].localeCompare(UF_NOMES[b], "pt-BR"))
  .map((uf) => ({ value: uf, label: `${uf} — ${UF_NOMES[uf]}` }));

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

export function pipelineFunnelCounts(rows: OverviewMarcaRow[]) {
  const stages: StatusPipeline[] = ["disponiveis", "conexao", "negociacao", "fechado"];
  return stages.map((s) => ({
    stage: s,
    label: PIPELINE_TAB_LABEL[s],
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

export type ProdutoStatusCounts = Record<StatusProduto, number> & { sem_status: number };

export function countProdutoByStatus(
  rows: OverviewMarcaRow[],
  produto: ProdutoTipo,
): ProdutoStatusCounts {
  const base = Object.fromEntries(
    STATUS_PRODUTO_ORDEM.map((s) => [s, 0]),
  ) as Record<StatusProduto, number>;
  let semStatus = 0;
  for (const row of rows) {
    const p = row.produtos.find((x) => x.produto === produto);
    if (!p?.status_produto) {
      semStatus += 1;
    } else {
      base[p.status_produto] += 1;
    }
  }
  return { ...base, sem_status: semStatus };
}

export function maxProdutoCount(counts: ProdutoStatusCounts): number {
  return Math.max(1, ...Object.values(counts));
}

export type GeoMarcaItem = {
  id: string;
  nome: string;
  empresa: string;
  cidade: string;
};

export type GeoUfEntry = {
  count: number;
  marcas: GeoMarcaItem[];
};

export function groupMarcasPorCidade(marcas: GeoMarcaItem[]): { cidade: string; marcas: GeoMarcaItem[] }[] {
  const map = new Map<string, GeoMarcaItem[]>();
  for (const m of marcas) {
    const key = m.cidade.trim() || "Sem cidade cadastrada";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return [...map.entries()]
    .map(([cidade, items]) => ({
      cidade,
      marcas: [...items].sort((a, b) => {
        const byEmpresa = a.empresa.localeCompare(b.empresa, "pt-BR");
        if (byEmpresa !== 0) return byEmpresa;
        return a.nome.localeCompare(b.nome, "pt-BR");
      }),
    }))
    .sort((a, b) => {
      const byCount = b.marcas.length - a.marcas.length;
      if (byCount !== 0) return byCount;
      return a.cidade.localeCompare(b.cidade, "pt-BR");
    });
}

export function marcasPorUf(rows: OverviewMarcaRow[]): Map<string, GeoUfEntry> {
  const map = new Map<string, GeoMarcaItem[]>();
  for (const row of rows) {
    const uf = (row.empresa.estado ?? "").toUpperCase().trim();
    if (!uf || uf.length !== 2) continue;
    if (!map.has(uf)) map.set(uf, []);
    map.get(uf)!.push({
      id: row.id,
      nome: row.nome,
      empresa: row.empresa.razao_social,
      cidade: (row.empresa.cidade ?? "").trim(),
    });
  }
  const out = new Map<string, GeoUfEntry>();
  for (const [uf, marcas] of map) {
    const sorted = marcas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    out.set(uf, { count: sorted.length, marcas: sorted });
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
): NovaMarcaItem[] {
  const cutoff = new Date(NOVAS_MARCAS_DESDE_ISO).getTime();
  return rows
    .filter((r) => r.created_at && new Date(r.created_at).getTime() >= cutoff)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 8)
    .map((r) => {
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
        statusLabel: PIPELINE_TAB_LABEL[r.status_pipeline],
        statusCor: PIPELINE_COLOR[r.status_pipeline],
      };
    });
}

export type HistoricoOverviewRow = {
  marca_id: string;
  marca_nome: string;
  campo: string;
  valor_novo: string | null;
};

export type MovimentacaoDetalhe = {
  negociacao: string[];
  fechado: string[];
  semInteresse: string[];
  total: string[];
};

export function buildMovimentacaoDetalhe(
  historico: HistoricoOverviewRow[],
  marcaIds: Set<string>,
): MovimentacaoDetalhe {
  const neg: string[] = [];
  const fech: string[] = [];
  const sem: string[] = [];
  const total = new Set<string>();

  for (const h of historico) {
    if (!marcaIds.has(h.marca_id)) continue;
    total.add(h.marca_nome);
    if (h.campo === "status_pipeline" && h.valor_novo === "negociacao") neg.push(h.marca_nome);
    if (h.campo === "status_pipeline" && h.valor_novo === "fechado") fech.push(h.marca_nome);
    if (
      h.campo === "status_produto" &&
      STATUS_PRODUTO_LINHA_SEM_INTERESSE.includes(h.valor_novo as StatusProduto)
    ) {
      sem.push(h.marca_nome);
    }
  }

  const uniq = (arr: string[]) => [...new Set(arr)].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return {
    negociacao: uniq(neg),
    fechado: uniq(fech),
    semInteresse: uniq(sem),
    total: [...total].sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}

export function formatDataBr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export { STATUS_PRODUTO_LABEL };
