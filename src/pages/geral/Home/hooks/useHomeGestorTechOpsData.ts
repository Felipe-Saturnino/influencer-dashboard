import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { getHomeKpiPeriodosComparativoMoM } from "../../../../lib/homeInvestidorMtd";

export type HomeGestorTechOpsAlertas = { osSolicitadas: number };

export type HomeGestorTechOpsKpis = {
  mesLabel: string;
  pendencias: { solicitadas: number; abertas: number; concluidasMes: number; totalMes: number };
  estoque: { itensEmUso: number; eqManutencao: number; eqEstoque: number; itensSet: number };
};

export function useHomeGestorTechOpsData() {
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState(false);
  const [alertas, setAlertas] = useState<HomeGestorTechOpsAlertas>({ osSolicitadas: 0 });
  const [kpis, setKpis] = useState<HomeGestorTechOpsKpis | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setReady(false);
      setErro(false);
      try {
        const { referencia, atual } = getHomeKpiPeriodosComparativoMoM();
        const mesKey = atual.inicio.slice(0, 7);

        const [osRes, itensRes, eqRes, setOsRes] = await Promise.all([
          supabase
            .from("tech_ops_ordem_saida")
            .select("id, status, competencia")
            .or(`competencia.gte.${mesKey}-01,status.in.(solicitada,aberta)`),
          supabase.from("tech_ops_estoque_itens").select("quantidade_em_uso"),
          supabase.from("tech_ops_estoque_equipamentos").select("status"),
          supabase
            .from("tech_ops_ordem_saida")
            .select("id, tech_ops_ordem_saida_itens(id)")
            .eq("tipo", "interna")
            .eq("status", "aberta")
            .eq("ativo", true),
        ]);

        if (cancelled) return;
        if (osRes.error || itensRes.error || eqRes.error) {
          console.error("[HomeGestorTechOps]", osRes.error || itensRes.error || eqRes.error);
          setErro(true);
          return;
        }

        const os = (osRes.data ?? []) as { id: string; status: string; competencia: string }[];
        const solicitadas = os.filter((r) => r.status === "solicitada").length;
        const abertas = os.filter((r) => r.status === "aberta").length;
        const doMes = os.filter((r) => (r.competencia ?? "").startsWith(mesKey));
        const concluidasMes = doMes.filter((r) => r.status === "concluida").length;
        const totalMes = doMes.length;

        const itensEmUso = (itensRes.data ?? []).reduce(
          (s, r: { quantidade_em_uso?: number }) => s + (Number(r.quantidade_em_uso) || 0),
          0,
        );
        const eqs = (eqRes.data ?? []) as { status: string }[];
        const eqManutencao = eqs.filter((e) => e.status === "manutencao").length;
        const eqEstoque = eqs.filter((e) => e.status === "estoque").length;

        let itensSet = 0;
        if (!setOsRes.error && setOsRes.data) {
          for (const row of setOsRes.data as { tech_ops_ordem_saida_itens?: { id: string }[] | null }[]) {
            itensSet += row.tech_ops_ordem_saida_itens?.length ?? 0;
          }
        }

        setAlertas({ osSolicitadas: solicitadas });
        setKpis({
          mesLabel: referencia.label,
          pendencias: { solicitadas, abertas, concluidasMes, totalMes },
          estoque: { itensEmUso, eqManutencao, eqEstoque, itensSet },
        });
      } catch (e) {
        console.error("[HomeGestorTechOps] carga:", e);
        if (!cancelled) setErro(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, erro, alertas, kpis };
}
