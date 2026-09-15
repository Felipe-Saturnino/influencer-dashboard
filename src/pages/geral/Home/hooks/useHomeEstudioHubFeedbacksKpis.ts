import { useEffect, useState } from "react";
import { fetchPerformanceHubAvaliacoes } from "../../../../lib/academyPerformanceHubAvaliacoesFetch";
import { avaliacaoVisivelAbaAvaliacoes } from "../../../../lib/academyPerformanceHubWorkflow";
import { labelMesCivilAtual } from "./useHomePresencaAcoesNecessarias";

function parseDataBr(data: string | null | undefined): { ano: number; mes: number } | null {
  if (!data) return null;
  const m = data.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return { ano: Number(m[3]), mes: Number(m[2]) - 1 };
  const iso = data.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) - 1 };
  return null;
}

export type HomeEstudioHubFeedbacksKpis = {
  mesLabel: string;
  feedbacksPendentes: number;
  aguardando: number;
  publicadasMes: number;
};

/**
 * Contagens do Performance Hub para Home Estúdio (SL / Coach).
 * Feedbacks = status `feedback`; Aguardando = `aguardando`; Publicadas (mês) = visíveis no mês civil.
 */
export function useHomeEstudioHubFeedbacksKpis(): {
  loading: boolean;
  erro: boolean;
  kpis: HomeEstudioHubFeedbacksKpis;
} {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [kpis, setKpis] = useState<HomeEstudioHubFeedbacksKpis>({
    mesLabel: labelMesCivilAtual(),
    feedbacksPendentes: 0,
    aguardando: 0,
    publicadasMes: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes0 = agora.getMonth();
        const avaliacoes = await fetchPerformanceHubAvaliacoes();
        if (cancelled) return;

        const visiveis = avaliacoes.filter(avaliacaoVisivelAbaAvaliacoes);
        const feedbacksPendentes = visiveis.filter((r) => r.status === "feedback").length;
        const aguardando = visiveis.filter((r) => r.status === "aguardando").length;
        const publicadasMes = visiveis.filter((r) => {
          const d = parseDataBr(r.data);
          return d != null && d.ano === ano && d.mes === mes0;
        }).length;

        setKpis({
          mesLabel: labelMesCivilAtual(agora),
          feedbacksPendentes,
          aguardando,
          publicadasMes,
        });
      } catch (e) {
        console.error("[Home] hub feedbacks:", e);
        if (!cancelled) {
          setErro(true);
          setKpis({
            mesLabel: labelMesCivilAtual(),
            feedbacksPendentes: 0,
            aguardando: 0,
            publicadasMes: 0,
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
