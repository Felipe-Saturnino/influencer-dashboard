import { supabase } from "./supabase";
import { fetchAllPages } from "./supabasePaginate";
import {
  chaveEstudioOs,
  formatCodigoOrdemSaida,
  isChaveEstudioOs,
  OS_LOCAIS_FIXOS,
  slugFromChaveEstudioOs,
  type OrdemSaidaItemTipo,
  type OrdemSaidaRow,
} from "./techOpsOrdemSaida";
import {
  codigoEstoqueEquipamento,
  codigoEstoqueItem,
  codigoEstoqueJogoLote,
  ESTOQUE_EQUIP_CATEGORIA_LABEL,
  ESTOQUE_ITEM_CATEGORIA_LABEL,
  ESTOQUE_JOGO_CATEGORIA_LABEL,
  estoqueDisponivelItem,
  formatDataHoraEstoque,
  qtdAtualJogoLote,
  type EstoqueEquipamentoRow,
  type EstoqueEquipCategoria,
  type EstoqueItemRow,
  type EstoqueJogoLoteRow,
} from "./techOpsEstoque";

/* ─── Locais do carrossel (sem Estoque) ───────────────────────────────────── */

export const ITENS_ALOCADOS_LOCAIS_FIXOS = OS_LOCAIS_FIXOS.filter((l) => l.chave !== "estoque");

export type ItensAlocadosLocalFixo = (typeof ITENS_ALOCADOS_LOCAIS_FIXOS)[number]["chave"];

export type ItemAlocadoStatus = "em_uso" | "verificar" | "manutencao";
export type TipoVerificacaoChecklist = "preventiva" | "pontual" | "escalada";
export type HistoricoEventoTipo = "checklist" | "manutencao" | "movimentacao";

export const ITEM_ALOCADO_STATUS_LABEL: Record<ItemAlocadoStatus, string> = {
  em_uso: "Em Uso",
  verificar: "Verificar",
  manutencao: "Manutenção",
};

export const ITEM_ALOCADO_STATUS_COLOR: Record<ItemAlocadoStatus, string> = {
  em_uso: "#3b82f6",
  verificar: "#f59e0b",
  manutencao: "#d97706",
};

export const TIPO_VERIFICACAO_LABEL: Record<TipoVerificacaoChecklist, string> = {
  preventiva: "Preventiva",
  pontual: "Pontual",
  escalada: "Escalada",
};

export { chaveEstudioOs, isChaveEstudioOs, slugFromChaveEstudioOs, formatDataHoraEstoque };

export function labelLocalItensAlocados(
  chave: string,
  estudioNomePorSlug: Record<string, string>,
): string {
  const fixo = ITENS_ALOCADOS_LOCAIS_FIXOS.find((l) => l.chave === chave);
  if (fixo) return fixo.label;
  const slug = slugFromChaveEstudioOs(chave);
  if (slug) return estudioNomePorSlug[slug] ?? slug;
  return chave;
}

/** Meses: atual + 2 anteriores, mais novo → mais antigo. */
export function buildMesesItensAlocados(ref = new Date()): { key: string; label: string }[] {
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const meses: { key: string; label: string }[] = [];
  for (let i = 0; i <= 2; i++) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    meses.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: `${nomes[m]} ${y}`,
    });
  }
  return meses;
}

export function labelMesaFiltro(nomeMesa: string, numeroMesa: string | null): string {
  const num = (numeroMesa ?? "").trim();
  return num ? `${nomeMesa.trim()} - ${num}` : nomeMesa.trim();
}

/** Formato Limpeza/Manutenção: [JOGO] - [NÚMERO]. */
export function labelMesaJogoNumero(tipoJogo: string, numeroMesa: string | null): string {
  const jogo = (tipoJogo ?? "").trim() || "—";
  const num = (numeroMesa ?? "").trim();
  return num ? `${jogo} - ${num}` : jogo;
}

export function modeloMarcaLabel(modelo: string | null | undefined, marca: string | null | undefined): string {
  const mo = (modelo ?? "").trim();
  const ma = (marca ?? "").trim();
  if (mo && ma) return `${mo} - ${ma}`;
  if (mo) return mo;
  if (ma) return ma;
  return "—";
}

