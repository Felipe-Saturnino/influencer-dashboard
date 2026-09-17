import { useEffect, useState } from "react";
import { useApp } from "../../../../context/AppContext";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages, fetchLiveResultadosBatched } from "../../../../lib/supabasePaginate";
import { horasDeResultado, horasPendentesCota } from "../../../../lib/influencerHorasCota";
import { isoDateBrasilFromInstant } from "../../../../lib/dateBrasil";
import { fetchInfluencerAnalyticsPeriodoCached } from "../../../../lib/influencerAnalyticsQuery";
import { fmtBRL, fmtHorasTotal, getPeriodoComparativoMoM } from "../../../../lib/dashboardHelpers";
import { MESES_PT } from "../../../../lib/dashboardConstants";
import { loadFinanceiroMesData } from "../../../aquisicao/Financeiro/financeiroMesData";
import {
  mesCalendarioDeHoje,
  podeVerPagamentosAgenteFinanceiro,
} from "../../../aquisicao/Financeiro/financeiroCiclos";
import type { BlocoFiltros } from "../../../aquisicao/Financeiro/financeiroFiltros";
import { periodoDoMes, rowNoMesSolicitacao } from "../../../aquisicao/BancaJogo/bancaJogoHelpers";
import type { BancaRowDb } from "../../../aquisicao/BancaJogo/bancaJogoTypes";

