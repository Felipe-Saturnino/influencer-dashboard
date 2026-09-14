import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { getHomeKpiPeriodosComparativoMoM } from "../../../../lib/homeInvestidorMtd";

export type HomeGestorAcademyAlertas = {
  postagensAprovacao: number;
  metaAvaliacoesMes: number;
  metaAtingida: boolean;
};

export type HomeGestorAcademyKpis = {
  mesLabel: string;
  avaliacoes: { aguardando: number; feedback: number; aprovadasMes: number; publicadasMes: number };
  portal: { emAprovacao: number; publicadasMes: number; manuaisPublicados: number; cienciasPendentes: number };
};

const META_AVALIACOES_MES = 3;
const PORTAL_TABLES = ["academy_portal_comunicado", "academy_portal_dica", "academy_portal_manual"] as const;

async function countPortal(status: string, publishedRange?: { ini: string; fim: string }): Promise<number> {
  let total = 0;
  for (const table of PORTAL_TABLES) {
    let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("status", status);
    if (publishedRange) {
      q = q
        .gte("published_at", `${publishedRange.ini}T00:00:00`)
        .lte("published_at", `${publishedRange.fim}T23:59:59`);
    }
    const { count, error } = await q;
    if (!error) total += count ?? 0;
  }
  return total;
}

export function useHomeGestorAcademyData() {
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState(false);
  const [alertas, setAlertas] = useState<HomeGestorAcademyAlertas>({
    postagensAprovacao: 0,
    metaAvaliacoesMes: META_AVALIACOES_MES,
    metaAtingida: true,
  });
  const [kpis, setKpis] = useState<HomeGestorAcademyKpis | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setReady(false);
      setErro(false);
      try {
        const { referencia, atual } = getHomeKpiPeriodosComparativoMoM();
        const range = { ini: atual.inicio, fim: atual.fim };

        const [emAprovacao, hubRes, manuaisPub, portalPubMes] = await Promise.all([
          countPortal("aprovacao"),
          supabase.from("academy_performance_hub_avaliacao").select("id, status, created_at, published_at"),
          supabase
            .from("academy_portal_manual")
            .select("id", { count: "exact", head: true })
            .eq("status", "publicado"),
          countPortal("publicado", range),
        ]);

        if (cancelled) return;
        if (hubRes.error) {
          console.error("[HomeGestorAcademy]", hubRes.error);
          setErro(true);
          return;
        }

        const hub = (hubRes.data ?? []) as {
          status: string;
          created_at?: string | null;
          published_at?: string | null;
        }[];
        const aguardando = hub.filter((r) => r.status === "aguardando").length;
        const feedback = hub.filter((r) => r.status === "feedback").length;

        const noMes = (iso: string | null | undefined) => {
          if (!iso) return false;
          const d = iso.slice(0, 10);
          return d >= range.ini && d <= range.fim;
        };
        const hubMes = hub.filter((r) => noMes(r.published_at) || noMes(r.created_at));
        const aprovadasMes = hubMes.filter((r) => r.status === "aprovado" || r.status === "concluida").length;
        const publicadasMesHub = hubMes.length;
        const metaAtingida = aprovadasMes >= META_AVALIACOES_MES;
        const manuais = manuaisPub.count ?? 0;

        setAlertas({
          postagensAprovacao: emAprovacao,
          metaAvaliacoesMes: META_AVALIACOES_MES,
          metaAtingida,
        });
        setKpis({
          mesLabel: referencia.label,
          avaliacoes: {
            aguardando,
            feedback,
            aprovadasMes,
            publicadasMes: publicadasMesHub,
          },
          portal: {
            emAprovacao,
            publicadasMes: portalPubMes,
            manuaisPublicados: manuais,
            cienciasPendentes: 0,
          },
        });
      } catch (e) {
        console.error("[HomeGestorAcademy] carga:", e);
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