/* ─── Tipos de linha ──────────────────────────────────────────────────────── */

export interface MesaItensAlocadosOption {
  id: string;
  nome_mesa: string;
  tipo_jogo: string;
  numero_mesa: string | null;
  estudio_slug: string | null;
}

export interface ItemAlocadoSetRow {
  entidade_tipo: OrdemSaidaItemTipo;
  entidade_id: string;
  codigo: string;
  nome: string;
  categoria: string;
  modelo_marca: string;
  quantidade: number;
  status: ItemAlocadoStatus;
  alocacao_data: string | null; /* ISO */
  /** OS abertas que sustentam a alocação neste local */
  alocacoes: {
    ordem_id: string;
    codigo_os: string;
    quantidade: number;
    data_hora: string;
    usuario: string;
  }[];
  /* Detalhes estoque para Modal Ver */
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  valor?: number;
  valor_unitario?: number;
  qtd_estoque: number;
  qtd_uso_local: number;
}

export interface LimpezaRow {
  id: string;
  local_chave: string;
  mesa_id: string | null;
  equipamento_id: string;
  data_hora: string;
  responsavel_nome: string;
  equipamento_label: string;
  mesa_label: string;
}

export interface ManutencaoRegRow {
  id: string;
  local_chave: string;
  mesa_id: string | null;
  equipamento_id: string;
  tipo: string;
  data_hora: string;
  responsavel_nome: string;
  equipamento_label: string;
  mesa_label: string;
}

export interface EquipamentoLimpezaOption {
  id: string;
  nome: string;
  numero_serie: string;
  label: string;
}

export interface HistoricoChecklistEvento {
  id: string;
  data_hora: string;
  autor_nome: string;
  tipo_verificacao: string;
  status_anterior: string;
  status_novo: string;
  observacao: string;
}

export interface HistoricoMovimentacaoEvento {
  id: string;
  codigo_os: string;
  data_hora: string;
  usuario: string;
  origem: string;
  observacao: string;
}

/* ─── Fetch catálogos ─────────────────────────────────────────────────────── */

