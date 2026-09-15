import { useEffect, useState } from "react";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { hojeIsoBrasil } from "../../../../lib/dateBrasil";
import { getPeriodoComparativoMesCompleto, fmtHorasTotal } from "../../../../lib/dashboardHelpers";
import {
  horasLabelFromMinutos,
  refMesPrimeiroDiaISO,
  type OpTurnosHorarioPick,
} from "../../../../lib/overviewPrestadorCalendarioHelpers";
import {
  calcularMetricasPrestadorPeriodo,
} from "../../../../lib/overviewPrestadorMetrics";
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
import { labelMesCivilAtual } from "./useHomePresencaAcoesNecessarias";

export type HomeEstudioTurnosHorasKpis = {
  mesLabel: string;
  turnosEscalados: number;
  turnosRealizados: number;
  horasEscaladasLabel: string;
  horasRealizadasLabel: string;
};

export function useHomeEstudioTurnosHorasKpis(): {
  loading: boolean;
  erro: boolean;
  kpis: HomeEstudioTurnosHorasKpis | null;
} {
  const { email: emailEfetivo } = useIdentidadeEfetiva();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [kpis, setKpis] = useState<HomeEstudioTurnosHorasKpis | null>(null);

  useEffect(() => {
    const email = emailEfetivo?.trim();
    if (!email) {
      setLoading(false);
      setKpis(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const prestador = await buscarRhFuncionarioAtivoPorEmailLoginCached(email);
        if (cancelled) return;
        if (!prestador?.id) {
          setKpis({
            mesLabel: labelMesCivilAtual(),
            turnosEscalados: 0,
            turnosRealizados: 0,
            horasEscaladasLabel: "0:00",
            horasRealizadasLabel: "0:00",
          });
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

        const metricas = calcularMetricasPrestadorPeriodo({
          funcionarioId: prestador.id,
          prestador,
          opTurnos,
          gradeRows,
          pontoRows,
          presencaGestao,
          periodoInicio: atual.inicio,
          periodoFim: atual.fim,
          periodoFimAderencia: atual.fim > hoje ? hoje : atual.fim,
          mesesRef: [{ ano, mes: mes0 }],
        });

        setKpis({
          mesLabel: labelMesCivilAtual(agora),
          turnosEscalados: metricas.diasEscalado,
          turnosRealizados: metricas.diasRealizado,
          horasEscaladasLabel: horasLabelFromMinutos(metricas.horasEscaladasMin),
          horasRealizadasLabel: horasLabelFromMinutos(metricas.horasRealizadasMin),
        });
      } catch (e) {
        console.error("[Home] turnos/horas KPIs:", e);
        if (!cancelled) {
          setErro(true);
          setKpis({
            mesLabel: labelMesCivilAtual(),
            turnosEscalados: 0,
            turnosRealizados: 0,
            horasEscaladasLabel: fmtHorasTotal(0),
            horasRealizadasLabel: fmtHorasTotal(0),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailEfetivo]);

  return { loading, erro, kpis };
}
