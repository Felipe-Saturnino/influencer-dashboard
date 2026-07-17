import { supabase } from "./supabase";

/* ─── Tech Ops → Gestão de Estoque — tipos e helpers de domínio ───────────── */

export type EstoqueItemCategoria =
  | "cabos_conectores"
  | "energia"
  | "iluminacao"
  | "rede_it"
  | "tripes_suportes"
  | "audio_video";

export type EstoqueEquipCategoria =
  | "roleta"
  | "maquina_cartas"
  | "camera"
  | "iluminacao"
  | "lentes"
  | "video_switcher"
  | "audio";

export type EstoqueJogoCategoria = "bolinhas" | "cartas" | "tecidos";

export type EstoqueEquipStatus = "estoque" | "em_uso" | "manutencao";

export type EstoqueEntidadeTipo = "item" | "equipamento" | "jogo" | "fornecedor";

export const ESTOQUE_ITEM_CATEGORIA_LABEL: Record<EstoqueItemCategoria, string> = {
  cabos_conectores: "Cabos e Conectores",
  energia: "Energia",
  iluminacao: "Iluminação",
  rede_it: "Rede / IT",
  tripes_suportes: "Tripés e Suportes",
  audio_video: "Áudio e Vídeo",
};

export const ESTOQUE_EQUIP_CATEGORIA_LABEL: Record<EstoqueEquipCategoria, string> = {
  roleta: "Roleta",
  maquina_cartas: "Máquina de Cartas",
  camera: "Câmera",
  iluminacao: "Iluminação",
  lentes: "Lentes",
  video_switcher: "Vídeo/Switcher",
  audio: "Áudio",
};

export const ESTOQUE_JOGO_CATEGORIA_LABEL: Record<EstoqueJogoCategoria, string> = {
  bolinhas: "Bolinhas",
  cartas: "Cartas",
  tecidos: "Tecidos",
};

export const ESTOQUE_ITEM_CATEGORIAS = Object.keys(ESTOQUE_ITEM_CATEGORIA_LABEL) as EstoqueItemCategoria[];
export const ESTOQUE_EQUIP_CATEGORIAS = Object.keys(ESTOQUE_EQUIP_CATEGORIA_LABEL) as EstoqueEquipCategoria[];
export const ESTOQUE_JOGO_CATEGORIAS = Object.keys(ESTOQUE_JOGO_CATEGORIA_LABEL) as EstoqueJogoCategoria[];

export const ESTOQUE_EQUIP_STATUS_LABEL: Record<EstoqueEquipStatus, string> = {
  estoque: "Estoque",
  em_uso: "Em uso",
  manutencao: "Manutenção",
};

/** Cores de workflow do domínio (badge de status) — não são marca. */
export const ESTOQUE_EQUIP_STATUS_COLOR: Record<EstoqueEquipStatus, string> = {
  estoque: "#22c55e",
  em_uso: "#3b82f6",
  manutencao: "#f59e0b",
};

/* ─── Linhas (espelho das tabelas Supabase) ───────────────────────────────── */

