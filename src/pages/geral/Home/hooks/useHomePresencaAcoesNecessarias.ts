import { useEffect, useState } from "react";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { hojeIsoBrasil } from "../../../../lib/dateBrasil";
import { MESES_PT } from "../../../../lib/dashboardConstants";
import { getPeriodoComparativoMesCompleto } from "../../../../lib/dashboardHelpers";
import {
  areaKeyGradeDia,
  obterEntradaSaidaEscaladasPrestadorDia,
  primeiroValorGradeDiaParaPrestador,
  refMesPrimeiroDiaISO,
  situacaoGestaoEscalaParaDia,
  statusPresencaNoDia,
  toIsoLocal,
  type OpTurnosHorarioPick,
  type RpcGradeCalendarioRow,
  type RpcPontoMesRow,
} from "../../../../lib/overviewPrestadorCalendarioHelpers";
import {
  chavePresencaGestao,
  resolverStatusPresencaLinha,
  type PresencaDiaGestao,
} from "../../../../lib/rhCalendarioPresencaGestao";
import { buscarRhFuncionarioAtivoPorEmailLoginCached } from "../../../../lib/rhFuncionarioLoginMatch";
import {
  carregarMapasTurnosHorarioPrestadores,
  resolveTurnosHorarioPrestador,
} from "../../../../lib/turnosDealers";
import {
  fetchOverviewPrestadorGradeMes,
  fetchOverviewPrestadorPontoMes,
  fetchOverviewPrestadorPresencaMes,
} from "../../../dashboards/OverviewPrestador/overviewPrestadorQueries";
import type { RhFuncionario } from "../../../../types/rhFuncionario";

export type HomePresencaAcoesNecessarias = {
  loading: boolean;
  ausenciaCheckInOut: boolean;
  aprovacaoHoras: boolean;
};

function diasDoMesCivil(ano: number, mes0: number): string[] {
  const last = new Date(ano, mes0 + 1, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    out.push(toIsoLocal(new Date(ano, mes0, d)));
  }
  return out;
}

function pontoPorDia(pontoRows: RpcPontoMesRow[]): Map<string, RpcPontoMesRow> {
  const map = new Map<string, RpcPontoMesRow>();
  for (const r of pontoRows) {
    const iso = (r.dia_sp ?? "").slice(0, 10);
    if (iso) map.set(iso, r);
  }
  return map;
}

/**
 * Flags de alerta da Home Estúdio a partir do Controle de Presença (mês civil atual).
 * Ausência = Status Falta ou Pendente · Aprovação = Status Registrado.
 */
export function useHomePresencaAcoesNecessarias(): HomePresencaAcoesNecessarias {
  const { email: emailEfetivo } = useIdentidadeEfetiva();
  const [loading, setLoading] = useState(true);
  const [ausenciaCheckInOut, setAusencia] = useState(false);
  const [aprovacaoHoras, setAprovacao] = useState(false);

  useEffect(() => {
    const email = emailEfetivo?.trim();
    if (!email) {
      setLoading(false);
      setAusencia(false);
      setAprovacao(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const prestador = await buscarRhFuncionarioAtivoPorEmailLoginCached(email);
        if (cancelled) return;
        if (!prestador?.id) {
          setAusencia(false);
          setAprovacao(false);
          return;
        }

        const agora = new Date();
        const ano = agora.getFullYear();
        const mes0 = agora.getMonth();
        const refMes = refMesPrimeiroDiaISO(new Date(ano, mes0, 1));
        const { atual } = getPeriodoComparativoMesCompleto(ano, mes0);
        const hoje = hojeIsoBrasil();

        const [gradeRows, pontoRows, presencaGestao, mapasTurnos] = await Promise.all([
          fetchOverviewPrestadorGradeMes(refMes),
          fetchOverviewPrestadorPontoMes(prestador.id, refMes),
          fetchOverviewPrestadorPresencaMes(prestador.id, refMes),
          carregarMapasTurnosHorarioPrestadores([prestador]),
        ]);
        if (cancelled) return;

        const opTurnos = resolveTurnosHorarioPrestador(
          prestador,
          mapasTurnos.mapPorOperadora,
          mapasTurnos.mapPorEstudio,
        ) as OpTurnosHorarioPick | null;

        const flags = avaliarPresencaAcoesMes({
          funcionarioId: prestador.id,
          prestador,
          gradeRows,
          pontoRows,
          presencaGestao,
          opTurnos,
          periodoInicio: atual.inicio,
          periodoFim: atual.fim > hoje ? hoje : atual.fim,
          ano,
          mes0,
        });

        setAusencia(flags.ausenciaCheckInOut);
        setAprovacao(flags.aprovacaoHoras);
      } catch (e) {
        console.error("[Home] presença ações necessárias:", e);
        if (!cancelled) {
          setAusencia(false);
          setAprovacao(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailEfetivo]);

  return { loading, ausenciaCheckInOut, aprovacaoHoras };
}

export function avaliarPresencaAcoesMes(opts: {
  funcionarioId: string;
  prestador: RhFuncionario;
  gradeRows: RpcGradeCalendarioRow[];
  pontoRows: RpcPontoMesRow[];
  presencaGestao: Map<string, PresencaDiaGestao>;
  opTurnos: OpTurnosHorarioPick | null;
  periodoInicio: string;
  periodoFim: string;
  ano: number;
  mes0: number;
}): { ausenciaCheckInOut: boolean; aprovacaoHoras: boolean } {
  const mapaPonto = pontoPorDia(opts.pontoRows);
  let ausenciaCheckInOut = false;
  let aprovacaoHoras = false;

  for (const iso of diasDoMesCivil(opts.ano, opts.mes0)) {
    if (iso < opts.periodoInicio || iso > opts.periodoFim) continue;

    const valorG = primeiroValorGradeDiaParaPrestador(
      opts.gradeRows,
      opts.funcionarioId,
      iso,
      opts.prestador,
    );
    const situacao = situacaoGestaoEscalaParaDia(valorG);
    const esc = obterEntradaSaidaEscaladasPrestadorDia(
      opts.prestador,
      valorG,
      opts.opTurnos,
      opts.prestador.area_atuacao === "escritorio"
        ? "escritorio"
        : areaKeyGradeDia(opts.gradeRows, opts.funcionarioId, iso),
    );
    const pt = mapaPonto.get(iso);
    const gestao = opts.presencaGestao.get(chavePresencaGestao(opts.funcionarioId, iso));
    const checkInIso = pt?.check_in_at ?? null;
    const checkOutIso = pt?.check_out_at ?? null;
    const entEsc = esc ? esc.entrada : "—";
    const saiEsc = esc ? esc.saida : "—";
    const stBase = statusPresencaNoDia(esc, checkInIso, checkOutIso);
    const status = resolverStatusPresencaLinha({
      situacao,
      diaIso: iso,
      entEsc,
      saiEsc,
      temCheckIn: Boolean(checkInIso),
      temCheckOut: Boolean(checkOutIso),
      statusBase: stBase,
      gestao,
    });

    if (status === "Falta" || status === "Pendente") ausenciaCheckInOut = true;
    if (status === "Registrado") aprovacaoHoras = true;
    if (ausenciaCheckInOut && aprovacaoHoras) break;
  }

  return { ausenciaCheckInOut, aprovacaoHoras };
}

/** Label do mês civil atual para subtítulos de KPI (ex.: «Setembro 2026»). */
export function labelMesCivilAtual(ref: Date = new Date()): string {
  return `${MESES_PT[ref.getMonth()]} ${ref.getFullYear()}`;
}
