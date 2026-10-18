import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { fmtBRL } from "../../../../lib/dashboardHelpers";
import { getPeriodoComparativoMoMDmenos1 } from "../../../../lib/dashboardHelpers";
import { getHomeKpiReferenciaMes } from "../../../../lib/homeInvestidorMtd";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { fetchIntegracoesAtivasKpi } from "../../../plataforma/StatusTecnico/statusTecnicoIntegracoesAtivasKpi";

export type HomeAdminAlertas = { falhasSync48h: number };

export type HomeAdminKpis = {
  ggrMtdFmt: string;
  /** Mesmo card Status Técnico — ex.: «12 / 19». */
  integracoesAtivasFmt: string;
  usuariosAtivos: number;
  prestadores: number;
  mesLabel: string;
};

type DailyGgrRow = { ggr: number | null };

async function somaGgrTabela(
  tabela: "relatorio_daily_summary" | "relatorio_network_daily_summary",
  inicio: string,
  fim: string,
): Promise<number> {
  const rows = await fetchAllPages<DailyGgrRow>(async (from, to) =>
    supabase
      .from(tabela)
      .select("ggr")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true })
      .range(from, to),
  );
  return rows.reduce((s, r) => s + Number(r.ggr ?? 0), 0);
}

/**
 * KPIs da Home Admin.
 * GGR = mesma origem da aba Overview do Overview Spin (Dedicado + Network, MTD até D-1, Todas Operadoras).
 * Integrações ativas = mesma regra do card Status Técnico (`fetchIntegracoesAtivasKpi`).
 */
export function useHomeAdminData() {
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState(false);
  const [alertas, setAlertas] = useState<HomeAdminAlertas>({ falhasSync48h: 0 });
  const [kpis, setKpis] = useState<HomeAdminKpis | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setReady(false);
      setErro(false);
      try {
        const referencia = getHomeKpiReferenciaMes();
        const { atual } = getPeriodoComparativoMoMDmenos1(referencia.ano, referencia.mes);
        const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const [ggrDed, ggrNet, falhas, integracoes, users, prest] = await Promise.all([
          somaGgrTabela("relatorio_daily_summary", atual.inicio, atual.fim),
          somaGgrTabela("relatorio_network_daily_summary", atual.inicio, atual.fim),
          supabase
            .from("sync_logs")
            .select("id", { count: "exact", head: true })
            .eq("status", "falha")
            .gte("created_at", since),
          fetchIntegracoesAtivasKpi(),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("ativo", true),
          supabase.from("rh_funcionarios").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        ]);

        if (cancelled) return;

        setAlertas({ falhasSync48h: falhas.count ?? 0 });
        setKpis({
          ggrMtdFmt: fmtBRL(ggrDed + ggrNet),
          integracoesAtivasFmt: integracoes.display,
          usuariosAtivos: users.error ? 0 : (users.count ?? 0),
          prestadores: prest.count ?? 0,
          mesLabel: referencia.label,
        });
      } catch (e) {
        console.error("[HomeAdmin] carga:", e);
        if (!cancelled) {
          setErro(true);
          setKpis(null);
        }
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
