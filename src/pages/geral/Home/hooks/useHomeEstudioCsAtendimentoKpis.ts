import { useEffect, useState } from "react";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { supabase } from "../../../../lib/supabase";

export type HomeEstudioCsAtendimentoKpis = {
  mesLabel: string;
  abertos: number;
  emAndamento: number;
  arquivadosMes: number;
};

/**
 * Contagens Atendimento (Site + E-mail + Instagram) para Home Customer Service.
 */
export function useHomeEstudioCsAtendimentoKpis(): {
  loading: boolean;
  erro: boolean;
  kpis: HomeEstudioCsAtendimentoKpis;
} {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [kpis, setKpis] = useState<HomeEstudioCsAtendimentoKpis>({
    mesLabel: "Atendimento",
    abertos: 0,
    emAndamento: 0,
    arquivadosMes: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const agora = new Date();
        const mesIni = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-01`;
        const rows = await fetchAllPages<{
          id: string;
          status: string | null;
          arquivado_em: string | null;
          created_at: string | null;
        }>(async (from, to) => {
          const { data, error } = await supabase
            .from("cs_chamados")
            .select("id, status, arquivado_em, created_at")
            .range(from, to);
          return { data: data ?? null, error };
        });
        if (cancelled) return;

        let abertos = 0;
        let emAndamento = 0;
        let arquivadosMes = 0;
        for (const r of rows) {
          const st = (r.status ?? "").trim();
          if (st === "aberto") abertos += 1;
          else if (st === "em_andamento") emAndamento += 1;
          else if (st === "arquivado") {
            const arq = (r.arquivado_em ?? r.created_at ?? "").slice(0, 10);
            if (arq >= mesIni) arquivadosMes += 1;
          }
        }

        setKpis({
          mesLabel: "Atendimento",
          abertos,
          emAndamento,
          arquivadosMes,
        });
      } catch (e) {
        console.error("[Home] CS atendimento KPIs:", e);
        if (!cancelled) {
          setErro(true);
          setKpis({
            mesLabel: "Atendimento",
            abertos: 0,
            emAndamento: 0,
            arquivadosMes: 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, erro, kpis };
}
