import { supabase } from "./supabase";
import { fetchAllPages, fetchInBatched } from "./supabasePaginate";
import {
  contarRegistrosUnicosJogadores,
  registrosUnicosVazios,
  type JogadorAbaDailyFact,
  type JogadorUapSpinFact,
  type JogadoresRegistrosUnicos,
} from "./jogadoresAbaMetrics";

const COLS =
  "data,operadora_slug,ext_customer_id,influencer_id,registration_count,deposit_count,rodadas_spin,ggr_spin,turnover_spin,jogou_spin,jogou_outros,rodadas_por_jogo,rodadas_por_mesa,cda_conta";

const INFLUENCER_IN_CHUNK = 150;

/** PK de `jogadores_metricas_diarias` — obrigatória em cada `.range` para o offset não duplicar/omitir linhas. */
const JOGADORES_METRICAS_DIARIAS_PK = [
  "data",
  "operadora_slug",
  "origem_tipo",
  "origem",
  "ext_customer_id",
] as const;

type QueryComOrder = {
  order: (column: string, options?: { ascending: boolean }) => QueryComOrder;
};

function ordenarPaginaJogadoresMetricasDiarias<Q extends QueryComOrder>(q: Q): Q {
  return JOGADORES_METRICAS_DIARIAS_PK.reduce(
    (acc, col) => acc.order(col, { ascending: true }),
    q as QueryComOrder,
  ) as Q;
}

export type JogadoresAbaQueryFiltro = {
  inicio: string;
  fim: string;
  operadoraSlugs: string[] | null;
  influencerIds: string[] | null;
};

type DailyRow = {
  operadora_slug: string;
  ext_customer_id: string;
  influencer_id: string | null;
  registration_count: number | null;
  deposit_count: number | null;
  rodadas_spin: number | null;
  ggr_spin: number | null;
  turnover_spin: number | null;
  jogou_spin: boolean | null;
  jogou_outros: boolean | null;
  rodadas_por_jogo: Record<string, number> | null;
  rodadas_por_mesa: unknown;
};

function asFact(row: DailyRow): JogadorAbaDailyFact {
  const jogos = row.rodadas_por_jogo;
  return {
    operadora_slug: row.operadora_slug,
    ext_customer_id: row.ext_customer_id,
    influencer_id: row.influencer_id,
    registration_count: row.registration_count ?? 0,
    deposit_count: row.deposit_count ?? 0,
    rodadas_spin: row.rodadas_spin ?? 0,
    ggr_spin: row.ggr_spin,
    turnover_spin: row.turnover_spin,
    jogou_spin: row.jogou_spin,
    jogou_outros: row.jogou_outros,
    rodadas_por_jogo:
      jogos && typeof jogos === "object" && !Array.isArray(jogos) ? jogos : null,
    rodadas_por_mesa: row.rodadas_por_mesa ?? [],
  };
}

function baseQuery(filtro: JogadoresAbaQueryFiltro, influencerSlice?: string[]) {
  let q = supabase
    .from("jogadores_metricas_diarias")
    .select(COLS)
    .eq("cda_conta", "influencers")
    .gte("data", filtro.inicio)
    .lte("data", filtro.fim);
  if (filtro.operadoraSlugs?.length === 1) {
    q = q.eq("operadora_slug", filtro.operadoraSlugs[0]);
  } else if (filtro.operadoraSlugs && filtro.operadoraSlugs.length > 1) {
    q = q.in("operadora_slug", filtro.operadoraSlugs);
  }
  if (influencerSlice?.length) {
    q = q.in("influencer_id", influencerSlice);
  }
  return ordenarPaginaJogadoresMetricasDiarias(q);
}

async function fetchPaginas(
  filtro: JogadoresAbaQueryFiltro,
  influencerSlice?: string[],
): Promise<JogadorAbaDailyFact[]> {
  const rows = await fetchAllPages<DailyRow>(async (from, to) => {
    const { data, error } = await baseQuery(filtro, influencerSlice).range(from, to);
    return { data: (data as DailyRow[] | null) ?? null, error };
  });
  return rows.map(asFact);
}

/**
 * Daily TAP + Spin do canal influencers no período. Pagina PostgREST; lotes `.in(influencer_id)`.
 * `influencerIds: null` = todos; `[]` = escopo fechado vazio (não buscar).
 */
export async function fetchJogadoresAbaDaily(filtro: JogadoresAbaQueryFiltro): Promise<JogadorAbaDailyFact[]> {
  if (filtro.operadoraSlugs && filtro.operadoraSlugs.length === 0) return [];
  if (filtro.influencerIds && filtro.influencerIds.length === 0) return [];

  if (filtro.influencerIds?.length) {
    return fetchInBatched(
      filtro.influencerIds,
      INFLUENCER_IN_CHUNK,
      (slice) => fetchPaginas(filtro, slice),
      2,
    );
  }

  return fetchPaginas(filtro);
}

