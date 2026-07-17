import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type DashboardInfluencerCatalogo = {
  id: string;
  nome_artistico: string;
  cache_hora: number;
};

export type DashboardOperadoraCatalogo = {
  slug: string;
  nome: string;
};

export type DashboardInfluencerOperadoraCatalogo = {
  influencer_id: string;
  operadora_slug: string;
};

export function useDashboardCatalogos() {
  const query = useQuery({
    queryKey: ["catalogos", "dashboards-influencers"],
    queryFn: async () => {
      const [perfisRes, opsRes, vinculosRes] = await Promise.all([
        supabase
          .from("influencer_perfil")
          .select("id, nome_artistico, cache_hora")
          .order("nome_artistico"),
        supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome"),
        supabase.from("influencer_operadoras").select("influencer_id, operadora_slug"),
      ]);
      if (perfisRes.error) throw perfisRes.error;
      if (opsRes.error) throw opsRes.error;
      if (vinculosRes.error) throw vinculosRes.error;
      return {
        perfis: (perfisRes.data ?? []) as DashboardInfluencerCatalogo[],
        operadoras: (opsRes.data ?? []) as DashboardOperadoraCatalogo[],
        vinculos: (vinculosRes.data ?? []) as DashboardInfluencerOperadoraCatalogo[],
      };
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
