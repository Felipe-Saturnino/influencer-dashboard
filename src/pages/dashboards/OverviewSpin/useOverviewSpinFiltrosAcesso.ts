import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../lib/supabase";
import type { PermissaoValor } from "../../../types";
import type { OverviewSpinTab } from "./overviewSpinTabs";
import type { OverviewSpinCatalogoCanais } from "./overviewSpinCatalogo";

/**
 * Filtros Overview Spin — Admin irrestrito; demais perfis via canView de mesas_spin.
 * Lista de operadoras por aba usa catálogo Gestão de Estúdios (Dedicado / Network).
 */
export function useOverviewSpinFiltrosAcesso(opts: {
  canView: PermissaoValor;
  aba: OverviewSpinTab;
  catalogo: OverviewSpinCatalogoCanais;
}) {
  const { user, effectiveRole, escoposVisiveis, podeVerOperadora } = useApp();
  const role = effectiveRole ?? user?.role;
  const isAdmin = role === "admin";

  const [operadorasAtivas, setOperadorasAtivas] = useState<{ slug: string; nome: string }[]>([]);

  useEffect(() => {
    let alive = true;
    void supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (alive) setOperadorasAtivas(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, []);

  const showFiltroOperadora = useMemo(() => {
    if (isAdmin) return true;
    if (opts.canView === "sim") return true;
    return false;
  }, [isAdmin, opts.canView]);

  /** Escopo forçado quando Ver = próprios. */
  const operadoraSlugsForcado = useMemo((): string[] | null => {
    if (isAdmin) return null;
    if (opts.canView === "proprios") {
      const slugs = escoposVisiveis.operadorasVisiveis;
      return slugs.length > 0 ? [...slugs] : [];
    }
    return null;
  }, [isAdmin, opts.canView, escoposVisiveis.operadorasVisiveis]);

  const slugsPermitidosPelaAba = useMemo((): string[] | null => {
    if (opts.aba === "estudio_dedicado") return opts.catalogo.slugsComMesaDedicada;
    if (opts.aba === "estudio_network") return opts.catalogo.slugsComMesaNetwork;
    return null;
  }, [opts.aba, opts.catalogo.slugsComMesaDedicada, opts.catalogo.slugsComMesaNetwork]);

  const operadorasDoFiltro = useMemo(() => {
    let list = operadorasAtivas.filter((o) => podeVerOperadora(o.slug));
    if (slugsPermitidosPelaAba) {
      const allow = new Set(slugsPermitidosPelaAba);
      list = list.filter((o) => allow.has(o.slug));
    }
    if (operadoraSlugsForcado) {
      const force = new Set(operadoraSlugsForcado);
      list = list.filter((o) => force.has(o.slug));
    }
    return list;
  }, [operadorasAtivas, podeVerOperadora, slugsPermitidosPelaAba, operadoraSlugsForcado]);

  return {
    isAdmin,
    showFiltroOperadora,
    operadoraSlugsForcado,
    operadorasDoFiltro,
    operadorasAtivas,
    podeVerOperadora,
    escoposVisiveis,
    slugsPermitidosPelaAba,
  };
}
