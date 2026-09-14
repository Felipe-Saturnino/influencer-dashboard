import { useEffect, useState } from "react";
import {
  buildMesesOrdemSaida,
  fetchOrdensSaida,
  ordemVisivelNoMes,
} from "../../../../lib/techOpsOrdemSaida";
import {
  estoqueDisponivelItem,
  fetchEstoqueEquipamentos,
  fetchEstoqueItens,
} from "../../../../lib/techOpsEstoque";

export type HomeGestorTechOpsAlertas = { osSolicitadas: number };

export type HomeGestorTechOpsKpis = {
  mesLabel: string;
  pendencias: { solicitadas: number; abertas: number; concluidasMes: number; totalMes: number };
  estoque: { itensEmUso: number; eqManutencao: number; eqEstoque: number; itensTotais: number };
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
        const meses = buildMesesOrdemSaida();
        const mesAtual = meses[meses.length - 1]!;
        const mesKey = mesAtual.key;

        const [osRows, itens, equips] = await Promise.all([
          fetchOrdensSaida(),
          fetchEstoqueItens(),
          fetchEstoqueEquipamentos(),
        ]);

        if (cancelled) return;

        const noMes = osRows.filter((r) => ordemVisivelNoMes(r, mesKey, false));
        const solicitadas = noMes.filter((r) => r.status === "solicitada").length;
        const abertas = noMes.filter((r) => r.status === "aberta").length;
        const concluidasMes = noMes.filter((r) => r.status === "concluida").length;
        const totalMes = noMes.length;

        const itensEmUso =
          itens.reduce((s, r) => s + (Number(r.quantidade_em_uso) || 0), 0) +
          equips.filter((e) => e.status === "em_uso").length;

        const eqManutencao =
          itens.reduce((s, r) => s + (Number(r.quantidade_manutencao) || 0), 0) +
          equips.filter((e) => e.status === "manutencao").length;

        const eqEstoque =
          itens.reduce((s, r) => s + estoqueDisponivelItem(r), 0) +
          equips.filter((e) => e.status === "estoque").length;

        const itensTotais =
          itens.reduce((s, r) => s + (Number(r.quantidade_total) || 0), 0) + equips.length;

        setAlertas({ osSolicitadas: solicitadas });
        setKpis({
          mesLabel: mesAtual.label,
          pendencias: { solicitadas, abertas, concluidasMes, totalMes },
          estoque: { itensEmUso, eqManutencao, eqEstoque, itensTotais },
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
