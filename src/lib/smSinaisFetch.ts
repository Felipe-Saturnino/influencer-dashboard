import { supabase } from "./supabase";
import { fetchAllPages, fetchInBatched } from "./supabasePaginate";
import type { SmSinalResumoRow, SmSinalRow, SmSinalStaffOption } from "./smSinaisTypes";

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
  "game_type",
  "signal_type",
  "creator_id",
  "creator_screen_name",
  "creator_funcionario_id",
  "resolver_id",
  "resolver_screen_name",
  "resolver_funcionario_id",
  "mesa_id",
  "estudio_slug",
].join(", ");

/** Overview Prestador OCR — mesmas colunas leves (+ jogo/mesa sem embed; nomes via cadastro). */
const SM_SINAL_SELECT_OCR = SM_SINAL_SELECT_LEVE;

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
    mesa: null,
    estudio: null,
    creator: null,
    resolver: null,
  };
}

function numResumo(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function mapSmSinalResumo(raw: Record<string, unknown>): SmSinalResumoRow {
  return {
    dia_brt: String(raw.dia_brt ?? "").slice(0, 10),
    estudio_slug: String(raw.estudio_slug ?? ""),
    resolver_funcionario_id: strOrNull(raw.resolver_funcionario_id),
    creator_funcionario_id: strOrNull(raw.creator_funcionario_id),
    resolver_id: String(raw.resolver_id ?? ""),
    creator_id: String(raw.creator_id ?? ""),
    resolver_screen_name: strOrNull(raw.resolver_screen_name),
    creator_screen_name: strOrNull(raw.creator_screen_name),
    sinais_qtd: numResumo(raw.sinais_qtd),
    tma_total_sum_ms: numResumo(raw.tma_total_sum_ms),
    tma_total_n: numResumo(raw.tma_total_n),
    tma_atend_sum_ms: numResumo(raw.tma_atend_sum_ms),
    tma_atend_n: numResumo(raw.tma_atend_n),
    tma_res_sum_ms: numResumo(raw.tma_res_sum_ms),
    tma_res_n: numResumo(raw.tma_res_n),
  };
}

const SM_SINAL_RESUMO_SELECT = [
  "dia_brt",
  "estudio_slug",
  "resolver_funcionario_id",
  "creator_funcionario_id",
  "resolver_id",
  "creator_id",
  "resolver_screen_name",
  "creator_screen_name",
  "sinais_qtd",
  "tma_total_sum_ms",
  "tma_total_n",
  "tma_atend_sum_ms",
  "tma_atend_n",
  "tma_res_sum_ms",
  "tma_res_n",
].join(", ");

/** Totais diários da aba Sinais — não baixa sinais individuais. */
export async function fetchSmSinaisResumoPeriodo(opts: {
  dataIni: string;
  dataFim: string;
}): Promise<SmSinalResumoRow[]> {
  const rows = await fetchAllPages<Record<string, unknown>>(async (from, to) => {
    const { data, error } = await supabase
      .from("sm_sinais_resumo_diario")
      .select(SM_SINAL_RESUMO_SELECT)
      .gte("dia_brt", opts.dataIni)
      .lte("dia_brt", opts.dataFim)
      .order("dia_brt", { ascending: false })
      .range(from, to);
    return { data: (data as Record<string, unknown>[] | null) ?? null, error };
  });
  return rows.map(mapSmSinalResumo);
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

/** Sinais com jogo/mesa — Overview Prestador → KPIs de OCR. Filtra no servidor por SM. */
export async function fetchSmSinaisPeriodoOcr(opts: {
  dataIni: string;
  dataFim: string;
  funcionarioIds?: string[];
  resolverTosIds?: string[];
}): Promise<SmSinalRow[]> {
  const fids = [...new Set((opts.funcionarioIds ?? []).map((x) => x.trim()).filter(Boolean))];
  const tos = [...new Set((opts.resolverTosIds ?? []).map((x) => x.trim()).filter(Boolean))];
  if ((opts.funcionarioIds || opts.resolverTosIds) && fids.length === 0 && tos.length === 0) {
    return [];
  }

  const porId = new Map<string, SmSinalRow>();
  const ingest = (rows: Record<string, unknown>[]) => {
    for (const raw of rows) {
      const mapped = mapSmSinalLeve(raw);
      if (mapped.id) porId.set(mapped.id, mapped);
    }
  };

  if (fids.length === 0 && tos.length === 0) {
    ingest(
      await fetchAllPages<Record<string, unknown>>(async (from, to) => {
        const { data, error } = await supabase
          .from("sm_sinais")
          .select(SM_SINAL_SELECT_OCR)
          .gte("dia_brt", opts.dataIni)
          .lte("dia_brt", opts.dataFim)
          .order("dia_brt", { ascending: false })
          .range(from, to);
        return { data: (data as Record<string, unknown>[] | null) ?? null, error };
      }),
    );
    return [...porId.values()];
  }

  if (fids.length > 0) {
    ingest(
      await fetchInBatched(
        fids,
        80,
        (slice) =>
          fetchAllPages<Record<string, unknown>>(async (from, to) => {
            const { data, error } = await supabase
              .from("sm_sinais")
              .select(SM_SINAL_SELECT_OCR)
              .gte("dia_brt", opts.dataIni)
              .lte("dia_brt", opts.dataFim)
              .in("resolver_funcionario_id", slice)
              .order("dia_brt", { ascending: false })
              .range(from, to);
            return { data: (data as Record<string, unknown>[] | null) ?? null, error };
          }),
        2,
      ),
    );
  }
  if (tos.length > 0) {
    ingest(
      await fetchInBatched(
        tos,
        80,
        (slice) =>
          fetchAllPages<Record<string, unknown>>(async (from, to) => {
            const { data, error } = await supabase
              .from("sm_sinais")
              .select(SM_SINAL_SELECT_OCR)
              .gte("dia_brt", opts.dataIni)
              .lte("dia_brt", opts.dataFim)
              .in("resolver_id", slice)
              .order("dia_brt", { ascending: false })
              .range(from, to);
            return { data: (data as Record<string, unknown>[] | null) ?? null, error };
          }),
        2,
      ),
    );
  }
  return [...porId.values()];
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
