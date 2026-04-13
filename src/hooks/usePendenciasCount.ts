import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { useDashboardFiltros } from "./useDashboardFiltros";

type Modo = "gestor" | "operadora";

/**
 * Badge no menu: pendentes aguardando o papel atual.
 * - gestor: solicitações dealer + campanha roteiro onde aguarda_resposta_de = 'gestor'
 * - operadora: idem com aguarda = 'operadora' nas operadoras do escopo
 */
export function usePendenciasCount(modo: Modo): number {
  const { user } = useApp();
  const { operadoraSlugsForcado } = useDashboardFiltros();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const role = user?.role ?? "";
    if (modo === "gestor" && !["gestor", "admin", "executivo"].includes(role)) {
      setCount(0);
      return;
    }
    if (modo === "operadora" && role !== "operador") {
      setCount(0);
      return;
    }

    async function buscar() {
      if (modo === "gestor") {
        const [{ count: cDealer, error: e1 }, { count: cCamp, error: e2 }] = await Promise.all([
          supabase
            .from("dealer_solicitacoes")
            .select("*", { count: "exact", head: true })
            .in("status", ["pendente", "em_andamento"])
            .eq("aguarda_resposta_de", "gestor"),
          supabase
            .from("roteiro_campanha_solicitacoes")
            .select("*", { count: "exact", head: true })
            .in("status", ["pendente", "em_andamento"])
            .eq("aguarda_resposta_de", "gestor"),
        ]);
        if (e1 || e2) {
          setCount(0);
          return;
        }
        setCount((cDealer ?? 0) + (cCamp ?? 0));
        return;
      }

      const slugs = operadoraSlugsForcado;
      if (!slugs?.length) {
        setCount(0);
        return;
      }
      const baseDealer = supabase
        .from("dealer_solicitacoes")
        .select("*", { count: "exact", head: true })
        .eq("aguarda_resposta_de", "operadora")
        .in("status", ["pendente", "em_andamento"]);
      const baseCamp = supabase
        .from("roteiro_campanha_solicitacoes")
        .select("*", { count: "exact", head: true })
        .eq("aguarda_resposta_de", "operadora")
        .in("status", ["pendente", "em_andamento"]);
      const qDealer = slugs.length === 1 ? baseDealer.eq("operadora_slug", slugs[0]) : baseDealer.in("operadora_slug", slugs);
      const qCamp = slugs.length === 1 ? baseCamp.eq("operadora_slug", slugs[0]) : baseCamp.in("operadora_slug", slugs);
      const [{ count: cDealer, error: e1 }, { count: cCamp, error: e2 }] = await Promise.all([qDealer, qCamp]);
      if (e1 || e2) {
        setCount(0);
        return;
      }
      setCount((cDealer ?? 0) + (cCamp ?? 0));
    }

    void buscar();

    const channel = supabase
      .channel(`pendencias_${modo}_${user?.id ?? "anon"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dealer_solicitacoes" }, () => {
        void buscar();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "roteiro_campanha_solicitacoes" }, () => {
        void buscar();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [modo, user?.id, user?.role, operadoraSlugsForcado]);

  return count;
}