const COLS_UAP_SPIN = "operadora_slug,ext_customer_id,influencer_id,rodadas_spin";

type UapSpinRow = {
  operadora_slug: string;
  ext_customer_id: string;
  influencer_id: string;
  rodadas_spin: number;
};

function baseQueryUapSpin(filtro: JogadoresAbaQueryFiltro, influencerSlice?: string[]) {
  let q = supabase
    .from("jogadores_metricas_diarias")
    .select(COLS_UAP_SPIN)
    .eq("cda_conta", "influencers")
    .gt("rodadas_spin", 0)
    .not("influencer_id", "is", null)
    .gte("data", filtro.inicio)
    .lte("data", filtro.fim);
  if (filtro.operadoraSlugs?.length === 1) {
    q = q.eq("operadora_slug", filtro.operadoraSlugs[0]);
  } else if (filtro.operadoraSlugs && filtro.operadoraSlugs.length > 1) {
    q = q.in("operadora_slug", filtro.operadoraSlugs);
  }
  if (influencerSlice?.length) q = q.in("influencer_id", influencerSlice);
  return ordenarPaginaJogadoresMetricasDiarias(q);
}

async function fetchPaginasUapSpin(
  filtro: JogadoresAbaQueryFiltro,
  influencerSlice?: string[],
): Promise<JogadorUapSpinFact[]> {
  return fetchAllPages<UapSpinRow>(async (from, to) => {
    const { data, error } = await baseQueryUapSpin(filtro, influencerSlice).range(from, to);
    return { data: (data as UapSpinRow[] | null) ?? null, error };
  });
}

/** Linhas mínimas para UAP Spin da Overview; evita carregar JSON de mesa/jogo nessa aba. */
export async function fetchJogadoresUapSpin(
  filtro: JogadoresAbaQueryFiltro,
): Promise<JogadorUapSpinFact[]> {
  if (filtro.operadoraSlugs && filtro.operadoraSlugs.length === 0) return [];
  if (filtro.influencerIds && filtro.influencerIds.length === 0) return [];
  if (filtro.influencerIds?.length) {
    return fetchInBatched(
      filtro.influencerIds,
      INFLUENCER_IN_CHUNK,
      (slice) => fetchPaginasUapSpin(filtro, slice),
      2,
    );
  }
  return fetchPaginasUapSpin(filtro);
}

const COLS_REGISTROS = "operadora_slug,ext_customer_id,influencer_id,registration_count";

type RegistroRow = {
  operadora_slug: string;
  ext_customer_id: string;
  influencer_id: string | null;
  registration_count: number | null;
};

function baseQueryRegistros(filtro: JogadoresAbaQueryFiltro, influencerSlice?: string[]) {
  let q = supabase
    .from("jogadores_metricas_diarias")
    .select(COLS_REGISTROS)
    .eq("cda_conta", "influencers")
    .gt("registration_count", 0)
    .not("influencer_id", "is", null)
    .gte("data", filtro.inicio)
    .lte("data", filtro.fim);
  if (filtro.operadoraSlugs?.length === 1) {
    q = q.eq("operadora_slug", filtro.operadoraSlugs[0]);
  } else if (filtro.operadoraSlugs && filtro.operadoraSlugs.length > 1) {
    q = q.in("operadora_slug", filtro.operadoraSlugs);
  }
  if (influencerSlice?.length) {
    q = q.in("influencer_id", influencerSlice);
  }
  return ordenarPaginaJogadoresMetricasDiarias(q);
}

async function fetchPaginasRegistros(
  filtro: JogadoresAbaQueryFiltro,
  influencerSlice?: string[],
): Promise<RegistroRow[]> {
  return fetchAllPages<RegistroRow>(async (from, to) => {
    const { data, error } = await baseQueryRegistros(filtro, influencerSlice).range(from, to);
    return { data: (data as RegistroRow[] | null) ?? null, error };
  });
}

/** IDs Ext únicos mapeados (UTM de influencer) no período — Overview / Conversão alinhados à aba Jogadores. */
export async function fetchJogadoresRegistrosUnicos(
  filtro: JogadoresAbaQueryFiltro,
): Promise<JogadoresRegistrosUnicos> {
  if (filtro.operadoraSlugs && filtro.operadoraSlugs.length === 0) return registrosUnicosVazios();
  if (filtro.influencerIds && filtro.influencerIds.length === 0) return registrosUnicosVazios();

  const rows = filtro.influencerIds?.length
    ? await fetchInBatched(
        filtro.influencerIds,
        INFLUENCER_IN_CHUNK,
        (slice) => fetchPaginasRegistros(filtro, slice),
        2,
      )
    : await fetchPaginasRegistros(filtro);

  return contarRegistrosUnicosJogadores(
    rows.map((r) => ({
      operadora_slug: r.operadora_slug,
      ext_customer_id: r.ext_customer_id,
      influencer_id: r.influencer_id,
      registration_count: r.registration_count ?? 0,
    })),
  );
}
