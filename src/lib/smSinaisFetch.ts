import { supabase } from "./supabase";
import { fetchAllPages } from "./supabasePaginate";
import type { SmSinalRow, SmSinalStaffOption } from "./smSinaisTypes";

function orgTimeEhServiceManager(nome: string): boolean {
  const n = nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
  return n === "service manager" || n.startsWith("service manager ");
}

/** Colunas mínimas — KPIs, filtros e agregação diária (sem embeds pesados). */
const SM_SINAL_SELECT_LEVE = [
  "id",
  "signal_id",
  "issued_at",
  "taken_at",
  "timer_stopped_at",
  "dia_brt",
  "table_id",
  "signal_type",
  "creator_id",
  "creator_screen_name",
  "creator_funcionario_id",
  "resolver_id",
  "resolver_screen_name",
  "resolver_funcionario_id",
  "estudio_slug",
].join(", ");

/** Overview Prestador OCR — inclui jogo/mesa para Por Jogo e drilldown Por Estúdio. */
const SM_SINAL_SELECT_OCR = [
  "id",
  "signal_id",
  "issued_at",
  "taken_at",
  "timer_stopped_at",
  "dia_brt",
  "table_id",
  "game_type",
  "signal_type",
  "creator_funcionario_id",
  "resolver_id",
  "resolver_screen_name",
  "resolver_funcionario_id",
  "mesa_id",
  "estudio_slug",
  "mesas_spin_cadastro(id, nome_mesa, numero_mesa, tipo_jogo)",
].join(", ");

function unwrapMesaEmbed(
  raw: unknown,
): { id: string; nome_mesa: string | null; numero_mesa: string | null; tipo_jogo: string | null } | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  return {
    id: String(o.id ?? ""),
    nome_mesa: o.nome_mesa == null ? null : String(o.nome_mesa),
    numero_mesa: o.numero_mesa == null ? null : String(o.numero_mesa),
    tipo_jogo: o.tipo_jogo == null ? null : String(o.tipo_jogo),
  };
}

function mapSmSinalLeve(raw: Record<string, unknown>): SmSinalRow {
  return {
    id: String(raw.id ?? ""),
    signal_id: String(raw.signal_id ?? ""),
    ambiente: "",
    issued_at: String(raw.issued_at ?? ""),
    taken_at: raw.taken_at == null ? null : String(raw.taken_at),
    timer_stopped_at: String(raw.timer_stopped_at ?? ""),
    issued_at_brt: "",
    taken_at_brt: null,
    timer_stopped_at_brt: "",
    dia_brt: String(raw.dia_brt ?? "").slice(0, 10),
    table_id: String(raw.table_id ?? ""),
    game_type: raw.game_type == null ? null : String(raw.game_type),
    signal_type: String(raw.signal_type ?? ""),
    resolution_conclusion: null,
    creator_id: raw.creator_id == null ? null : String(raw.creator_id),
    creator_screen_name: raw.creator_screen_name == null ? null : String(raw.creator_screen_name),
    creator_type: null,
    creator_funcionario_id:
      raw.creator_funcionario_id == null ? null : String(raw.creator_funcionario_id),
    resolver_id: String(raw.resolver_id ?? ""),
    resolver_screen_name: raw.resolver_screen_name == null ? null : String(raw.resolver_screen_name),
    resolver_funcionario_id:
      raw.resolver_funcionario_id == null ? null : String(raw.resolver_funcionario_id),
    mesa_id: raw.mesa_id == null ? null : String(raw.mesa_id),
    estudio_slug: raw.estudio_slug == null ? null : String(raw.estudio_slug),
    mesa: unwrapMesaEmbed(raw.mesas_spin_cadastro),
    estudio: null,
    creator: null,
    resolver: null,
  };
}

/** Lista leve de sinais no período — filtro por `dia_brt` (America/Sao_Paulo). */
export async function fetchSmSinaisPeriodo(opts: {
  dataIni: string;
  dataFim: string;
}): Promise<SmSinalRow[]> {
  const rows = await fetchAllPages<Record<string, unknown>>(async (from, to) => {
    const { data, error } = await supabase
      .from("sm_sinais")
      .select(SM_SINAL_SELECT_LEVE)
      .gte("dia_brt", opts.dataIni)
      .lte("dia_brt", opts.dataFim)
      .order("dia_brt", { ascending: false })
      .range(from, to);
    return { data: (data as Record<string, unknown>[] | null) ?? null, error };
  });
  return rows.map(mapSmSinalLeve);
}

/** Sinais com jogo/mesa — Overview Prestador → KPIs de OCR. */
export async function fetchSmSinaisPeriodoOcr(opts: {
  dataIni: string;
  dataFim: string;
}): Promise<SmSinalRow[]> {
  const rows = await fetchAllPages<Record<string, unknown>>(async (from, to) => {
    const { data, error } = await supabase
      .from("sm_sinais")
      .select(SM_SINAL_SELECT_OCR)
      .gte("dia_brt", opts.dataIni)
      .lte("dia_brt", opts.dataFim)
      .order("dia_brt", { ascending: false })
      .range(from, to);
    return { data: (data as Record<string, unknown>[] | null) ?? null, error };
  });
  return rows.map(mapSmSinalLeve);
}

/** Service Managers ativos/indisponíveis — filtro Staff da aba Sinais. */
export async function fetchStaffFiltroSinaisSm(): Promise<SmSinalStaffOption[]> {
  const { data: times, error: errTimes } = await supabase
    .from("rh_org_times")
    .select("id, nome, status")
    .eq("status", "ativo")
    .order("nome");
  if (errTimes) {
    console.error("[Sinais] org times SM:", errTimes);
    return [];
  }
  const smTimes = (times ?? []).filter((t) => orgTimeEhServiceManager((t as { nome: string }).nome));
  if (smTimes.length === 0) return [];

  const timeIds = smTimes.map((t) => (t as { id: string }).id);
  const { data, error } = await supabase
    .from("rh_funcionarios")
    .select("id, nome, staff_nickname, status, org_time_id")
    .in("org_time_id", timeIds)
    .in("status", ["ativo", "indisponivel"])
    .order("nome");
  if (error) {
    console.error("[Sinais] staff SM:", error);
    return [];
  }

  return (data ?? []).map((raw) => {
    const row = raw as { id: string; nome: string; staff_nickname: string | null };
    return {
      id: row.id,
      nome: row.nome,
      nickname: (row.staff_nickname ?? "").trim() || null,
    };
  });
}
