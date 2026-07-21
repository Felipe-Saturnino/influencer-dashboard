import { getPeriodoHistoricoCompetencias } from "./dashboardHelpers";
import { supabase } from "./supabase";
import { fetchAllPages } from "./supabasePaginate";
import {
  codigoEstoqueEquipamento,
  codigoEstoqueItem,
  codigoEstoqueJogoLote,
  estoqueDisponivelItem,
  fetchEstoqueFornecedores,
  qtdAtualJogoLote,
  type EstoqueEquipamentoRow,
  type EstoqueFornecedorRow,
  type EstoqueItemRow,
  type EstoqueJogoLoteRow,
} from "./techOpsEstoque";

/* ─── Tipos ───────────────────────────────────────────────────────────────── */

export type OrdemSaidaTipo = "interna" | "externa" | "manutencao";
export type OrdemSaidaStatus = "solicitada" | "aberta" | "concluida" | "cancelada";
export type OrdemSaidaItemTipo = "item" | "equipamento" | "jogo";

export const OS_STATUS_LABEL: Record<OrdemSaidaStatus, string> = {
  solicitada: "Solicitada",
  aberta: "Aberta",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/** Manutenção exibe "Registrada" no lugar de Solicitada. */
export function labelStatusOrdemSaida(status: OrdemSaidaStatus, tipo: OrdemSaidaTipo): string {
  if (tipo === "manutencao" && status === "solicitada") return "Registrada";
  return OS_STATUS_LABEL[status];
}

export const OS_STATUS_COLOR: Record<OrdemSaidaStatus, string> = {
  solicitada: "#f59e0b",
  aberta: "#3b82f6",
  concluida: "#22c55e",
  cancelada: "#e84025",
};

/** Locais fixos (além dos estúdios de `estudios_spin`). */
export const OS_LOCAIS_FIXOS = [
  { chave: "estoque", label: "Estoque" },
  { chave: "shuffler_room", label: "Shuffler Room" },
  { chave: "ocr", label: "OCR" },
  { chave: "academy", label: "Academy" },
] as const;

export type OsLocalFixoChave = (typeof OS_LOCAIS_FIXOS)[number]["chave"];

export function chaveEstudioOs(slug: string): string {
  return `estudio:${slug}`;
}

export function isChaveEstudioOs(chave: string): boolean {
  return chave.startsWith("estudio:");
}

export function slugFromChaveEstudioOs(chave: string): string | null {
  return isChaveEstudioOs(chave) ? chave.slice("estudio:".length) : null;
}

export function labelLocalOs(chave: string | null | undefined, estudioNomePorSlug: Record<string, string>): string {
  if (!chave) return "—";
  const fixo = OS_LOCAIS_FIXOS.find((l) => l.chave === chave);
  if (fixo) return fixo.label;
  const slug = slugFromChaveEstudioOs(chave);
  if (slug) return estudioNomePorSlug[slug] ?? slug;
  return chave;
}

export interface OrdemSaidaItemRow {
  id: string;
  ordem_id: string;
  entidade_tipo: OrdemSaidaItemTipo;
  entidade_id: string;
  quantidade: number;
  label_snapshot: string;
  retorno_confirmado: boolean;
}

export interface OrdemSaidaRow {
  id: string;
  tipo: OrdemSaidaTipo;
  competencia: string; // YYYY-MM-01
  codigo_num: number;
  status: OrdemSaidaStatus;
  origem_chave: string | null;
  destino_chave: string | null;
  destino_texto: string | null;
  fornecedor_id: string | null;
  data_saida: string | null;
  data_retorno: string | null;
  sem_retorno: boolean;
  data_saida_realizada: string | null;
  data_retorno_realizada: string | null;
  observacao: string;
  motivo_cancelamento: string;
  cancelado_por_nome: string;
  cancelado_em: string | null;
  observacoes_retorno: string;
  concluido_por_nome: string;
  concluido_em: string | null;
  solicitante_user_id: string | null;
  solicitante_nome: string;
  solicitante_time: string;
  responsavel_nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  itens: OrdemSaidaItemRow[];
  fornecedor_razao_social?: string | null;
}

export interface OrdemSaidaAnotacaoRow {
  id: string;
  ordem_id: string;
  texto: string;
  autor_nome: string;
  created_at: string;
}

/** Contexto visual do Modal Ver / Atualizar. */
export type OsModalContexto =
  | "interna"
  | "externa_futuras"
  | "externa_abertas"
  | "externa_encerradas"
  | "manutencao_abertas"
  | "manutencao_encerradas";

export type OsTipoAtualizacao = "cancelar" | "confirmar_retorno" | "alterar";

export function hojeDataBrOs(ref = new Date()): string {
  const d = String(ref.getDate()).padStart(2, "0");
  const m = String(ref.getMonth() + 1).padStart(2, "0");
  const y = ref.getFullYear();
  return `${d}/${m}/${y}`;
}

export function subtituloModalOs(row: OrdemSaidaRow): string {
  const status = labelStatusOrdemSaida(row.status, row.tipo);
  const pessoa =
    row.tipo === "interna"
      ? row.responsavel_nome.trim() || row.solicitante_nome.trim() || "—"
      : formatSolicitanteOs(row.solicitante_nome, row.solicitante_time);
  return `${status} - ${pessoa}`;
}

export function opcoesTipoAtualizacaoOs(
  contexto: OsModalContexto,
  status: OrdemSaidaStatus,
): OsTipoAtualizacao[] {
  if (status === "concluida" || status === "cancelada") return [];
  if (contexto === "interna") return ["cancelar", "confirmar_retorno", "alterar"];
  if (contexto === "externa_futuras") return ["cancelar", "alterar"];
  if (contexto === "externa_abertas") return ["cancelar", "confirmar_retorno"];
  if (contexto === "manutencao_abertas") {
    const out: OsTipoAtualizacao[] = ["cancelar"];
    if (status === "aberta") out.push("confirmar_retorno");
    if (status === "solicitada") out.push("alterar");
    return out;
  }
  return [];
}

export interface OsItemDisponivel {
  entidade_tipo: OrdemSaidaItemTipo;
  entidade_id: string;
  label: string;
  /** Para equipamentos, qty sempre 1. */
  maxQtd: number;
}

export type ItemDraftOs = { key: string; entidadeKey: string; quantidade: string };

export function novaLinhaItemOs(): ItemDraftOs {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, entidadeKey: "", quantidade: "1" };
}

