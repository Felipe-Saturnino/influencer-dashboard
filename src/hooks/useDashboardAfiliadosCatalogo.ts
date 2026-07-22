import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { nomeExibicaoLinksEntidade } from "../lib/linksMateriaisCanal";
import { useDashboardFiltros } from "./useDashboardFiltros";

export type DashboardAfiliadoCatalogo = {
  id: string;
  /** Nome para filtro / ranking (nome do cadastro Afiliados). */
  nome: string;
};

/**
 * Catálogo de afiliados cadastrados (`profiles.role = afiliado` + `influencer_perfil`).
 * Usado nos dashboards Afiliados / Overview Afiliado — não misturar com influencers.
 */
export function useDashboardAfiliadosCatalogo() {
  const { podeVerInfluencer } = useDashboardFiltros();

  const query = useQuery({
    queryKey: ["catalogos", "dashboards-afiliados"],
    queryFn: async () => {
      const { data: profiles, error: errProfiles } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("role", "afiliado")
        .order("name");
      if (errProfiles) throw errProfiles;

      const ids = (profiles ?? []).map((p) => p.id);
      const perfisRes =
        ids.length > 0
          ? await supabase
              .from("influencer_perfil")
              .select("id, nome_artistico, nome_completo")
              .in("id", ids)
          : { data: [] as { id: string; nome_artistico: string | null; nome_completo: string | null }[], error: null };
      if (perfisRes.error) throw perfisRes.error;

      const perfilById = new Map(
        (perfisRes.data ?? []).map((p) => [p.id, p] as const),
      );

      const afiliados: DashboardAfiliadoCatalogo[] = (profiles ?? []).map((p) => {
        const perfil = perfilById.get(p.id);
        return {
          id: p.id,
          nome: nomeExibicaoLinksEntidade({
            role: "afiliado",
            nome_artistico: perfil?.nome_artistico,
            nome_completo: perfil?.nome_completo,
            name: p.name,
          }),
        };
      });

      afiliados.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      return { afiliados };
    },
    staleTime: 10 * 60 * 1000,
  });

  const afiliados = useMemo(() => {
    const list = query.data?.afiliados ?? [];
    return list.filter((a) => podeVerInfluencer(a.id));
  }, [query.data?.afiliados, podeVerInfluencer]);

  const afiliadoNomeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of afiliados) m.set(a.id, a.nome);
    return m;
  }, [afiliados]);

  const afiliadoIds = useMemo(() => afiliados.map((a) => a.id), [afiliados]);

  return {
    afiliados,
    afiliadoNomeById,
    afiliadoIds,
    isPending: query.isPending,
    error: query.error,
  };
}
