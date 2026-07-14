import { useEffect, useMemo, useState } from "react";
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
  const [catalogo, setCatalogo] = useState<OverviewSpinCatalogoCanais>(CATALOGO_VAZIO);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingCatalogo(true);
    void (async () => {
      try {
        const [estRes, mesasRes] = await Promise.all([
          supabase
            .from("estudios_spin")
            .select("slug, tipo, ativo, estudios_spin_operadoras(operadora_slug)")
            .eq("ativo", true),
          supabase.from("mesas_spin_cadastro").select("estudio_slug, operadora_slug"),
        ]);
        if (!alive) return;
        const built = buildCatalogoCanaisMesas(
          (estRes.data ?? []) as EstudioCatalogoRow[],
          (mesasRes.data ?? []) as MesaCatalogoRow[],
        );
        setCatalogo(built);
      } catch {
        if (alive) setCatalogo(CATALOGO_VAZIO);
      } finally {
        if (alive) setLoadingCatalogo(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
