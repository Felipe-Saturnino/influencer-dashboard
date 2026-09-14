import { useEffect, useState } from "react";
import { useApp } from "../../../../context/AppContext";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages, fetchLiveResultadosBatched } from "../../../../lib/supabasePaginate";
import { horasDeResultado, horasPendentesCota } from "../../../../lib/influencerHorasCota";
import { isoDateBrasilFromInstant } from "../../../../lib/dateBrasil";
import { getHomeKpiPeriodosComparativoMoM } from "../../../../lib/homeInvestidorMtd";
import { fetchInfluencerAnalyticsPeriodoCached } from "../../../../lib/influencerAnalyticsQuery";
import { fmtBRL } from "../../../../lib/dashboardHelpers";
import { podeVerPagamentosAgenteFinanceiro } from "../../../aquisicao/Financeiro/financeiroCiclos";

export type HomeGestorAquisicaoAlertas = {
  horasPendentesSemAgenda: number;
  resultadosPendentes48h: number;
  pagamentosAguardando7d: number;
};

export type HomeGestorAquisicaoKpis = {
  mesLabel: string;
  financeiro: { pagoFmt: string; pendenteFmt: string; horasFmt: string };
  canal: { lives: number; ggrFmt: string; ftds: number; bancasAbertas: number };
  mom: {
    pagoAntFmt: string;
    pagoPct: string;
    pagoUp: boolean;
    pendenteAntFmt: string;
    pendentePct: string;
    pendenteUp: boolean;
    horasAntFmt: string;
    horasPct: string;
    horasUp: boolean;
  } | null;
};

type PagRow = {
  total: number;
  status: string;
  horas_realizadas?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
  influencer_id?: string;
};