export function draftsFromOrdemItens(itens: OrdemSaidaItemRow[]): ItemDraftOs[] {
  if (!itens.length) return [novaLinhaItemOs()];
  return itens.map((it) => ({
    key: it.id,
    entidadeKey: `${it.entidade_tipo}:${it.entidade_id}`,
    quantidade: String(it.quantidade),
  }));
}

/** Garante que itens já na OS permaneçam no catálogo ao editar (mesmo com estoque 0). */
export function catalogoComItensDaOs(
  catalogo: OsItemDisponivel[],
  itens: OrdemSaidaItemRow[],
): OsItemDisponivel[] {
  const map = new Map(catalogo.map((c) => [`${c.entidade_tipo}:${c.entidade_id}`, { ...c }]));
  for (const it of itens) {
    const k = `${it.entidade_tipo}:${it.entidade_id}`;
    const existing = map.get(k);
    if (existing) {
      map.set(k, {
        ...existing,
        maxQtd: Math.max(existing.maxQtd, it.entidade_tipo === "equipamento" ? 1 : it.quantidade),
      });
    } else {
      map.set(k, {
        entidade_tipo: it.entidade_tipo,
        entidade_id: it.entidade_id,
        label: it.label_snapshot,
        maxQtd: it.entidade_tipo === "equipamento" ? 1 : Math.max(1, it.quantidade),
      });
    }
  }
  return [...map.values()];
}

