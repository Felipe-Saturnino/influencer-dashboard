import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { MESES_PT } from "../../../../lib/dashboardConstants";
import { fetchPerformanceHubAvaliacoes } from "../../../../lib/academyPerformanceHubAvaliacoesFetch";
import { avaliacaoVisivelAbaAvaliacoes } from "../../../../lib/academyPerformanceHubWorkflow";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { getPeriodoHistoricoCompetencias } from "../../../../lib/dashboardHelpers";
import { itemNoMesCarrossel } from "../../../academy/PortalAcademy/portalAcademyCarrossel";

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

type PortalLeanRow = {
  id: string;
  status: string;
  created_at: string;
  published_at: string | null;
};

function mesCivilAtual(): { ano: number; mes: number; label: string } {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = d.getMonth();
  return { ano, mes, label: `${MESES_PT[mes]} ${ano}` };
}

function parseDataBr(value: string): { ano: number; mes: number } | null {
  const [dia, mes, ano] = value.split("/").map(Number);
  if (!dia || !mes || !ano) return null;
  return { ano, mes: mes - 1 };
}

function rangePublishedAtMes(ano: number, mes: number): { ini: string; fim: string } {
  const mm = String(mes + 1).padStart(2, "0");
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  return {
    ini: `${ano}-${mm}-01T00:00:00`,
    fim: `${ano}-${mm}-${String(ultimo).padStart(2, "0")}T23:59:59`,
  };
}

async function countPortalStatus(status: string): Promise<number> {
  let total = 0;
  for (const table of PORTAL_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (error) {
      console.error(`[HomeGestorAcademy] count ${table}/${status}:`, error);
      continue;
    }
    total += count ?? 0;
  }
  return total;
}

async function carregarPostagensPortal(): Promise<PortalLeanRow[]> {
  const { inicio } = getPeriodoHistoricoCompetencias();
  const out: PortalLeanRow[] = [];
  for (const table of PORTAL_TABLES) {
    try {
      const rows = await fetchAllPages<PortalLeanRow>(async (from, to) =>
        supabase
          .from(table)
          .select("id, status, created_at, published_at")
          .gte("created_at", inicio)
          .order("created_at", { ascending: false })
          .range(from, to),
      );
      out.push(...rows);
    } catch (e) {
      console.error(`[HomeGestorAcademy] portal ${table}:`, e);
    }
  }
  return out;
}

async function contarManuaisPublicadosMes(ano: number, mes: number): Promise<number> {
  const { ini, fim } = rangePublishedAtMes(ano, mes);
  const { count, error } = await supabase
    .from("academy_portal_manual")
    .select("id", { count: "exact", head: true })
    .eq("status", "publicado")
    .gte("published_at", ini)
    .lte("published_at", fim);
  if (error) {
    console.error("[HomeGestorAcademy] manuais mês:", error);
    return 0;
  }
  return count ?? 0;
}

/** (prestadores × itens que exigem ciência) − soma de ciências registradas. */
async function contarCienciasPendentes(): Promise<number> {
  const { data: manuais, error: manErr } = await supabase
    .from("academy_portal_manual")
    .select("id")
    .eq("status", "publicado")
    .eq("requires_acknowledgment", true);

  if (manErr) {
    console.error("[HomeGestorAcademy] manuais ciência:", manErr);
    return 0;
  }

  const ids = (manuais ?? []).map((m: { id: string }) => m.id);
  if (ids.length === 0) return 0;

  const [{ count: nPrestadores, error: prestErr }, receiptsRes] = await Promise.all([
    supabase
      .from("rh_funcionarios")
      .select("id", { count: "exact", head: true })
      .in("status", ["ativo", "indisponivel"]),
    supabase
      .from("academy_portal_read_receipt")
      .select("content_id")
      .in("content_id", ids)
      .not("acknowledged_at", "is", null),
  ]);

  if (prestErr) console.error("[HomeGestorAcademy] prestadores ciência:", prestErr);
  if (receiptsRes.error) console.error("[HomeGestorAcademy] receipts ciência:", receiptsRes.error);

  const nPrest = nPrestadores ?? 0;
  const nCientes = (receiptsRes.data ?? []).length;
  return Math.max(0, nPrest * ids.length - nCientes);
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
        const { ano, mes, label } = mesCivilAtual();
        const mesSel = { ano, mes, label };

        const [avaliacoes, postagens, emAprovacao, manuaisPublicados, cienciasPendentes] =
          await Promise.all([
            fetchPerformanceHubAvaliacoes(),
            carregarPostagensPortal(),
            countPortalStatus("aprovacao"),
            contarManuaisPublicadosMes(ano, mes),
            contarCienciasPendentes(),
          ]);

        if (cancelled) return;

        const noMesHub = avaliacoes.filter((row) => {
          if (!avaliacaoVisivelAbaAvaliacoes(row)) return false;
          const d = parseDataBr(row.data);
          return d != null && d.ano === ano && d.mes === mes;
        });

        const aguardando = noMesHub.filter((r) => r.status === "aguardando").length;
        const feedback = noMesHub.filter((r) => r.status === "feedback").length;
        const aprovadasMes = noMesHub.filter(
          (r) => r.status === "aprovado" || r.status === "concluida",
        ).length;
        const publicadasMesHub = noMesHub.length;

        const publicadasMesPortal = postagens.filter(
          (r) => r.status === "publicado" && itemNoMesCarrossel(r.published_at, mesSel),
        ).length;

        setAlertas({
          postagensAprovacao: emAprovacao,
          metaAvaliacoesMes: META_AVALIACOES_MES,
          metaAtingida: aprovadasMes >= META_AVALIACOES_MES,
        });
        setKpis({
          mesLabel: label,
          avaliacoes: {
            aguardando,
            feedback,
            aprovadasMes,
            publicadasMes: publicadasMesHub,
          },
          portal: {
            emAprovacao,
            publicadasMes: publicadasMesPortal,
            manuaisPublicados,
            cienciasPendentes,
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
