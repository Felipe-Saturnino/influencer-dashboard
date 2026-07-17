import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import type { Role } from "../types";
import { useDashboardFiltros } from "./useDashboardFiltros";
import { ROLES_VISAO_OPERACAO_SPIN } from "../lib/staffRoles";

type Modo = "gestor" | "operadora";

const DEBOUNCE_MS = 280;

/**
 * Badge no menu: pendentes aguardando o papel atual.
 * - gestor: solicitações dealer + campanha roteiro + roteiro mesa onde aguarda_resposta_de = 'gestor'
 * - operadora: idem com aguarda = 'operadora' nas operadoras do escopo
 *
 * Debounce + singleflight: bursts de Realtime não disparam 6× head-count em paralelo.
 */
export function usePendenciasCount(modo: Modo): number {
  const { user } = useApp();
  const { operadoraSlugsForcado } = useDashboardFiltros();
  const [count, setCount] = useState(0);
  const slugsKey = operadoraSlugsForcado?.join("|") ?? "";
  const slugsRef = useRef(operadoraSlugsForcado);
  slugsRef.current = operadoraSlugsForcado;

  const fetchingRef = useRef(false);
  const pendingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const role = user?.role ?? "";
    if (modo === "gestor" && (!role || !ROLES_VISAO_OPERACAO_SPIN.includes(role as Role))) {
      setCount(0);
      return () => {
        aliveRef.current = false;
      };
    }
    if (modo === "operadora" && role !== "operador") {
      setCount(0);
      return () => {
        aliveRef.current = false;
      };
    }

    async function buscarOnce() {
      if (modo === "gestor") {
        const [{ count: cDealer, error: e1 }, { count: cCamp, error: e2 }, { count: cMesa, error: e3 }] =
          await Promise.all([
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
            supabase
              .from("roteiro_mesa_solicitacoes")
              .select("*", { count: "exact", head: true })
              .in("status", ["pendente", "em_andamento"])
              .eq("aguarda_resposta_de", "gestor"),
          ]);
        if (!aliveRef.current) return;
        if (e1 || e2 || e3) {
          setCount(0);
          return;
        }
        setCount((cDealer ?? 0) + (cCamp ?? 0) + (cMesa ?? 0));
        return;
      }

      const slugs = slugsRef.current;
      if (!slugs?.length) {
        if (aliveRef.current) setCount(0);
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
      const baseMesa = supabase
        .from("roteiro_mesa_solicitacoes")
        .select("*", { count: "exact", head: true })
        .eq("aguarda_resposta_de", "operadora")
        .in("status", ["pendente", "em_andamento"]);
      const qDealer = slugs.length === 1 ? baseDealer.eq("operadora_slug", slugs[0]) : baseDealer.in("operadora_slug", slugs);
      const qCamp = slugs.length === 1 ? baseCamp.eq("operadora_slug", slugs[0]) : baseCamp.in("operadora_slug", slugs);
      const qMesa = slugs.length === 1 ? baseMesa.eq("operadora_slug", slugs[0]) : baseMesa.in("operadora_slug", slugs);
      const [{ count: cDealer, error: e1 }, { count: cCamp, error: e2 }, { count: cMesa, error: e3 }] = await Promise.all([
        qDealer,
        qCamp,
        qMesa,
      ]);
      if (!aliveRef.current) return;
      if (e1 || e2 || e3) {
        setCount(0);
        return;
      }
      setCount((cDealer ?? 0) + (cCamp ?? 0) + (cMesa ?? 0));
    }

    async function runBuscar() {
      if (fetchingRef.current) {
        pendingRef.current = true;
        return;
      }
      fetchingRef.current = true;
      try {
        await buscarOnce();
      } finally {
        fetchingRef.current = false;
        if (pendingRef.current && aliveRef.current) {
          pendingRef.current = false;
          void runBuscar();
        }
      }
    }

    function scheduleBuscar() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void runBuscar();
      }, DEBOUNCE_MS);
    }

    void runBuscar();

    const channel = supabase
      .channel(`pendencias_${modo}_${user?.id ?? "anon"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dealer_solicitacoes" }, () => {
        scheduleBuscar();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "roteiro_campanha_solicitacoes" }, () => {
        scheduleBuscar();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "roteiro_mesa_solicitacoes" }, () => {
        scheduleBuscar();
      })
      .subscribe();

    return () => {
      aliveRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [modo, user?.id, user?.role, slugsKey]);

  return count;
}