export interface EstoqueItemRow {
  id: string;
  codigo_num: number;
  categoria: EstoqueItemCategoria;
  nome: string;
  marca: string;
  modelo: string;
  quantidade_total: number;
  quantidade_em_uso: number;
  quantidade_manutencao: number;
  valor_unitario: number;
  estudio_slug: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EstoqueEquipamentoRow {
  id: string;
  codigo_num: number;
  categoria: EstoqueEquipCategoria;
  nome: string;
  numero_serie: string;
  marca: string;
  modelo: string;
  valor: number;
  status: EstoqueEquipStatus;
  estudio_slug: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EstoqueJogoLoteRow {
  id: string;
  codigo_num: number;
  categoria: EstoqueJogoCategoria;
  nome_lote: string;
  qtd_inicial: number;
  qtd_consumida: number;
  qtd_descartada: number;
  estudio_slug: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EstoqueFornecedorContatoRow {
  id: string;
  fornecedor_id: string;
  nome: string;
  telefone: string;
  email: string;
  created_at: string;
}

export interface EstoqueFornecedorRow {
  id: string;
  razao_social: string;
  cnpj: string;
  tipo: string;
  observacao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  contatos: EstoqueFornecedorContatoRow[];
}

export interface EstoqueAnotacaoRow {
  id: string;
  entidade_tipo: EstoqueEntidadeTipo;
  entidade_id: string;
  texto: string;
  anexo_url: string | null;
  autor_nome: string;
  created_at: string;
}

export interface EstoqueHistoricoRow {
  id: string;
  entidade_tipo: EstoqueEntidadeTipo;
  entidade_id: string;
  acao: string;
  detalhe: string | null;
  autor_nome: string;
  created_at: string;
}

/* ─── Códigos e quantidades derivadas ─────────────────────────────────────── */

export function formatCodigoEstoque(prefixo: "ITM" | "EQP" | "JOG", num: number): string {
  return `${prefixo}-${String(num).padStart(4, "0")}`;
}

/**
 * Próximo código previsto (pré-visualização no modal Novo) = maior `codigo_num`
 * carregado + 1. A numeração definitiva continua sendo atribuída pelo banco.
 */
export function proximoCodigoEstoque(
  prefixo: "ITM" | "EQP" | "JOG",
  rows: { codigo_num: number }[],
): string {
  const max = rows.reduce((m, r) => Math.max(m, r.codigo_num), 0);
  return formatCodigoEstoque(prefixo, max + 1);
}

export const codigoEstoqueItem = (r: Pick<EstoqueItemRow, "codigo_num">) =>
  formatCodigoEstoque("ITM", r.codigo_num);
export const codigoEstoqueEquipamento = (r: Pick<EstoqueEquipamentoRow, "codigo_num">) =>
  formatCodigoEstoque("EQP", r.codigo_num);
export const codigoEstoqueJogoLote = (r: Pick<EstoqueJogoLoteRow, "codigo_num">) =>
  formatCodigoEstoque("JOG", r.codigo_num);

/** Estoque disponível do item = total − em uso − manutenção (nunca negativo). */
export function estoqueDisponivelItem(
  r: Pick<EstoqueItemRow, "quantidade_total" | "quantidade_em_uso" | "quantidade_manutencao">,
): number {
  return Math.max(0, r.quantidade_total - r.quantidade_em_uso - r.quantidade_manutencao);
}

/** Qtd atual do lote de jogo = inicial − consumida − descartada (nunca negativa). */
export function qtdAtualJogoLote(
  r: Pick<EstoqueJogoLoteRow, "qtd_inicial" | "qtd_consumida" | "qtd_descartada">,
): number {
  return Math.max(0, r.qtd_inicial - r.qtd_consumida - r.qtd_descartada);
}

/** Máscara visual de CNPJ (00.000.000/0000-00) — mantém o texto original se incompleto. */
export function formatCnpjEstoque(cnpj: string): string {
  const dig = cnpj.replace(/\D/g, "");
  if (dig.length !== 14) return cnpj;
  return `${dig.slice(0, 2)}.${dig.slice(2, 5)}.${dig.slice(5, 8)}/${dig.slice(8, 12)}-${dig.slice(12)}`;
}

export function formatDataHoraEstoque(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-BR")} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/* ─── Fetch ───────────────────────────────────────────────────────────────── */

export async function fetchEstoqueItens(): Promise<EstoqueItemRow[]> {
  const { data, error } = await supabase
    .from("tech_ops_estoque_itens")
    .select("*")
    .eq("ativo", true)
    .order("codigo_num", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EstoqueItemRow[];
}

export async function fetchEstoqueEquipamentos(): Promise<EstoqueEquipamentoRow[]> {
  const { data, error } = await supabase
    .from("tech_ops_estoque_equipamentos")
    .select("*")
    .eq("ativo", true)
    .order("codigo_num", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EstoqueEquipamentoRow[];
}

export async function fetchEstoqueJogoLotes(): Promise<EstoqueJogoLoteRow[]> {
  const { data, error } = await supabase
    .from("tech_ops_estoque_jogo_lotes")
    .select("*")
    .eq("ativo", true)
    .order("codigo_num", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EstoqueJogoLoteRow[];
}

type FornecedorFetchRow = Omit<EstoqueFornecedorRow, "contatos"> & {
  tech_ops_estoque_fornecedor_contatos: EstoqueFornecedorContatoRow[] | EstoqueFornecedorContatoRow | null;
};

function unwrapContatos(
  raw: FornecedorFetchRow["tech_ops_estoque_fornecedor_contatos"],
): EstoqueFornecedorContatoRow[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export async function fetchEstoqueFornecedores(): Promise<EstoqueFornecedorRow[]> {
  const { data, error } = await supabase
    .from("tech_ops_estoque_fornecedores")
    .select("*, tech_ops_estoque_fornecedor_contatos(*)")
    .order("razao_social", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as FornecedorFetchRow[]).map((f) => {
    const { tech_ops_estoque_fornecedor_contatos: contatosRaw, ...resto } = f;
    return {
      ...resto,
      contatos: unwrapContatos(contatosRaw).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    };
  });
}

export async function fetchEstoqueAnotacoes(
  entidadeTipo: EstoqueEntidadeTipo,
  entidadeId: string,
): Promise<EstoqueAnotacaoRow[]> {
  const { data, error } = await supabase
    .from("tech_ops_estoque_anotacoes")
    .select("id, entidade_tipo, entidade_id, texto, anexo_url, autor_nome, created_at")
    .eq("entidade_tipo", entidadeTipo)
    .eq("entidade_id", entidadeId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as EstoqueAnotacaoRow[];
}

export async function fetchEstoqueHistorico(
  entidadeTipo: EstoqueEntidadeTipo,
  entidadeId: string,
): Promise<EstoqueHistoricoRow[]> {
  const { data, error } = await supabase
    .from("tech_ops_estoque_historico")
    .select("id, entidade_tipo, entidade_id, acao, detalhe, autor_nome, created_at")
    .eq("entidade_tipo", entidadeTipo)
    .eq("entidade_id", entidadeId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as EstoqueHistoricoRow[];
}

/* ─── Escrita (histórico, anotações, anexos) ──────────────────────────────── */

export async function registrarHistoricoEstoque(params: {
  entidadeTipo: EstoqueEntidadeTipo;
  entidadeId: string;
  acao: string;
  detalhe?: string | null;
  autorNome: string;
}): Promise<void> {
  const { error } = await supabase.from("tech_ops_estoque_historico").insert({
    entidade_tipo: params.entidadeTipo,
    entidade_id: params.entidadeId,
    acao: params.acao,
    detalhe: params.detalhe ?? null,
    autor_nome: params.autorNome,
  });
  if (error) throw error;
}

export async function registrarAnotacaoEstoque(params: {
  entidadeTipo: EstoqueEntidadeTipo;
  entidadeId: string;
  texto: string;
  anexoUrl?: string | null;
  autorNome: string;
}): Promise<void> {
  const { error } = await supabase.from("tech_ops_estoque_anotacoes").insert({
    entidade_tipo: params.entidadeTipo,
    entidade_id: params.entidadeId,
    texto: params.texto,
    anexo_url: params.anexoUrl ?? null,
    autor_nome: params.autorNome,
  });
  if (error) throw error;
}

const ESTOQUE_ANEXO_BUCKET = "tech-ops-estoque";

/** Sobe o anexo opcional da anotação e devolve a URL pública. */
export async function uploadAnexoAnotacaoEstoque(file: File): Promise<string> {
  const seguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `anotacoes/${crypto.randomUUID()}-${seguro}`;
  const { error } = await supabase.storage.from(ESTOQUE_ANEXO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(ESTOQUE_ANEXO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
