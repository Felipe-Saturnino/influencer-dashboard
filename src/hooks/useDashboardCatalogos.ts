import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { fetchAllPages, fetchInBatched } from "../lib/supabasePaginate";

export type DashboardInfluencerCatalogo = {
  id: string;
  nome_artistico: string;
  cache_hora: number;
  status: string | null;
};

export type DashboardOperadoraCatalogo = {
  slug: string;
  nome: string;
};

export type DashboardInfluencerOperadoraCatalogo = {
  influencer_id: string;
  operadora_slug: string;
};

const INFLUENCER_IN_CHUNK = 150;

type ProfileIdRow = { id: string };

/**
 * Catálogo Streamers / Overview Influencer: só `profiles.role = influencer`.
 * Afiliados compartilham `influencer_perfil` e ficam no catálogo `useDashboardAfiliadosCatalogo`.
 */
export function useDashboardCatalogos() {
  const query = useQuery({
    queryKey: ["catalogos", "dashboards-influencers", "role-influencer"],
    queryFn: async () => {
      const [profileIds, operadoras] = await Promise.all([
        fetchAllPages<ProfileIdRow>(async (from, to) => {
          const { data, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "influencer")
            .order("id")
            .range(from, to);
          return { data: (data as ProfileIdRow[] | null) ?? null, error };
        }),
        fetchAllPages<DashboardOperadoraCatalogo>(async (from, to) => {
          const { data, error } = await supabase
            .from("operadoras")
            .select("slug, nome")
            .eq("ativo", true)
            .order("nome")
            .range(from, to);
          return { data: (data as DashboardOperadoraCatalogo[] | null) ?? null, error };
        }),
      ]);

      const ids = profileIds.map((p) => p.id);
      if (ids.length === 0) {
        return {
          perfis: [] as DashboardInfluencerCatalogo[],
          operadoras,
          vinculos: [] as DashboardInfluencerOperadoraCatalogo[],
        };
      }

      const [perfis, vinculos] = await Promise.all([
        fetchInBatched(
          ids,
          INFLUENCER_IN_CHUNK,
          (slice) =>
            fetchAllPages<DashboardInfluencerCatalogo>(async (from, to) => {
              const { data, error } = await supabase
                .from("influencer_perfil")
                .select("id, nome_artistico, cache_hora, status")
                .in("id", slice)
                .order("nome_artistico")
                .range(from, to);
              return { data: (data as DashboardInfluencerCatalogo[] | null) ?? null, error };
            }),
          2,
        ),
        fetchInBatched(
          ids,
          INFLUENCER_IN_CHUNK,
          (slice) =>
            fetchAllPages<DashboardInfluencerOperadoraCatalogo>(async (from, to) => {
              const { data, error } = await supabase
                .from("influencer_operadoras")
                .select("influencer_id, operadora_slug")
                .in("influencer_id", slice)
                .order("influencer_id")
                .range(from, to);
              return { data: (data as DashboardInfluencerOperadoraCatalogo[] | null) ?? null, error };
            }),
          2,
        ),
      ]);

      perfis.sort((a, b) => a.nome_artistico.localeCompare(b.nome_artistico, "pt-BR"));
      return { perfis, operadoras, vinculos };
    },
    staleTime: 10 * 60 * 1000,
  });

  const perfis = useMemo(() => query.data?.perfis ?? [], [query.data?.perfis]);
  const operadoras = useMemo(() => query.data?.operadoras ?? [], [query.data?.operadoras]);
  const vinculos = useMemo(() => query.data?.vinculos ?? [], [query.data?.vinculos]);
  const operadoraInfluencers = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const vinculo of vinculos) {
      if (!map[vinculo.operadora_slug]) map[vinculo.operadora_slug] = [];
      map[vinculo.operadora_slug]!.push(vinculo.influencer_id);
    }
    return map;
  }, [vinculos]);

  return {
    perfis,
    operadoras,
    vinculos,
    operadoraInfluencers,
    isPending: query.isPending,
    error: query.error,
  };
}
