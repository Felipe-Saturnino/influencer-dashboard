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

const SM_SINAL_SELECT = [
  "id",
  "signal_id",
  "ambiente",
  "issued_at",
  "taken_at",
  "timer_stopped_at",
  "issued_at_brt",
  "taken_at_brt",
  "timer_stopped_at_brt",
  "dia_brt",
  "table_id",
  "game_type",
  "signal_type",
  "resolution_conclusion",
  "creator_id",
  "creator_screen_name",
  "creator_type",
  "creator_funcionario_id",
  "resolver_id",
  "resolver_screen_name",
  "resolver_funcionario_id",
  "mesa_id",
  "estudio_slug",
  "mesa:mesas_spin_cadastro(id, nome_mesa, numero_mesa, tipo_jogo)",
  "estudio:estudios_spin!estudio_slug(slug, nome)",
  "creator:rh_funcionarios!creator_funcionario_id(id, nome, staff_nickname)",
  "resolver:rh_funcionarios!resolver_funcionario_id(id, nome, staff_nickname)",
].join(", ");

function unwrapEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type SmSinalDbRow = Omit<SmSinalRow, "mesa" | "estudio" | "creator" | "resolver"> & {
  mesa?: SmSinalRow["mesa"] | SmSinalRow["mesa"][] | null;
  estudio?: SmSinalRow["estudio"] | SmSinalRow["estudio"][] | null;
  creator?: SmSinalRow["creator"] | SmSinalRow["creator"][] | null;
  resolver?: SmSinalRow["resolver"] | SmSinalRow["resolver"][] | null;
};

function mapSmSinalRow(raw: SmSinalDbRow): SmSinalRow {
  return {
    ...raw,
    mesa: unwrapEmbed(raw.mesa),
    estudio: unwrapEmbed(raw.estudio),
    creator: unwrapEmbed(raw.creator),
    resolver: unwrapEmbed(raw.resolver),
  };
}

/** Lista de sinais no período — filtro por `dia_brt` (America/Sao_Paulo). */
export async function fetchSmSinaisPeriodo(opts: {
  dataIni: string;
  dataFim: string;
}): Promise<SmSinalRow[]> {
  const rows = await fetchAllPages<SmSinalDbRow>(async (from, to) => {
    const { data, error } = await supabase
      .from("sm_sinais")
      .select(SM_SINAL_SELECT)
      .gte("dia_brt", opts.dataIni)
      .lte("dia_brt", opts.dataFim)
      .order("issued_at", { ascending: false })
      .range(from, to);
    return { data: (data as SmSinalDbRow[] | null) ?? null, error };
  });
  return rows.map(mapSmSinalRow);
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