export type HomeGestorAquisicaoAlertas = {
  horasPendentesSemAgenda: number;
  /** Até 5 nomes artísticos (A–Z) para o alerta de horas sem agenda. */
  horasPendentesSemAgendaNomes: string[];
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

function mesYmAnterior(mesYm: string): string {
  const [y, m] = mesYm.split("-").map(Number);
  const d = new Date(y!, (m ?? 1) - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMesYm(mesYm: string): string {
  const [y, m] = mesYm.split("-").map(Number);
  return `${MESES_PT[(m ?? 1) - 1] ?? mesYm} ${y}`;
}

function filtrosFinanceiroMes(
  mesFiltro: string,
  podeVerInf: (id: string) => boolean,
): BlocoFiltros {
  return {
    podeVerInfluencer: podeVerInf,
    podeVerOperadora: () => true,
    filterInfluencers: [],
    filterOperadora: "todas",
    filtroOp: null,
    operadoraInfMap: {},
    operadorasList: [],
    mesFiltro,
    historico: false,
  };
}

export function useHomeGestorAquisicaoData() {
  const { escoposVisiveis, user } = useApp();
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState(false);
  const [alertas, setAlertas] = useState<HomeGestorAquisicaoAlertas>({
    horasPendentesSemAgenda: 0,
    horasPendentesSemAgendaNomes: [],
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
          .select("id, nome_artistico, horas_acordadas, horas_ciclo_iniciado_em, status")
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

        const mesAtualYm = mesCalendarioDeHoje();
        const mesAntYm = mesYmAnterior(mesAtualYm);
        const [anoAtual, mesAtualNum] = mesAtualYm.split("-").map(Number);
        const periodoStreamers = getPeriodoComparativoMoM(anoAtual!, (mesAtualNum ?? 1) - 1);
        const periodoBanca = periodoDoMes(mesAtualYm);

        const [
          perfisRes,
          livesFuturasRes,
          livesRealizadasRes,
          pagsPendRes,
          pagsAgPendRes,
          finAtual,
          finAnt,
          analytics,
          bancasRows,
        ] = await Promise.all([
          fetchAllPages<{
            id: string;
            nome_artistico: string | null;
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
          // Só os KPIs entram na Home — sem e-mail, não vale carregar a lista de profiles.
          loadFinanceiroMesData({
            filtros: filtrosFinanceiroMes(mesAtualYm, podeVerInf),
            userRole: user?.role,
            podeVerInfluencer: podeVerInf,
            emailMap: {},
          }),
          loadFinanceiroMesData({
            filtros: filtrosFinanceiroMes(mesAntYm, podeVerInf),
            userRole: user?.role,
            podeVerInfluencer: podeVerInf,
            emailMap: {},
          }),
          fetchInfluencerAnalyticsPeriodoCached({
            inicio: periodoStreamers.atual.inicio,
            fim: periodoStreamers.atual.fim,
            influencerIds: veTodos ? null : idsEscopo,
          }),
          fetchAllPages<Pick<BancaRowDb, "id" | "influencer_id" | "solicitado_em" | "status">>(
            async (from, to) => {
              let q = supabase
                .from("banca_jogo_solicitacoes")
                .select("id, influencer_id, solicitado_em, status")
                .eq("status", "solicitado")
                .order("id")
                .range(from, to);
              if (!veTodos) {
                if (idsEscopo.length === 0) {
                  q = q.eq("id", "00000000-0000-0000-0000-000000000000");
                } else {
                  q = q.in("influencer_id", idsEscopo);
                }
              }
              return q;
            },
          ),
        ]);

        if (cancelled) return;

        const comCota = perfisRes.filter(
          (p) => p.horas_acordadas != null && p.horas_acordadas > 0 && !!p.horas_ciclo_iniciado_em,
        );
        const comAgenda = new Set(livesFuturasRes.map((l) => l.influencer_id));
        const candidatos = comCota.filter((p) => !comAgenda.has(p.id));

        let horasPendentesSemAgenda = 0;
        const nomesPendentes: string[] = [];
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
            if (pend != null && pend > 0) {
              horasPendentesSemAgenda += 1;
              const artistico = (p.nome_artistico ?? "").trim();
              if (artistico) nomesPendentes.push(artistico);
            }
          }
        }
        const horasPendentesSemAgendaNomes = [...nomesPendentes]
          .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
          .slice(0, 5);

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

        const pagoMom = pctMoM(finAtual.kpis.totalPago, finAnt.kpis.totalPago);
        const pendMom = pctMoM(finAtual.kpis.pendente, finAnt.kpis.pendente);
        const horasMom = pctMoM(finAtual.kpis.horas, finAnt.kpis.horas);

        const metricasVisiveis = analytics.metricas.filter((m) => podeVerInf(m.influencer_id));
        const livesVisiveis = analytics.lives.filter((l) => podeVerInf(l.influencer_id));
        const ggr = metricasVisiveis.reduce((a, m) => a + (Number(m.ggr) || 0), 0);
        const ftds = metricasVisiveis.reduce((a, m) => a + (Number(m.ftd_count) || 0), 0);
        const lives = livesVisiveis.length;

        const bancasAbertas = bancasRows.filter((r) =>
          rowNoMesSolicitacao(r as BancaRowDb, periodoBanca, false),
        ).length;

        if (cancelled) return;

        setAlertas({
          horasPendentesSemAgenda,
          horasPendentesSemAgendaNomes,
          resultadosPendentes48h,
          pagamentosAguardando7d,
        });
        setKpis({
          mesLabel: labelMesYm(mesAtualYm),
          financeiro: {
            pagoFmt: fmtBRL(finAtual.kpis.totalPago),
            pendenteFmt: fmtBRL(finAtual.kpis.pendente),
            horasFmt: fmtHorasTotal(finAtual.kpis.horas),
          },
          canal: {
            lives,
            ggrFmt: fmtBRL(ggr),
            ftds,
            bancasAbertas,
          },
          mom: {
            pagoAntFmt: fmtBRL(finAnt.kpis.totalPago),
            pagoPct: pagoMom.pctLabel,
            pagoUp: pagoMom.up,
            pendenteAntFmt: fmtBRL(finAnt.kpis.pendente),
            pendentePct: pendMom.pctLabel,
            pendenteUp: pendMom.up,
            horasAntFmt: fmtHorasTotal(finAnt.kpis.horas),
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
