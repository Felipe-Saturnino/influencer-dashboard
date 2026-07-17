import { supabase } from "./supabase";
import {
  codigoEstoqueEquipamento,
  codigoEstoqueItem,
  codigoEstoqueJogoLote,
  estoqueDisponivelItem,
  fetchEstoqueEquipamentos,
  fetchEstoqueFornecedores,
  fetchEstoqueItens,
  fetchEstoqueJogoLotes,
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

export interface OsItemDisponivel {
  entidade_tipo: OrdemSaidaItemTipo;
  entidade_id: string;
  label: string;
  /** Para equipamentos, qty sempre 1. */
  maxQtd: number;
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

export async function fetchItensDisponiveisOs(): Promise<OsItemDisponivel[]> {
  const [itens, equips, lotes] = await Promise.all([
    fetchEstoqueItens(),
    fetchEstoqueEquipamentos(),
    fetchEstoqueJogoLotes(),
  ]);
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

/** Manutenção: lista todas as linhas ativas (sem filtro de estoque), conforme mockup. */
export async function fetchItensManutencaoOs(): Promise<OsItemDisponivel[]> {
  const [itens, equips, lotes] = await Promise.all([
    fetchEstoqueItens(),
    fetchEstoqueEquipamentos(),
    fetchEstoqueJogoLotes(),
  ]);
  const out: OsItemDisponivel[] = [];
  for (const r of itens as EstoqueItemRow[]) {
    out.push({
      entidade_tipo: "item",
      entidade_id: r.id,
      label: `${codigoEstoqueItem(r)} · ${r.nome}`,
      maxQtd: Math.max(1, estoqueDisponivelItem(r) || 1),
    });
  }
  for (const r of equips as EstoqueEquipamentoRow[]) {
    out.push({
      entidade_tipo: "equipamento",
      entidade_id: r.id,
      label: `${codigoEstoqueEquipamento(r)} · ${r.nome}`,
      maxQtd: 1,
    });
  }
  for (const r of lotes as EstoqueJogoLoteRow[]) {
    out.push({
      entidade_tipo: "jogo",
      entidade_id: r.id,
      label: `${codigoEstoqueJogoLote(r)} · ${r.nome_lote}`,
      maxQtd: Math.max(1, qtdAtualJogoLote(r) || 1),
    });
  }
  return out;
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
  const itens = Array.isArray(itensRaw) ? itensRaw : itensRaw ? [itensRaw] : [];
  const forn = unwrapEmbed(fornRaw);
  return {
    ...resto,
    itens,
    fornecedor_razao_social: forn?.razao_social ?? null,
  };
}

export async function fetchOrdensSaida(tipo?: OrdemSaidaTipo): Promise<OrdemSaidaRow[]> {
  let q = supabase
    .from("tech_ops_ordem_saida")
    .select("*, tech_ops_ordem_saida_itens(*), tech_ops_estoque_fornecedores(razao_social)")
    .eq("ativo", true)
    .order("competencia", { ascending: false })
    .order("codigo_num", { ascending: false });
  if (tipo) q = q.eq("tipo", tipo);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as OsFetchRow[]).map(mapOsRow);
}

export async function fetchHistoricoOrdemSaida(ordemId: string): Promise<
  { id: string; acao: string; detalhe: string | null; autor_nome: string; created_at: string }[]
> {
  const { data, error } = await supabase
    .from("tech_ops_ordem_saida_historico")
    .select("id, acao, detalhe, autor_nome, created_at")
    .eq("ordem_id", ordemId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    acao: string;
    detalhe: string | null;
    autor_nome: string;
    created_at: string;
  }[];
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
