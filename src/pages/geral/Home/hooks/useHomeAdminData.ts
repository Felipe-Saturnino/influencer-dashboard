import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { useHomeInvestidorKpisMesas } from "./useHomeInvestidorKpisMesas";
import { fmtBRL } from "../../../../lib/dashboardHelpers";
import { getHomeKpiReferenciaMes } from "../../../../lib/homeInvestidorMtd";

export type HomeAdminAlertas = { falhasSync48h: number };

export type HomeAdminKpis = {
  ggrMtdFmt: string;
  operadorasAtivas: number;
  usuariosAtivos: number;
  prestadores: number;
  mesLabel: string;
};

export function useHomeAdminData() {
  const mesas = useHomeInvestidorKpisMesas();
  const [readyExtra, setReadyExtra] = useState(false);
  const [erroExtra, setErroExtra] = useState(false);
  const [alertas, setAlertas] = useState<HomeAdminAlertas>({ falhasSync48h: 0 });
  const [counts, setCounts] = useState({
    operadorasAtivas: 0,
    usuariosAtivos: 0,
    prestadores: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setReadyExtra(false);
      setErroExtra(false);
      try {
        const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const [falhas, ops, users, prest] = await Promise.all([
          supabase
            .from("sync_logs")
            .select("id", { count: "exact", head: true })
            .eq("status", "falha")
            .gte("created_at", since),
          supabase.from("operadoras").select("id", { count: "exact", head: true }).eq("ativo", true),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("ativo", true),
          supabase.from("rh_funcionarios").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        ]);

        if (cancelled) return;
        setAlertas({ falhasSync48h: falhas.count ?? 0 });
        setCounts({
          operadorasAtivas: ops.count ?? 0,
          usuariosAtivos: users.error ? 0 : (users.count ?? 0),
          prestadores: prest.count ?? 0,
        });
      } catch (e) {
        console.error("[HomeAdmin] carga:", e);
        if (!cancelled) setErroExtra(true);
      } finally {
        if (!cancelled) setReadyExtra(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = readyExtra && !mesas.loading;
  const erro = erroExtra || mesas.erro;
  const kpis: HomeAdminKpis | null =
    ready && !mesas.erro
      ? {
          ggrMtdFmt: fmtBRL(mesas.data?.totals.ggr ?? 0),
          operadorasAtivas: counts.operadorasAtivas,
          usuariosAtivos: counts.usuariosAtivos,
          prestadores: counts.prestadores,
          mesLabel: getHomeKpiReferenciaMes().label,
        }
      : null;

  return { ready, erro, alertas, kpis };
}
