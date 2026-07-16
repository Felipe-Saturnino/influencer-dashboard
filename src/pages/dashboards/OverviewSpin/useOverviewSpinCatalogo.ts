import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
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
      const [estRes, mesasRes] = await Promise.all([
        supabase
          .from("estudios_spin")
          .select("slug, tipo, ativo, estudios_spin_operadoras(operadora_slug)")
          .eq("ativo", true),
        supabase.from("mesas_spin_cadastro").select("estudio_slug, operadora_slug"),
      ]);
      if (estRes.error) throw estRes.error;
      if (mesasRes.error) throw mesasRes.error;
      return buildCatalogoCanaisMesas(
        (estRes.data ?? []) as EstudioCatalogoRow[],
        (mesasRes.data ?? []) as MesaCatalogoRow[],
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