/* ─── Códigos ─────────────────────────────────────────────────────────────── */

const PREFIXO_TIPO: Record<OrdemSaidaTipo, string> = {
  interna: "INT",
  externa: "EXT",
  manutencao: "MAN",
};

export function formatCodigoOrdemSaida(tipo: OrdemSaidaTipo, competencia: string, codigoNum: number): string {
  const d = competencia.slice(0, 10);
  const [y, m] = d.split("-");
  const mmaa = `${m}${y.slice(2)}`;
  return `OS/${PREFIXO_TIPO[tipo]}-${mmaa}-${String(codigoNum).padStart(4, "0")}`;
}

export function formatDataBrOs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const raw = iso.slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function parseDataBrOs(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function formatSolicitanteOs(nome: string, time: string): string {
  const n = nome.trim() || "—";
  const t = time.trim();
  return t ? `${n} — ${t}` : n;
}

/* ─── Carrossel (mês atual + 2 anteriores) ────────────────────────────────── */

const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function buildMesesOrdemSaida(ref = new Date()): { key: string; label: string; competencia: string }[] {
  const out: { key: string; label: string; competencia: string }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push({
      key,
      label: `${MESES_NOMES[d.getMonth()]} ${y}`,
      competencia: `${key}-01`,
    });
  }
  return out;
}

/** OS do mês M + OS abertas (solicitada/aberta) de competências anteriores. */
export function ordemVisivelNoMes(row: OrdemSaidaRow, mesKey: string, historico: boolean): boolean {
  if (historico) return true;
  const abertura = row.competencia.slice(0, 7);
  if (abertura === mesKey) return true;
  if ((row.status === "solicitada" || row.status === "aberta") && abertura < mesKey) return true;
  return false;
}

/* ─── Catálogo de itens disponíveis (Gestão de Estoque) ───────────────────── */

/** Catálogo enxuto para o seletor de itens da OS (sem `select("*")` do estoque completo). */
async function fetchCatalogoItensOsLean(): Promise<{
  itens: EstoqueItemRow[];
  equips: EstoqueEquipamentoRow[];
  lotes: EstoqueJogoLoteRow[];
}> {
  const [it, eq, jl] = await Promise.all([
    supabase
      .from("tech_ops_estoque_itens")
      .select("id, codigo_num, nome, quantidade_total, quantidade_em_uso, quantidade_manutencao")
      .eq("ativo", true)
      .order("codigo_num", { ascending: true }),
    supabase
      .from("tech_ops_estoque_equipamentos")
      .select("id, codigo_num, nome, status")
      .eq("ativo", true)
      .eq("status", "estoque")
      .order("codigo_num", { ascending: true }),
    supabase
      .from("tech_ops_estoque_jogo_lotes")
      .select("id, codigo_num, nome_lote, qtd_inicial, qtd_consumida, qtd_descartada")
      .eq("ativo", true)
      .order("codigo_num", { ascending: true }),
  ]);
  if (it.error) throw it.error;
  if (eq.error) throw eq.error;
  if (jl.error) throw jl.error;
  return {
    itens: (it.data ?? []) as EstoqueItemRow[],
    equips: (eq.data ?? []) as EstoqueEquipamentoRow[],
    lotes: (jl.data ?? []) as EstoqueJogoLoteRow[],
  };
}

