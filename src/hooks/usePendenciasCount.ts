import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { useDashboardFiltros } from "./useDashboardFiltros";

type Modo = "gestor" | "operadora";

/**
 * Badge no menu: pendentes aguardando o papel atual.
 * - gestor: solicitações em aberto onde aguarda_resposta_de = 'gestor'
 * - operadora: mesma tabela, aguarda_resposta_de = 'operadora' nas operadoras do escopo
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
        const { count: c, error } = await supabase
          .from("dealer_solicitacoes")
          .select("*", { count: "exact", head: true })
          .in("status", ["pendente", "em_andamento"])
          .eq("aguarda_resposta_de", "gestor");
        if (error) {
          setCount(0);
          return;
        }
        setCount(c ?? 0);
        return;
      }

      const slugs = operadoraSlugsForcado;
      if (!slugs?.length) {
        setCount(0);
        return;
      }
      let q = supabase
        .from("dealer_solicitacoes")
        .select("*", { count: "exact", head: true })
        .eq("aguarda_resposta_de", "operadora")
        .in("status", ["pendente", "em_andamento"]);
      q = slugs.length === 1 ? q.eq("operadora_slug", slugs[0]) : q.in("operadora_slug", slugs);
      const { count: c, error } = await q;
      if (error) {
        setCount(0);
        return;
      }
      setCount(c ?? 0);
    }

    void buscar();

    const channel = supabase
      .channel(`pendencias_${modo}_${user?.id ?? "anon"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dealer_solicitacoes" },
        () => {
          void buscar();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [modo, user?.id, user?.role, operadoraSlugsForcado]);

  return count;
}