export async function fetchEstudiosItensAlocados(): Promise<{ slug: string; nome: string }[]> {
  const { data, error } = await supabase
    .from("estudios_spin")
    .select("slug, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((e: { slug: string; nome: string }) => ({ slug: e.slug, nome: e.nome }));
}

export async function fetchMesasItensAlocados(estudioSlug: string | null): Promise<MesaItensAlocadosOption[]> {
  if (!estudioSlug) return [];
  const { data, error } = await supabase
    .from("mesas_spin_cadastro")
    .select("id, nome_mesa, tipo_jogo, numero_mesa, estudio_slug")
    .eq("estudio_slug", estudioSlug)
    .order("nome_mesa", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MesaItensAlocadosOption[];
}

/* ─── Set: agrega OS internas abertas no destino ──────────────────────────── */

type OsRaw = {
  id: string;
  tipo: string;
  competencia: string;
  codigo_num: number;
  status: string;
  destino_chave: string | null;
  origem_chave: string | null;
  observacao: string;
  solicitante_nome: string;
  data_saida_realizada: string | null;
  created_at: string;
  tech_ops_ordem_saida_itens:
    | {
        id: string;
        entidade_tipo: OrdemSaidaItemTipo;
        entidade_id: string;
        quantidade: number;
        label_snapshot: string;
      }[]
    | null;
};

export async function fetchItensSetNoLocal(localChave: string): Promise<ItemAlocadoSetRow[]> {
  const { data: osData, error: osErr } = await supabase
    .from("tech_ops_ordem_saida")
    .select(
      `
      id, tipo, competencia, codigo_num, status, destino_chave, origem_chave, observacao,
      solicitante_nome, data_saida_realizada, created_at,
      tech_ops_ordem_saida_itens(id, entidade_tipo, entidade_id, quantidade, label_snapshot)
    `,
    )
    .eq("tipo", "interna")
    .eq("status", "aberta")
    .eq("destino_chave", localChave)
    .eq("ativo", true);
  if (osErr) throw osErr;

  const ordens = (osData ?? []) as OsRaw[];
  const agg = new Map<
    string,
    {
      entidade_tipo: OrdemSaidaItemTipo;
      entidade_id: string;
      quantidade: number;
      alocacoes: ItemAlocadoSetRow["alocacoes"];
      primeiraAlocacao: string | null;
    }
  >();

  for (const os of ordens) {
    const itens = os.tech_ops_ordem_saida_itens ?? [];
    const codigoOs = formatCodigoOrdemSaida(
      os.tipo as OrdemSaidaRow["tipo"],
      String(os.competencia).slice(0, 10),
      os.codigo_num,
    );
    const dataHora = os.data_saida_realizada
      ? `${os.data_saida_realizada}T12:00:00`
      : os.created_at;
    for (const it of itens) {
      const key = `${it.entidade_tipo}:${it.entidade_id}`;
      const prev = agg.get(key);
      const aloc = {
        ordem_id: os.id,
        codigo_os: codigoOs,
        quantidade: it.quantidade,
        data_hora: dataHora,
        usuario: os.solicitante_nome || "—",
      };
      if (!prev) {
        agg.set(key, {
          entidade_tipo: it.entidade_tipo,
          entidade_id: it.entidade_id,
          quantidade: it.quantidade,
          alocacoes: [aloc],
          primeiraAlocacao: dataHora,
        });
      } else {
        prev.quantidade += it.quantidade;
        prev.alocacoes.push(aloc);
        if (dataHora < (prev.primeiraAlocacao ?? dataHora)) prev.primeiraAlocacao = dataHora;
      }
    }
  }

  if (agg.size === 0) return [];

  const idsItem = [...agg.values()].filter((a) => a.entidade_tipo === "item").map((a) => a.entidade_id);
  const idsEqp = [...agg.values()].filter((a) => a.entidade_tipo === "equipamento").map((a) => a.entidade_id);
  const idsJog = [...agg.values()].filter((a) => a.entidade_tipo === "jogo").map((a) => a.entidade_id);

  const [itensRes, eqpRes, jogRes, statusRes] = await Promise.all([
    idsItem.length
      ? supabase
          .from("tech_ops_estoque_itens")
          .select(
            "id, codigo_num, categoria, nome, marca, modelo, quantidade_total, quantidade_em_uso, quantidade_manutencao, valor_unitario",
          )
          .in("id", idsItem)
      : Promise.resolve({ data: [], error: null }),
    idsEqp.length
      ? supabase
          .from("tech_ops_estoque_equipamentos")
          .select("id, codigo_num, categoria, nome, numero_serie, marca, modelo, valor, status")
          .in("id", idsEqp)
      : Promise.resolve({ data: [], error: null }),
    idsJog.length
      ? supabase
          .from("tech_ops_estoque_jogo_lotes")
          .select("id, codigo_num, categoria, nome_lote, qtd_inicial, qtd_consumida, qtd_descartada")
          .in("id", idsJog)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("tech_ops_itens_alocados_status")
      .select("entidade_tipo, entidade_id, status")
      .eq("local_chave", localChave),
  ]);

  if (itensRes.error) throw itensRes.error;
  if (eqpRes.error) throw eqpRes.error;
  if (jogRes.error) throw jogRes.error;
  if (statusRes.error) throw statusRes.error;

  const mapItem = new Map((itensRes.data ?? []).map((r) => [r.id as string, r as EstoqueItemRow]));
  const mapEqp = new Map((eqpRes.data ?? []).map((r) => [r.id as string, r as EstoqueEquipamentoRow]));
  const mapJog = new Map((jogRes.data ?? []).map((r) => [r.id as string, r as EstoqueJogoLoteRow]));
  const mapStatus = new Map(
    (statusRes.data ?? []).map((s: { entidade_tipo: string; entidade_id: string; status: string }) => [
      `${s.entidade_tipo}:${s.entidade_id}`,
      s.status as ItemAlocadoStatus,
    ]),
  );

  const rows: ItemAlocadoSetRow[] = [];
  for (const a of agg.values()) {
    const st = mapStatus.get(`${a.entidade_tipo}:${a.entidade_id}`) ?? "em_uso";
    if (a.entidade_tipo === "item") {
      const e = mapItem.get(a.entidade_id);
      if (!e) continue;
      rows.push({
        entidade_tipo: "item",
        entidade_id: e.id,
        codigo: codigoEstoqueItem(e),
        nome: e.nome,
        categoria: ESTOQUE_ITEM_CATEGORIA_LABEL[e.categoria] ?? e.categoria,
        modelo_marca: modeloMarcaLabel(e.modelo, e.marca),
        quantidade: a.quantidade,
        status: st,
        alocacao_data: a.primeiraAlocacao,
        alocacoes: a.alocacoes,
        marca: e.marca,
        modelo: e.modelo,
        valor_unitario: e.valor_unitario,
        qtd_estoque: estoqueDisponivelItem(e),
        qtd_uso_local: a.quantidade,
      });
    } else if (a.entidade_tipo === "equipamento") {
      const e = mapEqp.get(a.entidade_id);
      if (!e) continue;
      rows.push({
        entidade_tipo: "equipamento",
        entidade_id: e.id,
        codigo: codigoEstoqueEquipamento(e),
        nome: e.nome,
        categoria: ESTOQUE_EQUIP_CATEGORIA_LABEL[e.categoria] ?? e.categoria,
        modelo_marca: modeloMarcaLabel(e.modelo, e.marca),
        quantidade: a.quantidade,
        status: st,
        alocacao_data: a.primeiraAlocacao,
        alocacoes: a.alocacoes,
        marca: e.marca,
        modelo: e.modelo,
        numero_serie: e.numero_serie,
        valor: e.valor,
        qtd_estoque: e.status === "estoque" ? 1 : 0,
        qtd_uso_local: a.quantidade,
      });
    } else {
      const e = mapJog.get(a.entidade_id);
      if (!e) continue;
      rows.push({
        entidade_tipo: "jogo",
        entidade_id: e.id,
        codigo: codigoEstoqueJogoLote(e),
        nome: e.nome_lote,
        categoria: ESTOQUE_JOGO_CATEGORIA_LABEL[e.categoria] ?? e.categoria,
        modelo_marca: "—",
        quantidade: a.quantidade,
        status: st,
        alocacao_data: a.primeiraAlocacao,
        alocacoes: a.alocacoes,
        qtd_estoque: qtdAtualJogoLote(e),
        qtd_uso_local: a.quantidade,
      });
    }
  }

  rows.sort((x, y) => x.codigo.localeCompare(y.codigo, "pt-BR"));
  return rows;
}

/* ─── Checklist ───────────────────────────────────────────────────────────── */

export async function salvarChecklistItensAlocados(params: {
  localChave: string;
  mesaId: string | null;
  tipoVerificacao: TipoVerificacaoChecklist;
  observacao: string;
  autorNome: string;
  itens: {
    entidade_tipo: OrdemSaidaItemTipo;
    entidade_id: string;
    status_anterior: ItemAlocadoStatus;
    status_novo: ItemAlocadoStatus;
    label_snapshot: string;
  }[];
}): Promise<void> {
  const { data: chk, error: errChk } = await supabase
    .from("tech_ops_itens_alocados_checklist")
    .insert({
      local_chave: params.localChave,
      mesa_id: params.mesaId,
      tipo_verificacao: params.tipoVerificacao,
      observacao: params.observacao.trim(),
      autor_nome: params.autorNome,
    })
    .select("id")
    .single();
  if (errChk) throw errChk;
  const checklistId = chk.id as string;

  const { error: errItens } = await supabase.from("tech_ops_itens_alocados_checklist_itens").insert(
    params.itens.map((i) => ({
      checklist_id: checklistId,
      entidade_tipo: i.entidade_tipo,
      entidade_id: i.entidade_id,
      status_anterior: i.status_anterior,
      status_novo: i.status_novo,
      label_snapshot: i.label_snapshot,
    })),
  );
  if (errItens) throw errItens;

  for (const i of params.itens) {
    const { error: errSt } = await supabase.from("tech_ops_itens_alocados_status").upsert(
      {
        local_chave: params.localChave,
        entidade_tipo: i.entidade_tipo,
        entidade_id: i.entidade_id,
        status: i.status_novo,
        updated_by_nome: params.autorNome,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "local_chave,entidade_tipo,entidade_id" },
    );
    if (errSt) throw errSt;
  }

  const { error: errHist } = await supabase.from("tech_ops_itens_alocados_historico").insert(
    params.itens.map((i) => ({
      entidade_tipo: i.entidade_tipo,
      entidade_id: i.entidade_id,
      local_chave: params.localChave,
      tipo_evento: "checklist",
      checklist_id: checklistId,
      tipo_verificacao: params.tipoVerificacao,
      status_anterior: i.status_anterior,
      status_novo: i.status_novo,
      observacao: params.observacao.trim(),
      autor_nome: params.autorNome,
    })),
  );
  if (errHist) throw errHist;
}

/* ─── Histórico ───────────────────────────────────────────────────────────── */

export async function fetchHistoricoChecklistItem(
  entidadeTipo: OrdemSaidaItemTipo,
  entidadeId: string,
): Promise<HistoricoChecklistEvento[]> {
  const { data, error } = await supabase
    .from("tech_ops_itens_alocados_historico")
    .select("id, created_at, autor_nome, tipo_verificacao, status_anterior, status_novo, observacao")
    .eq("entidade_tipo", entidadeTipo)
    .eq("entidade_id", entidadeId)
    .eq("tipo_evento", "checklist")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((h) => ({
    id: h.id as string,
    data_hora: h.created_at as string,
    autor_nome: (h.autor_nome as string) || "—",
    tipo_verificacao: TIPO_VERIFICACAO_LABEL[(h.tipo_verificacao as TipoVerificacaoChecklist) ?? "pontual"] ?? String(h.tipo_verificacao ?? "—"),
    status_anterior: ITEM_ALOCADO_STATUS_LABEL[(h.status_anterior as ItemAlocadoStatus) ?? "em_uso"] ?? String(h.status_anterior),
    status_novo: ITEM_ALOCADO_STATUS_LABEL[(h.status_novo as ItemAlocadoStatus) ?? "em_uso"] ?? String(h.status_novo),
    observacao: (h.observacao as string) || "—",
  }));
}

export async function fetchHistoricoMovimentacaoItem(
  entidadeTipo: OrdemSaidaItemTipo,
  entidadeId: string,
  estudioNomePorSlug: Record<string, string>,
): Promise<HistoricoMovimentacaoEvento[]> {
  const { data, error } = await supabase
    .from("tech_ops_ordem_saida_itens")
    .select(
      `
      quantidade,
      tech_ops_ordem_saida!inner(
        id, tipo, competencia, codigo_num, origem_chave, observacao, solicitante_nome, created_at, status
      )
    `,
    )
    .eq("entidade_tipo", entidadeTipo)
    .eq("entidade_id", entidadeId)
    .limit(100);
  if (error) throw error;

  type Emb = {
    id: string;
    tipo: OrdemSaidaRow["tipo"];
    competencia: string;
    codigo_num: number;
    origem_chave: string | null;
    observacao: string;
    solicitante_nome: string;
    created_at: string;
  };

  const out: HistoricoMovimentacaoEvento[] = [];
  for (const row of data ?? []) {
    const osRaw = (row as { tech_ops_ordem_saida: Emb | Emb[] }).tech_ops_ordem_saida;
    const os = Array.isArray(osRaw) ? osRaw[0] : osRaw;
    if (!os) continue;
    out.push({
      id: os.id,
      codigo_os: formatCodigoOrdemSaida(os.tipo, String(os.competencia).slice(0, 10), os.codigo_num),
      data_hora: os.created_at,
      usuario: os.solicitante_nome || "—",
      origem: labelLocalItensAlocados(os.origem_chave ?? "", estudioNomePorSlug),
      observacao: os.observacao?.trim() ? os.observacao : "—",
    });
  }
  out.sort((a, b) => b.data_hora.localeCompare(a.data_hora));
  return out;
}

/* ─── Limpeza / Manutenção ────────────────────────────────────────────────── */

/** Estúdio ou Academy → Roleta; Shuffler Room ou OCR → Máquina de Cartas. */
export function categoriaEquipamentoLimpezaPorLocal(localChave: string): EstoqueEquipCategoria | null {
  if (localChave === "shuffler_room" || localChave === "ocr") return "maquina_cartas";
  if (localChave === "academy" || isChaveEstudioOs(localChave)) return "roleta";
  return null;
}

export function labelEquipamentoLimpeza(nome: string, numeroSerie: string | null | undefined): string {
  const n = (nome ?? "").trim();
  const s = (numeroSerie ?? "").trim();
  if (n && s) return `${n} - ${s}`;
  if (n) return n;
  return s || "—";
}

export function labelCampoEquipamentoLimpeza(localChave: string): string {
  const cat = categoriaEquipamentoLimpezaPorLocal(localChave);
  if (cat === "maquina_cartas") return ESTOQUE_EQUIP_CATEGORIA_LABEL.maquina_cartas;
  if (cat === "roleta") return ESTOQUE_EQUIP_CATEGORIA_LABEL.roleta;
  return "Equipamento";
}

export function mensagemVazioEquipamentoLimpeza(localChave: string): string {
  const cat = categoriaEquipamentoLimpezaPorLocal(localChave);
  if (cat === "maquina_cartas") return "Nenhuma máquina de cartas alocada neste local.";
  if (cat === "roleta") return "Nenhuma roleta alocada neste local.";
  return "Nenhum equipamento alocado neste local.";
}

export async function fetchEquipamentosLimpezaNoLocal(localChave: string): Promise<EquipamentoLimpezaOption[]> {
  const categoria = categoriaEquipamentoLimpezaPorLocal(localChave);
  if (!categoria) return [];

  const setRows = await fetchItensSetNoLocal(localChave);
  const eqpIds = setRows.filter((r) => r.entidade_tipo === "equipamento").map((r) => r.entidade_id);
  if (!eqpIds.length) return [];

  const { data, error } = await supabase
    .from("tech_ops_estoque_equipamentos")
    .select("id, nome, numero_serie, categoria")
    .in("id", eqpIds)
    .eq("categoria", categoria)
    .order("nome", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((e) => ({
    id: e.id as string,
    nome: (e.nome as string) || "—",
    numero_serie: (e.numero_serie as string) || "",
    label: labelEquipamentoLimpeza(e.nome as string, e.numero_serie as string),
  }));
}

export async function registrarLimpezaItensAlocados(params: {
  localChave: string;
  mesaId: string | null;
  equipamentoId: string;
  responsavelNome: string;
  responsavelUserId?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("tech_ops_itens_alocados_limpeza").insert({
    local_chave: params.localChave,
    mesa_id: params.mesaId,
    equipamento_id: params.equipamentoId,
    data_hora: new Date().toISOString(),
    responsavel_nome: params.responsavelNome.trim() || "—",
    responsavel_user_id: params.responsavelUserId ?? null,
  });
  if (error) throw error;
}

function competenciaBounds(mesKey: string): { ini: string; fimExcl: string } {
  const [y, m] = mesKey.split("-").map(Number);
  const ini = new Date(Date.UTC(y, m - 1, 1, 3, 0, 0)); /* approx BR */
  const fim = new Date(Date.UTC(y, m, 1, 3, 0, 0));
  return { ini: ini.toISOString(), fimExcl: fim.toISOString() };
}

export async function fetchLimpezasItensAlocados(params: {
  localChave: string;
  mesKey: string;
  mesaId: string | null;
}): Promise<LimpezaRow[]> {
  const { ini, fimExcl } = competenciaBounds(params.mesKey);
  let q = supabase
    .from("tech_ops_itens_alocados_limpeza")
    .select("id, local_chave, mesa_id, equipamento_id, data_hora, responsavel_nome")
    .eq("local_chave", params.localChave)
    .gte("data_hora", ini)
    .lt("data_hora", fimExcl)
    .order("data_hora", { ascending: false });
  if (params.mesaId) q = q.eq("mesa_id", params.mesaId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];

  const eqpIds = [...new Set(rows.map((r) => r.equipamento_id as string))];
  const mesaIds = [...new Set(rows.map((r) => r.mesa_id as string | null).filter(Boolean))] as string[];

  const [eqpRes, mesaRes] = await Promise.all([
    supabase.from("tech_ops_estoque_equipamentos").select("id, nome, numero_serie").in("id", eqpIds),
    mesaIds.length
      ? supabase.from("mesas_spin_cadastro").select("id, tipo_jogo, numero_mesa").in("id", mesaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (eqpRes.error) throw eqpRes.error;
  if (mesaRes.error) throw mesaRes.error;

  const eqpMap = new Map(
    (eqpRes.data ?? []).map((e) => [
      e.id as string,
      labelEquipamentoLimpeza((e as { nome: string }).nome, (e as { numero_serie: string }).numero_serie),
    ]),
  );
  const mesaMap = new Map(
    (mesaRes.data ?? []).map((m) => [
      m.id as string,
      labelMesaJogoNumero((m as { tipo_jogo: string }).tipo_jogo, (m as { numero_mesa: string | null }).numero_mesa),
    ]),
  );

  return rows.map((r) => ({
    id: r.id as string,
    local_chave: r.local_chave as string,
    mesa_id: (r.mesa_id as string | null) ?? null,
    equipamento_id: r.equipamento_id as string,
    data_hora: r.data_hora as string,
    responsavel_nome: (r.responsavel_nome as string) || "—",
    equipamento_label: eqpMap.get(r.equipamento_id as string) ?? "—",
    mesa_label: r.mesa_id ? (mesaMap.get(r.mesa_id as string) ?? "—") : "—",
  }));
}

export async function fetchManutencoesItensAlocados(params: {
  localChave: string;
  mesKey: string;
  mesaId: string | null;
}): Promise<ManutencaoRegRow[]> {
  const { ini, fimExcl } = competenciaBounds(params.mesKey);
  let q = supabase
    .from("tech_ops_itens_alocados_manutencao")
    .select("id, local_chave, mesa_id, equipamento_id, tipo, data_hora, responsavel_nome")
    .eq("local_chave", params.localChave)
    .gte("data_hora", ini)
    .lt("data_hora", fimExcl)
    .order("data_hora", { ascending: false });
  if (params.mesaId) q = q.eq("mesa_id", params.mesaId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];

  const eqpIds = [...new Set(rows.map((r) => r.equipamento_id as string))];
  const mesaIds = [...new Set(rows.map((r) => r.mesa_id as string | null).filter(Boolean))] as string[];

  const [eqpRes, mesaRes] = await Promise.all([
    supabase.from("tech_ops_estoque_equipamentos").select("id, codigo_num, nome").in("id", eqpIds),
    mesaIds.length
      ? supabase.from("mesas_spin_cadastro").select("id, tipo_jogo, numero_mesa").in("id", mesaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (eqpRes.error) throw eqpRes.error;
  if (mesaRes.error) throw mesaRes.error;

  const eqpMap = new Map(
    (eqpRes.data ?? []).map((e) => [
      e.id as string,
      `${codigoEstoqueEquipamento(e as { codigo_num: number })} — ${(e as { nome: string }).nome}`,
    ]),
  );
  const mesaMap = new Map(
    (mesaRes.data ?? []).map((m) => [
      m.id as string,
      labelMesaJogoNumero((m as { tipo_jogo: string }).tipo_jogo, (m as { numero_mesa: string | null }).numero_mesa),
    ]),
  );

  return rows.map((r) => ({
    id: r.id as string,
    local_chave: r.local_chave as string,
    mesa_id: (r.mesa_id as string | null) ?? null,
    equipamento_id: r.equipamento_id as string,
    tipo: r.tipo as string,
    data_hora: r.data_hora as string,
    responsavel_nome: (r.responsavel_nome as string) || "—",
    equipamento_label: eqpMap.get(r.equipamento_id as string) ?? "—",
    mesa_label: r.mesa_id ? (mesaMap.get(r.mesa_id as string) ?? "—") : "—",
  }));
}

/** Evita warning unused fetchAllPages se volume crescer — export reexport. */
export { fetchAllPages };