export async function fetchItensDisponiveisOs(): Promise<OsItemDisponivel[]> {
  const { itens, equips, lotes } = await fetchCatalogoItensOsLean();
  const out: OsItemDisponivel[] = [];

  for (const r of itens) {
    const est = estoqueDisponivelItem(r);
    if (est <= 0) continue;
    out.push({
      entidade_tipo: "item",
      entidade_id: r.id,
      label: `${codigoEstoqueItem(r)} · ${r.nome} (Estoque: ${est})`,
      maxQtd: est,
    });
  }
  for (const r of equips) {
    if (r.status !== "estoque") continue;
    out.push({
      entidade_tipo: "equipamento",
      entidade_id: r.id,
      label: `${codigoEstoqueEquipamento(r)} · ${r.nome}`,
      maxQtd: 1,
    });
  }
  for (const r of lotes) {
    const q = qtdAtualJogoLote(r);
    if (q <= 0) continue;
    out.push({
      entidade_tipo: "jogo",
      entidade_id: r.id,
      label: `${codigoEstoqueJogoLote(r)} · ${r.nome_lote} (Qtd: ${q})`,
      maxQtd: q,
    });
  }
  return out;
}

/** Manutenção: lista linhas ativas; maxQtd = Estoque (itens) / Qtd Atual (jogo) — nunca inflar. */
export async function fetchItensManutencaoOs(): Promise<OsItemDisponivel[]> {
  const [it, eq, jl] = await Promise.all([
    supabase
      .from("tech_ops_estoque_itens")
      .select("id, codigo_num, nome, quantidade_total, quantidade_em_uso, quantidade_manutencao")
      .eq("ativo", true)
      .order("codigo_num", { ascending: true }),
    supabase
      .from("tech_ops_estoque_equipamentos")
      .select("id, codigo_num, nome, status")
      .eq("ativo", true)
      .order("codigo_num", { ascending: true }),
    supabase
      .from("tech_ops_estoque_jogo_lotes")
      .select("id, codigo_num, nome_lote, qtd_inicial, qtd_consumida, qtd_descartada")
      .eq("ativo", true)
      .order("codigo_num", { ascending: true }),
  ]);
  if (it.error) throw it.error;
  if (eq.error) throw eq.error;
  if (jl.error) throw jl.error;
  const itens = (it.data ?? []) as EstoqueItemRow[];
  const equips = (eq.data ?? []) as EstoqueEquipamentoRow[];
  const lotes = (jl.data ?? []) as EstoqueJogoLoteRow[];
  const out: OsItemDisponivel[] = [];
  for (const r of itens) {
    const est = estoqueDisponivelItem(r);
    out.push({
      entidade_tipo: "item",
      entidade_id: r.id,
      label: `${codigoEstoqueItem(r)} · ${r.nome} (Estoque: ${est})`,
      maxQtd: est,
    });
  }
  for (const r of equips) {
    out.push({
      entidade_tipo: "equipamento",
      entidade_id: r.id,
      label: `${codigoEstoqueEquipamento(r)} · ${r.nome}`,
      maxQtd: 1,
    });
  }
  for (const r of lotes) {
    const q = qtdAtualJogoLote(r);
    out.push({
      entidade_tipo: "jogo",
      entidade_id: r.id,
      label: `${codigoEstoqueJogoLote(r)} · ${r.nome_lote} (Qtd: ${q})`,
      maxQtd: q,
    });
  }
  return out;
}

/** Limita texto de quantidade ao intervalo 1…maxQtd (equipamentos usam max 1). */
export function clampQuantidadeOs(raw: string, maxQtd: number): string {
  const lim = Math.max(0, Math.floor(maxQtd));
  if (raw.trim() === "") return raw;
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n)) return raw;
  if (lim <= 0) return "0";
  if (n < 1) return "1";
  if (n > lim) return String(lim);
  return String(n);
}

export async function fetchFornecedoresOs(): Promise<EstoqueFornecedorRow[]> {
  return fetchEstoqueFornecedores();
}

/* ─── Fetch / write ───────────────────────────────────────────────────────── */

type OsFetchRow = Omit<OrdemSaidaRow, "itens" | "fornecedor_razao_social"> & {
  tech_ops_ordem_saida_itens: OrdemSaidaItemRow[] | OrdemSaidaItemRow | null;
  tech_ops_estoque_fornecedores: { razao_social: string } | { razao_social: string }[] | null;
};

