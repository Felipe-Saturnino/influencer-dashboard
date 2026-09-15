import { supabase } from "./supabase";
import { fetchAllPages, fetchInBatched } from "./supabasePaginate";
import type { JogadorAbaDailyFact } from "./jogadoresAbaMetrics";

const COLS =
  "data,operadora_slug,ext_customer_id,influencer_id,registration_count,deposit_count,rodadas_spin,ggr_spin,turnover_spin,jogou_spin,jogou_outros,rodadas_por_jogo,rodadas_por_mesa,cda_conta";

const INFLUENCER_IN_CHUNK = 150;

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
  return q;
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
