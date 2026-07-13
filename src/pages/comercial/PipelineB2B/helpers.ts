import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { textoContemBusca } from "../../../lib/searchText";
import type { SortDir } from "../../../components/dashboard";
import { normalizeDominioForCheck } from "../../../lib/comercialDominioValidation";
import {
  STATUS_FOLHA_LABEL,
  STATUS_PIPELINE_LABEL,
  STATUS_PRODUTO_LABEL,
  STATUS_PRODUTO_LINHA_SEM_INTERESSE,
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

function normalizePipelineComercialNome(name: string): string {
  return name.trim().toLowerCase();
}

export function buildPipelineComerciais(
  profiles: { id: string; name: string }[],
): ComercialOpcao[] {
  const byName = new Map(
    profiles.map((p) => [normalizePipelineComercialNome(p.name), p]),
  );
  return PIPELINE_COMERCIAL_NOMES.map((name) => {
    const p = byName.get(normalizePipelineComercialNome(name));
    return { id: p?.id ?? null, name };
  });
}

/** Valor sintético no popover quando o perfil canónico ainda não foi resolvido. */
export function pipelineComercialMissingOptionValue(name: string): string {
  return `__missing__:${name}`;
}

export function pipelineComercialIsMissingOptionValue(value: string): boolean {
  return value.startsWith("__missing__:");
}

/** Opções fixas do popover inline — Nenhum + PIPELINE_COMERCIAL_NOMES (sempre visíveis). */
export function buildPipelineComercialPopoverOptions(
  comerciais: ComercialOpcao[],
): string[] {
  return [
    "",
    ...PIPELINE_COMERCIAL_NOMES.map((name) => {
      const c = comerciais.find((x) => x.name === name);
      return c?.id ?? pipelineComercialMissingOptionValue(name);
    }),
  ];
}

export function pipelineComercialPopoverLabel(
  value: string,
  comerciais: ComercialOpcao[],
): string {
  if (!value) return COMERCIAL_FILTRO_NENHUM_LABEL;
  if (pipelineComercialIsMissingOptionValue(value)) {
    return value.slice("__missing__:".length);
  }
  return comerciais.find((c) => c.id === value)?.name ?? "—";
}

export function pipelineComercialPopoverUserId(value: string): string | null {
  if (!value || pipelineComercialIsMissingOptionValue(value)) return null;
  return value;
}

export function pipelineComercialCanonicoIds(comerciais: ComercialOpcao[]): Set<string> {
  return new Set(comerciais.map((c) => c.id).filter((id): id is string => Boolean(id)));
}

/** Domínio inativo no banco (KPI Site Offline, consolidado). */
export function pipelineComercialIsSiteOffline(
  row: Pick<PipelineMarcaRow, "status_dominio">,
): boolean {
  return row.status_dominio === "inativo";
}

/** Badge «Site Offline» na coluna Comercial — domínio inativo sem comercial atribuído. */
export function pipelineComercialExibeSiteOffline(
  row: Pick<PipelineMarcaRow, "status_dominio" | "comercial_user_id">,
): boolean {
  return row.status_dominio === "inativo" && !row.comercial_user_id;
}

/** Rótulo da coluna — Site Offline (automático), comerciais canónicos ou «—». */
export function pipelineComercialDisplayNome(
  row: Pick<PipelineMarcaRow, "comercial_user_id" | "comercial_nome" | "status_dominio">,
  comerciais: ComercialOpcao[],
): string {
  if (pipelineComercialExibeSiteOffline(row)) return PIPELINE_COMERCIAL_SITE_OFFLINE_LABEL;
  if (!row.comercial_user_id) return "—";
  const nome =
    row.comercial_nome ??
    comerciais.find((c) => c.id === row.comercial_user_id)?.name ??
    null;
  if (nome && (PIPELINE_COMERCIAL_NOMES as readonly string[]).includes(nome)) return nome;
  return "—";
}

export function pipelineComercialNomePorId(
  userId: string | null,
  comerciais: ComercialOpcao[],
): string | null {
  if (!userId) return null;
  return comerciais.find((c) => c.id === userId)?.name ?? null;
}

/** Normaliza input de domínio no modal de edição (vazio → null). */
export function parseDominioMarcaInput(raw: string): { value: string | null; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null };
  const normalized = normalizeDominioForCheck(trimmed);
  if (!normalized) {
    return { value: null, error: "Informe um domínio válido (ex.: apostou.bet.br)." };
  }
  return { value: normalized };
}

