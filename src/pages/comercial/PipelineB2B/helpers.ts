import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import type { SortDir } from "../../../components/dashboard";
import {
  STATUS_FOLHA_LABEL,
  STATUS_PIPELINE_LABEL,
  STATUS_PRODUTO_LABEL,
  COMERCIAL_FILTRO_NENHUM,
  COMERCIAL_FILTRO_NENHUM_LABEL,
  COMERCIAL_FILTRO_TODOS,
  PIPELINE_COMERCIAL_NOMES,
  PIPELINE_COMERCIAL_SITE_OFFLINE_LABEL,
  type PipelineTab,
  type StatusFolha,
  type StatusPipeline,
  type StatusProduto,
  type TableCol,
  type ProdutoTipo,
  TAB_TABLE_CONFIG,
  FOLHA_BY_PIPELINE,
} from "./constants";
import type { ComercialContato, ComercialOpcao, PipelineMarcaRow } from "./types";

export function buildPipelineComerciais(
  profiles: { id: string; name: string }[],
): ComercialOpcao[] {
  const byName = new Map(profiles.map((p) => [p.name, p]));
  return PIPELINE_COMERCIAL_NOMES.flatMap((name) => {
    const p = byName.get(name);
    return p ? [{ id: p.id, name }] : [];
  });
}

export function pipelineComercialCanonicoIds(comerciais: ComercialOpcao[]): Set<string> {
  return new Set(comerciais.map((c) => c.id));
}

/** Domínio inativo → coluna Comercial exibe «Site Offline» (automático, sem filtro). */
export function pipelineComercialIsSiteOffline(
  row: Pick<PipelineMarcaRow, "status_dominio">,
): boolean {
  return row.status_dominio === "inativo";
}

/** Rótulo da coluna — Site Offline (automático), Marcus Morin, Fred Ring ou «—». */
export function pipelineComercialDisplayNome(
  row: Pick<PipelineMarcaRow, "comercial_user_id" | "comercial_nome" | "status_dominio">,
  comerciais: ComercialOpcao[],
): string {
  if (pipelineComercialIsSiteOffline(row)) return PIPELINE_COMERCIAL_SITE_OFFLINE_LABEL;
  if (!row.comercial_user_id) return "—";
  const nome =
    row.comercial_nome ??
    comerciais.find((c) => c.id === row.comercial_user_id)?.name ??
    null;
  if (nome && (PIPELINE_COMERCIAL_NOMES as readonly string[]).includes(nome)) return nome;
  return "—";
}

export function pipelineComercialPodeEditar(row: Pick<PipelineMarcaRow, "status_dominio">): boolean {
  return !pipelineComercialIsSiteOffline(row);
}

export function pipelineComercialNomePorId(
  userId: string | null,
  comerciais: ComercialOpcao[],
): string | null {
  if (!userId) return null;
  return comerciais.find((c) => c.id === userId)?.name ?? null;
}

export function buildComercialFiltroExtraOptions(
  comerciais: ComercialOpcao[],
): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [
    { value: COMERCIAL_FILTRO_NENHUM, label: COMERCIAL_FILTRO_NENHUM_LABEL },
  ];
  for (const name of PIPELINE_COMERCIAL_NOMES) {
    const c = comerciais.find((x) => x.name === name);
    opts.push({ value: c?.id ?? `__missing__:${name}`, label: name });
  }
  return opts;
}

export function fmtDataPipeline(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function fmtDataNascimento(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function produtoStatus(
  row: PipelineMarcaRow,
  tipo: ProdutoTipo,
): StatusProduto | null {
  const p = row.produtos.find((x) => x.produto === tipo);
  return p?.status_produto ?? null;
}

export function produtoDisplay(row: PipelineMarcaRow, tipo: ProdutoTipo): string {
  const st = produtoStatus(row, tipo);
  if (!st) return "—";
  return STATUS_PRODUTO_LABEL[st];
}

export function normalizeTelefones(raw: unknown): import("./types").TelefoneContato[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => {
    if (typeof t === "string") return { iso: "BR", ddi: "+55", numero: t };
    const o = t as { iso?: string; ddi?: string; numero?: string };
    return {
      iso: o.iso ?? "BR",
      ddi: o.ddi ?? "+55",
      numero: o.numero ?? "",
    };
  });
}

export function normalizeEmails(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => String(e ?? "")).filter(Boolean);
}

export function normalizeRetificacoes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => String(r ?? "")).filter(Boolean);
}

export function contatoPrincipalNome(row: PipelineMarcaRow): string {
  if (!row.contatos.length) return "";
  const sorted = [...row.contatos].sort((a, b) => a.ordem - b.ordem);
  return sorted[0]?.nome ?? "";
}

export function marcasMesmoCnpj(
  rows: PipelineMarcaRow[],
  cnpj: string,
  excludeId?: string,
): PipelineMarcaRow[] {
  return rows.filter((r) => r.empresa.cnpj === cnpj && r.id !== excludeId);
}

