import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import {
  buildCatalogoCanaisMesas,
  type EstudioCatalogoRow,
  type MesaCatalogoRow,
  type OverviewSpinCatalogoCanais,
  podeVerAbaCanalCatalogo,
} from "./overviewSpinCatalogo";

const CATALOGO_VAZIO: OverviewSpinCatalogoCanais = {
  slugsComMesaDedicada: [],
  slugsComMesaNetwork: [],
};

export function useOverviewSpinCatalogo(opts: {
  isAdmin: boolean;
  canView: "sim" | "proprios" | "nao";
  operadorasVisiveis: string[];
}) {
  const catalogoQuery = useQuery({
    queryKey: ["overview-spin", "catalogo-canais"],
    queryFn: async () => {
      const [estRows, mesasRows] = await Promise.all([
        fetchAllPages(async (from, to) =>
          supabase
            .from("estudios_spin")
            .select("slug, tipo, ativo, estudios_spin_operadoras(operadora_slug)")
            .eq("ativo", true)
            .range(from, to),
        ),
        fetchAllPages(async (from, to) =>
          supabase.from("mesas_spin_cadastro").select("estudio_slug, operadora_slug").range(from, to),
        ),
      ]);
      return buildCatalogoCanaisMesas(
        estRows as EstudioCatalogoRow[],
        mesasRows as MesaCatalogoRow[],
      );
    },
    staleTime: 10 * 60 * 1000,
  });
  const catalogo = catalogoQuery.data ?? CATALOGO_VAZIO;
  const loadingCatalogo = catalogoQuery.isPending;

  const verAbaDedicado = useMemo(
    () =>
      podeVerAbaCanalCatalogo({
        canal: "dedicado",
        isAdmin: opts.isAdmin,
        canView: opts.canView,
        operadorasVisiveis: opts.operadorasVisiveis,
        catalogo,
      }),
    [opts.isAdmin, opts.canView, opts.operadorasVisiveis, catalogo],
  );

  const verAbaNetwork = useMemo(
    () =>
      podeVerAbaCanalCatalogo({
        canal: "network",
        isAdmin: opts.isAdmin,
        canView: opts.canView,
        operadorasVisiveis: opts.operadorasVisiveis,
        catalogo,
      }),
    [opts.isAdmin, opts.canView, opts.operadorasVisiveis, catalogo],
  );

  return { catalogo, loadingCatalogo, verAbaDedicado, verAbaNetwork };
}