export function buildComercialFiltroExtraOptions(
  comerciais: ComercialOpcao[],
): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [
    { value: COMERCIAL_FILTRO_NENHUM, label: COMERCIAL_FILTRO_NENHUM_LABEL },
  ];
  for (const name of PIPELINE_COMERCIAL_NOMES) {
    const c = comerciais.find((x) => x.name === name);
    if (c?.id) opts.push({ value: c.id, label: name });
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

/** Valor para `<input type="date">` a partir de ISO date ou timestamptz. */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function algumProdutoStatus(row: PipelineMarcaRow, statuses: StatusProduto[]): boolean {
  const d = produtoStatus(row, "mesa_dedicada");
  const n = produtoStatus(row, "mesa_network");
  return (d !== null && statuses.includes(d)) || (n !== null && statuses.includes(n));
}

/** Dedicada ou Network em Contrato Assinado ou Ativo — critério da aba / consolidado Fechado. */
export function marcaComContratoFechado(row: PipelineMarcaRow): boolean {
  return algumProdutoStatus(row, ["contrato_assinado", "ativo"]);
}

/**
 * Cascata automática Status ← produtos (prioridade estrita, para no 1º match):
 * 1. Contrato Assinado ou Ativo → fechado
 * 2. Contrato Enviado → negociacao
 * 3. Em negociação → conexao
 * Sem match → null (não altera Status).
 */
export function derivarStatusPipelinePorProdutos(
  produtos: { status_produto: StatusProduto | null }[],
): StatusPipeline | null {
  const statuses = produtos
    .map((p) => p.status_produto)
    .filter((s): s is StatusProduto => s != null);
  const has = (list: StatusProduto[]) => statuses.some((s) => list.includes(s));
  if (has(["contrato_assinado", "ativo"])) return "fechado";
  if (has(["contrato_enviado"])) return "negociacao";
  if (has(["em_negociacao"])) return "conexao";
  return null;
}

export function folhaDerivadaPorPipelineEProdutos(
  pipeline: StatusPipeline,
  produtos: { status_produto: StatusProduto | null }[],
): StatusFolha {
  if (pipeline === "fechado") {
    const ativo = produtos.some((p) => p.status_produto === "ativo");
    return ativo ? "fech_ativo" : "fech_assinado";
  }
  if (pipeline === "conexao") return "conexao_realizada";
  return defaultFolhaForPipeline(pipeline);
}

function algumProdutoComValor(row: PipelineMarcaRow): boolean {
  return produtoStatus(row, "mesa_dedicada") !== null || produtoStatus(row, "mesa_network") !== null;
}

function produtosAmbosVazios(row: PipelineMarcaRow): boolean {
  return !algumProdutoComValor(row);
}

/** Classificação dos KPIs / linhas do consolidado — derivada da tabela, não de `status_folha` no banco. */
export function rowMatchesConsolidadoFolha(
  row: PipelineMarcaRow,
  folha: StatusFolha,
  context: "hierarchy" | "kpi" = "kpi",
): boolean {
  switch (folha) {
    case "site_ativo":
      return row.status_pipeline === "disponiveis" && row.status_dominio === "ok";
    case "site_offline":
      return row.status_pipeline === "disponiveis" && row.status_dominio === "inativo";
    case "sem_contato":
      return row.status_pipeline === "disponiveis" && row.contatos.length === 0;
    case "conexao_iniciada":
      return row.status_pipeline === "conexao" && produtosAmbosVazios(row);
    case "conexao_realizada":
      if (row.status_pipeline !== "conexao") return false;
      if (context === "kpi" && algumProdutoStatus(row, STATUS_PRODUTO_LINHA_SEM_INTERESSE)) return false;
      return algumProdutoComValor(row);
    case "neg_sem":
      if (context === "hierarchy") {
        return (
          row.status_pipeline === "negociacao" &&
          algumProdutoStatus(row, STATUS_PRODUTO_LINHA_SEM_INTERESSE)
        );
      }
      return row.status_pipeline === "conexao" && algumProdutoStatus(row, STATUS_PRODUTO_LINHA_SEM_INTERESSE);
    case "neg_enviar":
      if (row.status_pipeline !== "negociacao") return false;
      if (algumProdutoStatus(row, STATUS_PRODUTO_LINHA_SEM_INTERESSE)) return false;
      if (algumProdutoStatus(row, ["contrato_enviado", "contrato_assinado", "ativo"])) return false;
      return algumProdutoStatus(row, ["sem_proposta"]) || produtosAmbosVazios(row);
    case "neg_interessado":
      if (row.status_pipeline !== "negociacao") return false;
      if (algumProdutoStatus(row, STATUS_PRODUTO_LINHA_SEM_INTERESSE)) return false;
      if (algumProdutoStatus(row, ["contrato_enviado", "contrato_assinado", "ativo"])) return false;
      if (context === "hierarchy") {
        return algumProdutoComValor(row);
      }
      return algumProdutoComValor(row) && !algumProdutoStatus(row, ["sem_proposta"]);
    case "fech_ativo":
      return algumProdutoStatus(row, ["ativo"]);
    case "fech_assinado":
      return (
        !algumProdutoStatus(row, ["ativo"]) &&
        algumProdutoStatus(row, ["contrato_assinado"])
      );
    case "fech_enviado":
      return (
        row.status_pipeline === "negociacao" &&
        !algumProdutoStatus(row, ["ativo"]) &&
        !algumProdutoStatus(row, ["contrato_assinado"]) &&
        algumProdutoStatus(row, ["contrato_enviado"])
      );
    default:
      return false;
  }
}

export function countByConsolidadoFolha(
  rows: PipelineMarcaRow[],
  folha: StatusFolha,
  context: "hierarchy" | "kpi" = "kpi",
): number {
  return rows.filter((r) => rowMatchesConsolidadoFolha(r, folha, context)).length;
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

  if (tab === "fechado") {
    // Fechado: Dedicada ou Network em Contrato Assinado / Ativo (não só status_pipeline).
    list = list.filter((r) => marcaComContratoFechado(r));
  } else if (tab === "negociacao") {
    // Evita duplicar na aba Negociação marcas já fechadas por produto.
    list = list.filter(
      (r) => r.status_pipeline === "negociacao" && !marcaComContratoFechado(r),
    );
  } else if (cfg.pipelines) {
    list = list.filter((r) => cfg.pipelines!.includes(r.status_pipeline));
  }

  if (kpiFolha) {
    list = list.filter((r) => rowMatchesConsolidadoFolha(r, kpiFolha, "kpi"));
  }

  if (comercialFiltro === COMERCIAL_FILTRO_NENHUM) {
    list = list.filter(
      (r) => !r.comercial_user_id || !canonicalIds.has(r.comercial_user_id),
    );
  } else if (comercialFiltro !== COMERCIAL_FILTRO_TODOS) {
    list = list.filter((r) => r.comercial_user_id === comercialFiltro);
  }

  const q = busca.trim();
  if (q) {
    list = list.filter((r) => {
      const hay = [
        r.nome,
        r.empresa.razao_social,
        r.empresa.cnpj,
        ...r.contatos.map((c) => c.nome),
      ].join(" ");
      return textoContemBusca(hay, q);
    });
  }

  return list;
}

export function countByPipeline(rows: PipelineMarcaRow[], pipeline: StatusPipeline): number {
  if (pipeline === "fechado") {
    return rows.filter((r) => marcaComContratoFechado(r)).length;
  }
  if (pipeline === "negociacao") {
    return rows.filter((r) => r.status_pipeline === "negociacao" && !marcaComContratoFechado(r)).length;
  }
  return rows.filter((r) => r.status_pipeline === pipeline).length;
}

export function defaultFolhaForPipeline(pipeline: StatusPipeline): StatusFolha {
  return FOLHA_BY_PIPELINE[pipeline][0];
}

export type RazaoMerge = {
  row: PipelineMarcaRow;
  rowSpan: number;
  showRazao: boolean;
  /** Índice de zebra por CNPJ (todas as marcas da mesma razão compartilham). */
  razaoStripeIndex: number;
};

/** Ordem de primeira aparição na lista exibida — define intercalação por razão social. */
export function buildCnpjStripeIndex(rows: PipelineMarcaRow[]): Map<string, number> {
  const map = new Map<string, number>();
  let idx = 0;
  for (const r of rows) {
    const cnpj = r.empresa.cnpj;
    if (!map.has(cnpj)) {
      map.set(cnpj, idx);
      idx += 1;
    }
  }
  return map;
}

export function buildRazaoMerge(rows: PipelineMarcaRow[]): RazaoMerge[] {
  const stripeByCnpj = buildCnpjStripeIndex(rows);
  const out: RazaoMerge[] = [];
  let i = 0;
  while (i < rows.length) {
    const cnpj = rows[i].empresa.cnpj;
    let j = i;
    while (j < rows.length && rows[j].empresa.cnpj === cnpj) j += 1;
    const span = j - i;
    const stripe = stripeByCnpj.get(cnpj) ?? 0;
    for (let k = i; k < j; k += 1) {
      out.push({ row: rows[k], rowSpan: span, showRazao: k === i, razaoStripeIndex: stripe });
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
      case "agregadora":
        return compareLocaleTexto(a.agregadora ?? "", b.agregadora ?? "", dir);
      case "ultimo_contato": {
        const da = a.ultimo_contato ?? "";
        const db = b.ultimo_contato ?? "";
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
  if (campo === "ultimo_contato" || campo === "ultima_comunicacao") {
    return fmtDataNascimento(valor) !== "—" ? fmtDataNascimento(valor) : fmtDataPipeline(valor);
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

/** Select PostgREST completo da marca (Pipeline B2B / modal Ver). */
export const PIPELINE_MARCA_SELECT_EMBED = `
  id, nome, dominio, status_dominio, status_pipeline, status_folha, comercial_user_id, agregadora, ultimo_contato, ultima_comunicacao,
  empresa:comercial_empresas(id, razao_social, cnpj, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano),
  contatos:comercial_marca_contatos(id, marca_id, nome, telefones, emails, linkedin, instagram, data_nascimento, ordem),
  produtos:comercial_marca_produtos(produto, status_produto)
`;

/** Mapeia linha do banco para `PipelineMarcaRow` (modal Ver / tabela B2B). */
export function mapPipelineMarcaFromDb(
  raw: Record<string, unknown>,
  comercialNames: Record<string, string> = {},
): PipelineMarcaRow {
  const empresaRaw = raw.empresa as Record<string, unknown>;
  const contatosRaw = (raw.contatos as Record<string, unknown>[] | null) ?? [];
  const produtosRaw = (raw.produtos as Record<string, unknown>[] | null) ?? [];
  const comercialId = raw.comercial_user_id ? String(raw.comercial_user_id) : null;
  const rawComercialNome = comercialId ? comercialNames[comercialId] ?? null : null;
  const comercialNomeCanonico =
    rawComercialNome &&
    (PIPELINE_COMERCIAL_NOMES as readonly string[]).includes(rawComercialNome)
      ? rawComercialNome
      : null;

  return {
    id: String(raw.id),
    nome: String(raw.nome ?? ""),
    dominio: raw.dominio ? String(raw.dominio) : null,
    status_dominio: raw.status_dominio === "ok" ? "ok" : "inativo",
    status_pipeline: raw.status_pipeline as StatusPipeline,
    status_folha: raw.status_folha as PipelineMarcaRow["status_folha"],
    comercial_user_id: comercialId,
    comercial_nome: comercialNomeCanonico,
    agregadora: raw.agregadora ? String(raw.agregadora) : null,
    ultimo_contato: raw.ultimo_contato ? String(raw.ultimo_contato) : null,
    ultima_comunicacao: raw.ultima_comunicacao ? String(raw.ultima_comunicacao) : null,
    empresa: {
      id: String(empresaRaw.id),
      razao_social: String(empresaRaw.razao_social ?? ""),
      cnpj: String(empresaRaw.cnpj ?? ""),
      portaria: empresaRaw.portaria ? String(empresaRaw.portaria) : null,
      portaria_retificacoes: normalizeRetificacoes(empresaRaw.portaria_retificacoes),
      requerimento_numero: empresaRaw.requerimento_numero
        ? String(empresaRaw.requerimento_numero)
        : null,
      requerimento_ano: empresaRaw.requerimento_ano ? String(empresaRaw.requerimento_ano) : null,
    },
    contatos: contatosRaw.map(mapContatoFromDb),
    produtos: produtosRaw.map((p) => ({
      produto: p.produto as ProdutoTipo,
      status_produto: p.status_produto as StatusProduto | null,
    })),
  };
}

export function telefonesDisplay(contato: ComercialContato): string {
  const nums = contato.telefones
    .map((t) => [t.ddi, t.numero].filter(Boolean).join(" ").trim())
    .filter(Boolean);
  return nums.length ? nums.join(" · ") : "—";
}
