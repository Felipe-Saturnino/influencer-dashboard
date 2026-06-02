import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { FONT_TITLE } from "../../../lib/dashboardConstants"
import { fmtBRL, fmtHorasTotal } from "../../../lib/dashboardHelpers"
import { supabase } from "../../../lib/supabase"
import { buscarInvestimentoPago } from "../../../lib/investimentoPago"
import { getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles"
import { periodoDoMes, podeVerPagamentosAgenteFinanceiro } from "./financeiroCiclos"
import { type FinanceiroAgenteDbRow, type FinanceiroPagamentoParcial } from "./financeiroTypes"
import type { BlocoFiltros } from "./financeiroFiltros"

export function BlocoKpis({ filtros }: { filtros: BlocoFiltros }) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const { podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, mesFiltro, historico } = filtros;
  const mes = historico ? "" : mesFiltro;

  const [totalPago, setTotalPago] = useState(0);
  const [pendente, setPendente] = useState(0);
  const [horas, setHoras] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const periodo = periodoDoMes(mes);

    let cicloIds: string[] = [];
    if (periodo) {
      const { data: ciclos } = await supabase
        .from("ciclos_pagamento")
        .select("id")
        .gte("data_fim", periodo.inicio)
        .lte("data_fim", periodo.fim);
      cicloIds = (ciclos ?? []).map((c: { id: string }) => c.id);
      if (cicloIds.length === 0) {
        setTotalPago(0); setPendente(0); setHoras(0);
        setLoading(false); return;
      }
    }

    // Total pago: usa mesma fonte que os Dashboards (RPC ou fallback) — garante alinhamento
    const incluirAgentesKpi = podeVerPagamentosAgenteFinanceiro(user?.role);
    if (periodo) {
      const { total } = await buscarInvestimentoPago(periodo, {
        influencerIds: filterInfluencers.length > 0 ? filterInfluencers : undefined,
        operadora_slug: filtroOp?.length ? filtroOp[0] : (filterOperadora !== "todas" ? filterOperadora : undefined),
        includeAgentes: incluirAgentesKpi,
      });
      setTotalPago(total);
    }

    const pQuery = periodo
      ? supabase.from("pagamentos").select("influencer_id, total, horas_realizadas, status, operadora_slug").in("ciclo_id", cicloIds)
      : supabase.from("pagamentos").select("influencer_id, total, horas_realizadas, status, operadora_slug");

    const aQuery = incluirAgentesKpi
      ? (periodo
          ? supabase.from("pagamentos_agentes").select("total, status, operadora_slug").in("ciclo_id", cicloIds)
          : supabase.from("pagamentos_agentes").select("total, status, operadora_slug"))
      : Promise.resolve({ data: [] as { total: number; status: string; operadora_slug: string }[] });

    const [{ data: pags }, { data: agentes }] = await Promise.all([pQuery, aQuery]);

    let allPags = (pags ?? []).filter((p: FinanceiroPagamentoParcial) => podeVerInfluencer(p.influencer_id));
    if (filterInfluencers.length > 0) allPags = allPags.filter((p) => filterInfluencers.includes(p.influencer_id));
    if (filtroOp?.length) {
      allPags = allPags.filter((p) => p.operadora_slug && filtroOp.includes(p.operadora_slug));
    } else if (filterOperadora && filterOperadora !== "todas") {
      allPags = allPags.filter((p) => p.operadora_slug === filterOperadora);
    }
    let allAgs: FinanceiroAgenteDbRow[] = incluirAgentesKpi ? ((agentes ?? []) as FinanceiroAgenteDbRow[]) : [];
    if (filtroOp?.length) {
      allAgs = allAgs.filter((a) => a.operadora_slug && filtroOp.includes(a.operadora_slug));
    } else if (filterOperadora && filterOperadora !== "todas") {
      allAgs = allAgs.filter((a) => a.operadora_slug === filterOperadora);
    }

    if (!periodo) {
      setTotalPago(
        [...allPags.filter((p) => p.status === "pago"), ...allAgs.filter((a) => a.status === "pago")]
          .reduce((acc: number, x: FinanceiroPagamentoParcial | FinanceiroAgenteDbRow) => acc + x.total, 0)
      );
    }
    setPendente(
      [...allPags.filter((p) => p.status === "em_analise" || p.status === "a_pagar"), ...allAgs.filter((a) => a.status === "em_analise" || a.status === "a_pagar")]
        .reduce((acc: number, x: FinanceiroPagamentoParcial | FinanceiroAgenteDbRow) => acc + x.total, 0)
    );
    setHoras(allPags.reduce((acc: number, p: FinanceiroPagamentoParcial) => acc + p.horas_realizadas, 0));
    setLoading(false);
  }, [mes, podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, user?.role]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const kpiSkeletonStyle: React.CSSProperties = {
    height: 28,
    width: "65%",
    borderRadius: 8,
    background: t.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  };

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  const kpis = [
    {
      label: "R$ PAGO",
      color: "var(--brand-primary, #7c3aed)",
      display: loading ? null : fmtBRL(totalPago),
    },
    {
      label: "R$ PENDENTE",
      color: "#f59e0b",
      display: loading ? null : fmtBRL(pendente),
    },
    {
      label: "HORAS REALIZADAS",
      color: "#22c55e",
      display: loading ? null : fmtHorasTotal(horas),
    },
  ] as const;

  return (
    <div className="app-grid-kpi-3" style={{ ...getPageKpiSectionGapStyle(), width: "100%", gap: 14 }}>
      {kpis.map((k) => (
        <div
          key={k.label}
          aria-label={k.display ? `${k.label}: ${k.display}` : k.label}
          style={{
            borderRadius: 14,
            border: `1px solid ${t.cardBorder}`,
            borderLeft: `3px solid ${k.color}`,
            background: brand.blockBg,
            padding: "16px 18px",
            boxShadow: cardShadow,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: t.textMuted,
              fontFamily: FONT.body,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {k.label}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: k.color,
              fontFamily: FONT_TITLE,
              marginTop: 6,
              minHeight: 32,
              display: "flex",
              alignItems: "center",
            }}
          >
            {loading ? <div style={kpiSkeletonStyle} aria-hidden /> : k.display}
          </div>
        </div>
      ))}
    </div>
  );
}