function pctMoM(atual: number, anterior: number): { pctLabel: string; up: boolean } {
  if (anterior === 0) {
    if (atual === 0) return { pctLabel: "0%", up: true };
    return { pctLabel: "—", up: atual >= 0 };
  }
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100;
  return { pctLabel: `${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 };
}

function fmtHoras(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

function kpisDePagamentos(pags: PagRow[], agentes: PagRow[]): {
  totalPago: number;
  pendente: number;
  horas: number;
} {
  const pagos = [...pags, ...agentes].filter((p) => p.status === "pago");
  const pend = [...pags, ...agentes].filter((p) => p.status === "em_analise" || p.status === "a_pagar");
  return {
    totalPago: pagos.reduce((a, p) => a + (Number(p.total) || 0), 0),
    pendente: pend.reduce((a, p) => a + (Number(p.total) || 0), 0),
    horas: pags.reduce((a, p) => a + (Number(p.horas_realizadas) || 0), 0),
  };
}

async function carregarPagamentosPeriodo(
  inicio: string,
  fim: string,
  incluirAgentes: boolean,
  podeVerInf: (id: string) => boolean,
): Promise<{ pags: PagRow[]; agentes: PagRow[] }> {
  const { data: ciclos } = await supabase
    .from("ciclos_pagamento")
    .select("id")
    .gte("data_fim", inicio)
    .lte("data_fim", fim);
  const cicloIds = (ciclos ?? []).map((c: { id: string }) => c.id);
  if (cicloIds.length === 0) return { pags: [], agentes: [] };

  const [pagsRes, agRes] = await Promise.all([
    supabase
      .from("pagamentos")
      .select("total, status, horas_realizadas, influencer_id, updated_at, created_at")
      .in("ciclo_id", cicloIds),
    incluirAgentes
      ? supabase
          .from("pagamentos_agentes")
          .select("total, status, updated_at, created_at")
          .in("ciclo_id", cicloIds)
      : Promise.resolve({ data: [] as PagRow[], error: null }),
  ]);

  const pags = ((pagsRes.data ?? []) as PagRow[]).filter(
    (p) => !p.influencer_id || podeVerInf(p.influencer_id),
  );
  const agentes = agRes.error ? [] : ((agRes.data ?? []) as PagRow[]);
  return { pags, agentes };
}

export function useHomeGestorAquisicaoData() {
  const { escoposVisiveis, user } = useApp();
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState(false);
  const [alertas, setAlertas] = useState<HomeGestorAquisicaoAlertas>({
    horasPendentesSemAgenda: 0,
    resultadosPendentes48h: 0,
    pagamentosAguardando7d: 0,
  });
  const [kpis, setKpis] = useState<HomeGestorAquisicaoKpis | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setReady(false);
      setErro(false);
      try {
        const veTodos =
          escoposVisiveis.semRestricaoEscopo === true || escoposVisiveis.vêTodosInfluencers === true;
        const idsEscopo = escoposVisiveis.influencersVisiveis ?? [];
        const podeVerInf = (id: string) => veTodos || idsEscopo.includes(id);

        let perfisQuery = supabase
          .from("influencer_perfil")
          .select("id, horas_acordadas, horas_ciclo_iniciado_em, status")
          .eq("status", "ativo");
        if (!veTodos) {
          if (idsEscopo.length === 0) {
            perfisQuery = perfisQuery.eq("id", "00000000-0000-0000-0000-000000000000");
          } else {
            perfisQuery = perfisQuery.in("id", idsEscopo);
          }
        }

        const hojeIso = new Date().toISOString().slice(0, 10);
        const limiar7Ms = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const limiar48Ms = Date.now() - 48 * 60 * 60 * 1000;
        const incluirAgentes = podeVerPagamentosAgenteFinanceiro(user?.role);

        const [
          perfisRes,
          livesFuturasRes,
          livesRealizadasRes,
          pagsPendRes,
          pagsAgPendRes,
          bancasRes,
        ] = await Promise.all([
          fetchAllPages<{
            id: string;
            horas_acordadas: number | null;
            horas_ciclo_iniciado_em: string | null;
            status: string;
          }>(async (from, to) => perfisQuery.order("id").range(from, to)),
          fetchAllPages<{ influencer_id: string }>(async (from, to) => {
            let q = supabase
              .from("lives")
              .select("influencer_id")
              .eq("status", "agendada")
              .gte("data", hojeIso)
              .order("id")
              .range(from, to);
            if (!veTodos && idsEscopo.length > 0) q = q.in("influencer_id", idsEscopo);
            return q;
          }),
          fetchAllPages<{ id: string; data: string; horario: string | null }>(async (from, to) => {
            let q = supabase
              .from("lives")
              .select("id, data, horario")
              .eq("status", "realizada")
              .lte("data", hojeIso)
              .order("id")
              .range(from, to);
            if (!veTodos && idsEscopo.length > 0) q = q.in("influencer_id", idsEscopo);
            return q;
          }),
          supabase
            .from("pagamentos")
            .select("id, status, updated_at, created_at, influencer_id")
            .in("status", ["em_analise", "a_pagar"]),
          incluirAgentes
            ? supabase
                .from("pagamentos_agentes")
                .select("id, status, updated_at, created_at")
                .in("status", ["em_analise", "a_pagar"])
            : Promise.resolve({ data: [] as PagRow[], error: null }),
          supabase
            .from("banca_jogo_solicitacoes")
            .select("id", { count: "exact", head: true })
            .in("status", ["solicitado", "aprovado"]),
        ]);

        if (cancelled) return;

        const comCota = perfisRes.filter(
          (p) => p.horas_acordadas != null && p.horas_acordadas > 0 && !!p.horas_ciclo_iniciado_em,
        );
        const comAgenda = new Set(livesFuturasRes.map((l) => l.influencer_id));
        const candidatos = comCota.filter((p) => !comAgenda.has(p.id));

        let horasPendentesSemAgenda = 0;
        if (candidatos.length > 0) {
          const cicloMaisAntigo = candidatos
            .map((p) => isoDateBrasilFromInstant(p.horas_ciclo_iniciado_em) ?? "9999-99-99")
            .sort()[0];
          const livesCiclo = await fetchAllPages<{
            id: string;
            influencer_id: string;
            data: string;
          }>(async (from, to) =>
            supabase
              .from("lives")
              .select("id, influencer_id, data")
              .eq("status", "realizada")
              .in(
                "influencer_id",
                candidatos.map((c) => c.id),
              )
              .gte("data", cicloMaisAntigo)
              .order("id")
              .range(from, to),
          );
          const resultados = await fetchLiveResultadosBatched<{
            live_id: string;
            duracao_horas: number | null;
            duracao_min: number | null;
          }>(livesCiclo.map((l) => l.id), async (ids) =>
            supabase
              .from("live_resultados")
              .select("live_id, duracao_horas, duracao_min")
              .in("live_id", ids),
          );
          const horasPorLive = new Map(
            resultados.map((r) => [r.live_id, horasDeResultado(r.duracao_horas, r.duracao_min)]),
          );
          for (const p of candidatos) {
            const cicloData = isoDateBrasilFromInstant(p.horas_ciclo_iniciado_em);
            if (!cicloData) continue;
            const realizadas = livesCiclo
              .filter((l) => l.influencer_id === p.id && l.data >= cicloData)
              .reduce((acc, l) => acc + (horasPorLive.get(l.id) ?? 0), 0);
            const pend = horasPendentesCota(p.horas_acordadas, realizadas);
            if (pend != null && pend > 0) horasPendentesSemAgenda += 1;
          }
        }

        const liveIdsRealizadas = livesRealizadasRes.map((l) => l.id);
        const resultadosExistentes =
          liveIdsRealizadas.length === 0
            ? []
            : await fetchLiveResultadosBatched<{ live_id: string }>(liveIdsRealizadas, async (ids) =>
                supabase.from("live_resultados").select("live_id").in("live_id", ids),
              );
        const comResultado = new Set(resultadosExistentes.map((r) => r.live_id));
        let resultadosPendentes48h = 0;
        for (const live of livesRealizadasRes) {
          if (comResultado.has(live.id)) continue;
          const hhmm = (live.horario ?? "00:00").slice(0, 5);
          const ts = new Date(`${live.data}T${hhmm}:00`).getTime();
          if (Number.isFinite(ts) && ts < limiar48Ms) resultadosPendentes48h += 1;
        }

        const countPagAntigos = (rows: PagRow[] | null) =>
          (rows ?? []).filter((r) => {
            if (r.influencer_id && !podeVerInf(r.influencer_id)) return false;
            const ref = r.updated_at || r.created_at;
            if (!ref) return false;
            return new Date(ref).getTime() < limiar7Ms;
          }).length;

        const pagamentosAguardando7d =
          countPagAntigos(pagsPendRes.data as PagRow[] | null) +
          (pagsAgPendRes.error ? 0 : countPagAntigos(pagsAgPendRes.data as PagRow[] | null));

        const { referencia, atual, anterior } = getHomeKpiPeriodosComparativoMoM();
        const mesKey = `${referencia.ano}-${String(referencia.mes + 1).padStart(2, "0")}`;
        const mesAntKey = anterior.inicio.slice(0, 7);

        const [finAtualRaw, finAntRaw, analytics] = await Promise.all([
          carregarPagamentosPeriodo(atual.inicio, atual.fim, incluirAgentes, podeVerInf),
          carregarPagamentosPeriodo(anterior.inicio, anterior.fim, incluirAgentes, podeVerInf),
          fetchInfluencerAnalyticsPeriodoCached({
            inicio: atual.inicio,
            fim: atual.fim,
            influencerIds: veTodos ? null : idsEscopo,
          }),
        ]);

        if (cancelled) return;

        const finAtual = kpisDePagamentos(finAtualRaw.pags, finAtualRaw.agentes);
        const finAnt = kpisDePagamentos(finAntRaw.pags, finAntRaw.agentes);
        const pagoMom = pctMoM(finAtual.totalPago, finAnt.totalPago);
        const pendMom = pctMoM(finAtual.pendente, finAnt.pendente);
        const horasMom = pctMoM(finAtual.horas, finAnt.horas);

        const ggr = analytics.metricas.reduce((a, m) => a + (Number(m.ggr) || 0), 0);
        const ftds = analytics.metricas.reduce((a, m) => a + (Number(m.ftd_count) || 0), 0);
        const lives = analytics.lives.filter((l) => l.status === "realizada").length;

        void mesKey;
        void mesAntKey;

        setAlertas({
          horasPendentesSemAgenda,
          resultadosPendentes48h,
          pagamentosAguardando7d,
        });
        setKpis({
          mesLabel: referencia.label,
          financeiro: {
            pagoFmt: fmtBRL(finAtual.totalPago),
            pendenteFmt: fmtBRL(finAtual.pendente),
            horasFmt: fmtHoras(finAtual.horas),
          },
          canal: {
            lives,
            ggrFmt: fmtBRL(ggr),
            ftds,
            bancasAbertas: bancasRes.count ?? 0,
          },
          mom: {
            pagoAntFmt: fmtBRL(finAnt.totalPago),
            pagoPct: pagoMom.pctLabel,
            pagoUp: pagoMom.up,
            pendenteAntFmt: fmtBRL(finAnt.pendente),
            pendentePct: pendMom.pctLabel,
            pendenteUp: pendMom.up,
            horasAntFmt: fmtHoras(finAnt.horas),
            horasPct: horasMom.pctLabel,
            horasUp: horasMom.up,
          },
        });
      } catch (e) {
        console.error("[HomeGestorAquisicao] carga:", e);
        if (!cancelled) setErro(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    escoposVisiveis.semRestricaoEscopo,
    escoposVisiveis.vêTodosInfluencers,
    escoposVisiveis.influencersVisiveis,
    user?.role,
  ]);

  return { ready, erro, alertas, kpis };
}