export function filterMarcas(
  rows: PipelineMarcaRow[],
  tab: PipelineTab,
  busca: string,
  comercialFiltro: string,
  kpiFolha: StatusFolha | null,
  comerciais: ComercialOpcao[] = [],
): PipelineMarcaRow[] {
  const cfg = TAB_TABLE_CONFIG[tab];
  let list = rows;
  const canonicalIds = pipelineComercialCanonicoIds(comerciais);

  if (cfg.pipelines) {
    list = list.filter((r) => cfg.pipelines!.includes(r.status_pipeline));
  }

  if (kpiFolha) {
    list = list.filter((r) => r.status_folha === kpiFolha);
  }

  if (comercialFiltro === COMERCIAL_FILTRO_NENHUM) {
    list = list.filter(
      (r) =>
        !pipelineComercialIsSiteOffline(r) &&
        (!r.comercial_user_id || !canonicalIds.has(r.comercial_user_id)),
    );
  } else if (comercialFiltro !== COMERCIAL_FILTRO_TODOS) {
    list = list.filter(
      (r) =>
        !pipelineComercialIsSiteOffline(r) && r.comercial_user_id === comercialFiltro,
    );
  }

  const q = busca.trim().toLowerCase();
  if (q) {
    list = list.filter((r) => {
      const hay = [
        r.nome,
        r.empresa.razao_social,
        r.empresa.cnpj,
        ...r.contatos.map((c) => c.nome),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return list;
}

export function countByFolha(rows: PipelineMarcaRow[], folha: StatusFolha): number {
  return rows.filter((r) => r.status_folha === folha).length;
}

export function countByPipeline(rows: PipelineMarcaRow[], pipeline: StatusPipeline): number {
  return rows.filter((r) => r.status_pipeline === pipeline).length;
}

export function defaultFolhaForPipeline(pipeline: StatusPipeline): StatusFolha {
  return FOLHA_BY_PIPELINE[pipeline][0];
}

export type RazaoMerge = { row: PipelineMarcaRow; rowSpan: number; showRazao: boolean };

export function buildRazaoMerge(rows: PipelineMarcaRow[]): RazaoMerge[] {
  const out: RazaoMerge[] = [];
  let i = 0;
  while (i < rows.length) {
    const cnpj = rows[i].empresa.cnpj;
    let j = i;
    while (j < rows.length && rows[j].empresa.cnpj === cnpj) j += 1;
    const span = j - i;
    for (let k = i; k < j; k += 1) {
      out.push({ row: rows[k], rowSpan: span, showRazao: k === i });
    }
    i = j;
  }
  return out;
}

export function sortMarcas(
  rows: PipelineMarcaRow[],
  col: TableCol,
  dir: SortDir,
  comerciais: ComercialOpcao[] = [],
): PipelineMarcaRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (col) {
      case "razao":
        return compareLocaleTexto(a.empresa.razao_social, b.empresa.razao_social, dir);
      case "marca":
        return compareLocaleTexto(a.nome, b.nome, dir);
      case "contato":
        return compareLocaleTexto(contatoPrincipalNome(a), contatoPrincipalNome(b), dir);
      case "comercial": {
        const sortKey = (r: PipelineMarcaRow) => {
          const label = pipelineComercialDisplayNome(r, comerciais);
          return label === "—" ? "" : label;
        };
        return compareLocaleTexto(sortKey(a), sortKey(b), dir);
      }
      case "status":
        return compareLocaleTexto(
          STATUS_PIPELINE_LABEL[a.status_pipeline],
          STATUS_PIPELINE_LABEL[b.status_pipeline],
          dir,
        );
      case "dedicada":
        return compareLocaleTexto(produtoDisplay(a, "mesa_dedicada"), produtoDisplay(b, "mesa_dedicada"), dir);
      case "network":
        return compareLocaleTexto(produtoDisplay(a, "mesa_network"), produtoDisplay(b, "mesa_network"), dir);
      case "ultima": {
        const da = a.ultima_comunicacao ?? "";
        const db = b.ultima_comunicacao ?? "";
        if (da === db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return dir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
      }
      default:
        return 0;
    }
  });
  return sorted;
}

export function historicoDisplayValor(campo: string, valor: string | null): string {
  if (!valor || valor === "null") return "—";
  if (campo === "status_pipeline") {
    const v = valor as StatusPipeline;
    return STATUS_PIPELINE_LABEL[v] ?? valor;
  }
  if (campo === "status_folha") {
    const v = valor as StatusFolha;
    return STATUS_FOLHA_LABEL[v] ?? valor;
  }
  if (campo === "mesa_dedicada" || campo === "mesa_network") {
    const v = valor as StatusProduto;
    return STATUS_PRODUTO_LABEL[v] ?? valor;
  }
  return valor;
}

export function mapContatoFromDb(raw: Record<string, unknown>): import("./types").ComercialContato {
  return {
    id: String(raw.id),
    marca_id: String(raw.marca_id),
    nome: String(raw.nome ?? ""),
    telefones: normalizeTelefones(raw.telefones),
    emails: normalizeEmails(raw.emails),
    linkedin: raw.linkedin ? String(raw.linkedin) : null,
    instagram: raw.instagram ? String(raw.instagram) : null,
    data_nascimento: raw.data_nascimento ? String(raw.data_nascimento) : null,
    ordem: Number(raw.ordem ?? 0),
  };
}

export function telefonesDisplay(contato: ComercialContato): string {
  const nums = contato.telefones
    .map((t) => [t.ddi, t.numero].filter(Boolean).join(" ").trim())
    .filter(Boolean);
  return nums.length ? nums.join(" · ") : "—";
}