function unwrapEmbed<T>(raw: T | T[] | null | undefined): T | null {
  if (raw == null) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function mapOsRow(raw: OsFetchRow): OrdemSaidaRow {
  const { tech_ops_ordem_saida_itens: itensRaw, tech_ops_estoque_fornecedores: fornRaw, ...resto } = raw;
  const itens = (Array.isArray(itensRaw) ? itensRaw : itensRaw ? [itensRaw] : []).map((it) => ({
    ...it,
    retorno_confirmado: Boolean(it.retorno_confirmado),
  }));
  const forn = unwrapEmbed(fornRaw);
  return {
    ...resto,
    motivo_cancelamento: resto.motivo_cancelamento ?? "",
    cancelado_por_nome: resto.cancelado_por_nome ?? "",
    cancelado_em: resto.cancelado_em ?? null,
    observacoes_retorno: resto.observacoes_retorno ?? "",
    concluido_por_nome: resto.concluido_por_nome ?? "",
    concluido_em: resto.concluido_em ?? null,
    itens,
    fornecedor_razao_social: forn?.razao_social ?? null,
  };
}

const OS_SELECT = `
  id, tipo, competencia, codigo_num, status,
  origem_chave, destino_chave, destino_texto, fornecedor_id,
  data_saida, data_retorno, sem_retorno,
  data_saida_realizada, data_retorno_realizada,
  observacao, motivo_cancelamento, cancelado_por_nome, cancelado_em,
  observacoes_retorno, concluido_por_nome, concluido_em,
  solicitante_user_id, solicitante_nome, solicitante_time, responsavel_nome,
  ativo, created_at, updated_at,
  tech_ops_ordem_saida_itens(id, ordem_id, entidade_tipo, entidade_id, quantidade, label_snapshot, retorno_confirmado),
  tech_ops_estoque_fornecedores(razao_social)
`;

/**
 * Lista OS ativas na janela de 13 competências + qualquer OS ainda aberta
 * (solicitada/aberta) de competências anteriores — cobre carrossel, multi-mês e Histórico.
 */
export async function fetchOrdensSaida(tipo?: OrdemSaidaTipo): Promise<OrdemSaidaRow[]> {
  const { inicio } = getPeriodoHistoricoCompetencias();
  const competenciaInicio = `${inicio.slice(0, 7)}-01`;
  const rows = await fetchAllPages<OsFetchRow>(async (from, to) => {
    let q = supabase
      .from("tech_ops_ordem_saida")
      .select(OS_SELECT)
      .eq("ativo", true)
      .or(`competencia.gte.${competenciaInicio},status.in.(solicitada,aberta)`);
    if (tipo) q = q.eq("tipo", tipo);
    return q
      .order("competencia", { ascending: false })
      .order("codigo_num", { ascending: false })
      .range(from, to);
  });
  return rows.map(mapOsRow);
}

export async function fetchHistoricoOrdemSaida(ordemId: string): Promise<
  { id: string; acao: string; detalhe: string | null; autor_nome: string; created_at: string }[]
> {
  const { data, error } = await supabase
    .from("tech_ops_ordem_saida_historico")
    .select("id, acao, detalhe, autor_nome, created_at")
    .eq("ordem_id", ordemId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    acao: string;
    detalhe: string | null;
    autor_nome: string;
    created_at: string;
  }[];
}

export async function fetchAnotacoesOrdemSaida(ordemId: string): Promise<OrdemSaidaAnotacaoRow[]> {
  const { data, error } = await supabase
    .from("tech_ops_ordem_saida_anotacoes")
    .select("id, ordem_id, texto, autor_nome, created_at")
    .eq("ordem_id", ordemId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as OrdemSaidaAnotacaoRow[];
}

export async function criarAnotacaoOrdemSaida(params: {
  ordemId: string;
  texto: string;
  autorNome: string;
}): Promise<void> {
  const texto = params.texto.trim();
  if (!texto) return;
  const { error } = await supabase.from("tech_ops_ordem_saida_anotacoes").insert({
    ordem_id: params.ordemId,
    texto,
    autor_nome: params.autorNome,
  });
  if (error) throw error;
  await registrarHistoricoOrdemSaida({
    ordemId: params.ordemId,
    acao: "Anotação",
    detalhe: texto.length > 120 ? `${texto.slice(0, 117)}…` : texto,
    autorNome: params.autorNome,
  });
}

/** Lista para a aba Anotações: observação de abertura + registros da tabela. */
export function montarTimelineAnotacoesOs(
  row: OrdemSaidaRow,
  anotacoes: OrdemSaidaAnotacaoRow[],
): { id: string; titulo: string; texto: string; autor_nome: string; created_at: string }[] {
  const out: { id: string; titulo: string; texto: string; autor_nome: string; created_at: string }[] = [];
  for (const a of anotacoes) {
    out.push({
      id: a.id,
      titulo: "Anotação",
      texto: a.texto,
      autor_nome: a.autor_nome,
      created_at: a.created_at,
    });
  }
  if (row.observacao.trim()) {
    out.push({
      id: `abertura-${row.id}`,
      titulo: "Observação na abertura",
      texto: row.observacao.trim(),
      autor_nome: row.solicitante_nome || "—",
      created_at: row.created_at,
    });
  }
  if (row.motivo_cancelamento.trim() && row.cancelado_em) {
    out.push({
      id: `cancel-${row.id}`,
      titulo: "Motivo do cancelamento",
      texto: row.motivo_cancelamento.trim(),
      autor_nome: row.cancelado_por_nome || "—",
      created_at: row.cancelado_em,
    });
  }
  if (row.observacoes_retorno.trim() && row.concluido_em) {
    out.push({
      id: `retorno-${row.id}`,
      titulo: "Observações do retorno",
      texto: row.observacoes_retorno.trim(),
      autor_nome: row.concluido_por_nome || "—",
      created_at: row.concluido_em,
    });
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function reservarCodigo(tipo: OrdemSaidaTipo): Promise<{ codigo_num: number; competencia: string }> {
  const { data, error } = await supabase.rpc("tech_ops_ordem_saida_proximo_codigo", {
    p_tipo: tipo,
    p_competencia: null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.codigo_num || !row?.competencia) throw new Error("Falha ao reservar código da OS");
  return { codigo_num: Number(row.codigo_num), competencia: String(row.competencia).slice(0, 10) };
}

export async function registrarHistoricoOrdemSaida(params: {
  ordemId: string;
  acao: string;
  detalhe?: string;
  autorNome: string;
}): Promise<void> {
  const { error } = await supabase.from("tech_ops_ordem_saida_historico").insert({
    ordem_id: params.ordemId,
    acao: params.acao,
    detalhe: params.detalhe ?? null,
    autor_nome: params.autorNome,
  });
  if (error) throw error;
}

export type OsItemInput = {
  entidade_tipo: OrdemSaidaItemTipo;
  entidade_id: string;
  quantidade: number;
  label_snapshot: string;
};

export async function criarOrdemSaida(params: {
  tipo: OrdemSaidaTipo;
  origem_chave?: string | null;
  destino_chave?: string | null;
  destino_texto?: string | null;
  fornecedor_id?: string | null;
  data_saida: string;
  data_retorno?: string | null;
  sem_retorno?: boolean;
  observacao: string;
  solicitante_nome: string;
  solicitante_time?: string;
  responsavel_nome?: string;
  itens: OsItemInput[];
  autorNome: string;
}): Promise<string> {
  const { codigo_num, competencia } = await reservarCodigo(params.tipo);
  const { data, error } = await supabase
    .from("tech_ops_ordem_saida")
    .insert({
      tipo: params.tipo,
      competencia,
      codigo_num,
      status: "solicitada",
      origem_chave: params.origem_chave ?? null,
      destino_chave: params.destino_chave ?? null,
      destino_texto: params.destino_texto ?? null,
      fornecedor_id: params.fornecedor_id ?? null,
      data_saida: params.data_saida,
      data_retorno: params.sem_retorno ? null : (params.data_retorno ?? null),
      sem_retorno: params.sem_retorno ?? false,
      observacao: params.observacao.trim(),
      solicitante_nome: params.solicitante_nome.trim(),
      solicitante_time: (params.solicitante_time ?? "").trim(),
      responsavel_nome: (params.responsavel_nome ?? params.solicitante_nome).trim(),
    })
    .select("id")
    .single();
  if (error) throw error;
  const id = (data as { id: string }).id;

  if (params.itens.length) {
    const { error: errItens } = await supabase.from("tech_ops_ordem_saida_itens").insert(
      params.itens.map((it) => ({
        ordem_id: id,
        entidade_tipo: it.entidade_tipo,
        entidade_id: it.entidade_id,
        quantidade: it.quantidade,
        label_snapshot: it.label_snapshot,
      })),
    );
    if (errItens) throw errItens;
  }

  await registrarHistoricoOrdemSaida({
    ordemId: id,
    acao: "Solicitação",
    detalhe: formatCodigoOrdemSaida(params.tipo, competencia, codigo_num),
    autorNome: params.autorNome,
  });
  return id;
}

export async function atualizarStatusOrdemSaida(params: {
  row: OrdemSaidaRow;
  status: OrdemSaidaStatus;
  data_saida_realizada?: string | null;
  data_retorno_realizada?: string | null;
  autorNome: string;
}): Promise<void> {
  const payload: Record<string, unknown> = { status: params.status };
  if (params.data_saida_realizada !== undefined) payload.data_saida_realizada = params.data_saida_realizada;
  if (params.data_retorno_realizada !== undefined) payload.data_retorno_realizada = params.data_retorno_realizada;

  const { error } = await supabase.from("tech_ops_ordem_saida").update(payload).eq("id", params.row.id);
  if (error) throw error;

  await registrarHistoricoOrdemSaida({
    ordemId: params.row.id,
    acao: "Atualização de Status",
    detalhe: `${labelStatusOrdemSaida(params.row.status, params.row.tipo)} → ${labelStatusOrdemSaida(params.status, params.row.tipo)}`,
    autorNome: params.autorNome,
  });
}

export async function cancelarOrdemSaida(params: {
  row: OrdemSaidaRow;
  motivo: string;
  autorNome: string;
}): Promise<void> {
  const motivo = params.motivo.trim();
  if (!motivo) throw new Error("motivo obrigatório");
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("tech_ops_ordem_saida")
    .update({
      status: "cancelada",
      motivo_cancelamento: motivo,
      cancelado_por_nome: params.autorNome,
      cancelado_em: agora,
    })
    .eq("id", params.row.id);
  if (error) throw error;
  await registrarHistoricoOrdemSaida({
    ordemId: params.row.id,
    acao: "Cancelamento",
    detalhe: motivo,
    autorNome: params.autorNome,
  });
}

export async function aprovarOrdemSaida(params: {
  row: OrdemSaidaRow;
  autorNome: string;
}): Promise<OrdemSaidaStatus> {
  const status: OrdemSaidaStatus = params.row.sem_retorno ? "concluida" : "aberta";
  const payload: Record<string, unknown> = { status };
  if (status === "concluida") {
    payload.concluido_por_nome = params.autorNome;
    payload.concluido_em = new Date().toISOString();
  }

  const { error } = await supabase
    .from("tech_ops_ordem_saida")
    .update(payload)
    .eq("id", params.row.id)
    .eq("status", "solicitada");
  if (error) throw error;

  await registrarHistoricoOrdemSaida({
    ordemId: params.row.id,
    acao: "Aprovação",
    detalhe: params.row.sem_retorno
      ? "OS aprovada e concluída — sem retorno"
      : "OS aprovada — status Aberta",
    autorNome: params.autorNome,
  });
  return status;
}

export async function confirmarRetornoOrdemSaida(params: {
  row: OrdemSaidaRow;
  dataRetornoRealizada: string;
  itemIdsConfirmados: string[];
  observacoesRetorno: string;
  autorNome: string;
}): Promise<void> {
  const agora = new Date().toISOString();
  const obs = params.observacoesRetorno.trim();
  const payload: Record<string, unknown> = {
    status: "concluida",
    data_retorno_realizada: params.dataRetornoRealizada,
    observacoes_retorno: obs,
    concluido_por_nome: params.autorNome,
    concluido_em: agora,
  };
  if (!params.row.data_saida_realizada && params.row.data_saida) {
    payload.data_saida_realizada = params.row.data_saida;
  }
  const { error } = await supabase.from("tech_ops_ordem_saida").update(payload).eq("id", params.row.id);
  if (error) throw error;

  if (params.itemIdsConfirmados.length) {
    const { error: errItens } = await supabase
      .from("tech_ops_ordem_saida_itens")
      .update({ retorno_confirmado: true })
      .eq("ordem_id", params.row.id)
      .in("id", params.itemIdsConfirmados);
    if (errItens) throw errItens;
  }

  await registrarHistoricoOrdemSaida({
    ordemId: params.row.id,
    acao: "Confirmação de Retorno",
    detalhe: obs || `Retorno em ${formatDataBrOs(params.dataRetornoRealizada)}`,
    autorNome: params.autorNome,
  });
}

export async function alterarOrdemSaida(params: {
  row: OrdemSaidaRow;
  origem_chave?: string | null;
  destino_chave?: string | null;
  destino_texto?: string | null;
  fornecedor_id?: string | null;
  data_saida: string;
  data_retorno?: string | null;
  sem_retorno?: boolean;
  itens: OsItemInput[];
  autorNome: string;
}): Promise<void> {
  const { error } = await supabase
    .from("tech_ops_ordem_saida")
    .update({
      status: "solicitada",
      origem_chave: params.origem_chave ?? null,
      destino_chave: params.destino_chave ?? null,
      destino_texto: params.destino_texto ?? null,
      fornecedor_id: params.fornecedor_id ?? null,
      data_saida: params.data_saida,
      data_retorno: params.sem_retorno ? null : (params.data_retorno ?? null),
      sem_retorno: params.sem_retorno ?? false,
      data_saida_realizada: null,
      data_retorno_realizada: null,
      motivo_cancelamento: "",
      cancelado_por_nome: "",
      cancelado_em: null,
      observacoes_retorno: "",
      concluido_por_nome: "",
      concluido_em: null,
    })
    .eq("id", params.row.id);
  if (error) throw error;

  const { error: errDel } = await supabase.from("tech_ops_ordem_saida_itens").delete().eq("ordem_id", params.row.id);
  if (errDel) throw errDel;

  if (params.itens.length) {
    const { error: errItens } = await supabase.from("tech_ops_ordem_saida_itens").insert(
      params.itens.map((it) => ({
        ordem_id: params.row.id,
        entidade_tipo: it.entidade_tipo,
        entidade_id: it.entidade_id,
        quantidade: it.quantidade,
        label_snapshot: it.label_snapshot,
        retorno_confirmado: false,
      })),
    );
    if (errItens) throw errItens;
  }

  await registrarHistoricoOrdemSaida({
    ordemId: params.row.id,
    acao: "Alteração da OS",
    detalhe: "Dados e itens atualizados — status Solicitada",
    autorNome: params.autorNome,
  });
}
