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

type ProfileRow = { id: string; name: string | null };

/** `influencer_perfil.nome_artistico` aceita null no cadastro — normalizado aqui para o catálogo. */
type InfluencerPerfilRow = {
  id: string;
  nome_artistico: string | null;
  cache_hora: number | null;
  status: string | null;
};

function nomeCatalogoInfluencer(
  nomeArtistico: string | null | undefined,
  nomePerfil: string | null | undefined,
): string {
  return (nomeArtistico ?? "").trim() || (nomePerfil ?? "").trim() || "—";
}

function asPerfilCatalogo(
  row: InfluencerPerfilRow,
  nomePerfil: string | null | undefined,
): DashboardInfluencerCatalogo {
  return {
    id: row.id,
    nome_artistico: nomeCatalogoInfluencer(row.nome_artistico, nomePerfil),
    cache_hora: row.cache_hora ?? 0,
    status: row.status,
  };
}

/**
 * Catálogo Streamers / Overview Influencer: só `profiles.role = influencer`.
 * Afiliados compartilham `influencer_perfil` e ficam no catálogo `useDashboardAfiliadosCatalogo`.
 */
export function useDashboardCatalogos() {
  const query = useQuery({
    queryKey: ["catalogos", "dashboards-influencers", "role-influencer"],
    queryFn: async () => {
      const [profiles, operadoras] = await Promise.all([
        fetchAllPages<ProfileRow>(async (from, to) => {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, name")
            .eq("role", "influencer")
            .order("id")
            .range(from, to);
          return { data: (data as ProfileRow[] | null) ?? null, error };
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

      const ids = profiles.map((p) => p.id);
      const nomePorId = new Map(profiles.map((p) => [p.id, p.name]));
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
            fetchAllPages<InfluencerPerfilRow>(async (from, to) => {
              const { data, error } = await supabase
                .from("influencer_perfil")
                .select("id, nome_artistico, cache_hora, status")
                .in("id", slice)
                .order("id")
                .range(from, to);
              return { data: (data as InfluencerPerfilRow[] | null) ?? null, error };
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
                .order("operadora_slug")
                .range(from, to);
              return { data: (data as DashboardInfluencerOperadoraCatalogo[] | null) ?? null, error };
            }),
          2,
        ),
      ]);

      const perfisCatalogo = perfis.map((row) => asPerfilCatalogo(row, nomePorId.get(row.id)));
      perfisCatalogo.sort((a, b) => a.nome_artistico.localeCompare(b.nome_artistico, "pt-BR"));
      return { perfis: perfisCatalogo, operadoras, vinculos };
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
