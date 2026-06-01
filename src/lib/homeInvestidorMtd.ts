import { MESES_PT } from "./dashboardConstants";
import {
  getOntemIsoLocal,
  getPeriodoComparativoMoM,
  isCarrosselMesCivilAtual,
  type PeriodoDashboardMoM,
} from "./dashboardHelpers";

export type HomeKpiReferenciaMes = {
  ano: number;
  mes: number;
  label: string;
};

/**
 * Mês de referência dos blocos KPI / Aquisição na Home (ETL D-1).
 * No dia 1 do mês civil, o mês corrente ainda não tem dados fechados — usa o mês anterior.
 */
export function getHomeKpiReferenciaMes(ref: Date = new Date()): HomeKpiReferenciaMes {
  const alvo = new Date(ref);
  if (ref.getDate() === 1) {
    alvo.setMonth(alvo.getMonth() - 1);
  }
  const ano = alvo.getFullYear();
  const mes = alvo.getMonth();
  return { ano, mes, label: `${MESES_PT[mes]} ${ano}` };
}

function capPeriodoHomeKpiD1(
  periodo: PeriodoDashboardMoM,
  anoRef: number,
  mesRef: number,
  ref: Date,
): PeriodoDashboardMoM {
  if (!isCarrosselMesCivilAtual(anoRef, mesRef, ref) || ref.getDate() <= 1) {
    return periodo;
  }
  const ontem = getOntemIsoLocal(ref);
  if (ontem < periodo.fim) {
    return { ...periodo, fim: ontem };
  }
  return periodo;
}

/** Período principal de consulta (blocos KPI e Aquisição). */
export function getHomeKpiPeriodo(ref: Date = new Date()): PeriodoDashboardMoM {
  const { ano, mes } = getHomeKpiReferenciaMes(ref);
  const { atual } = getPeriodoComparativoMoM(ano, mes);
  return capPeriodoHomeKpiD1(atual, ano, mes, ref);
}

/** Períodos atual + anterior para comparativo MoM na Home Operador. */
export function getHomeKpiPeriodosComparativoMoM(ref: Date = new Date()): {
  referencia: HomeKpiReferenciaMes;
  atual: PeriodoDashboardMoM;
  anterior: PeriodoDashboardMoM;
} {
  const referencia = getHomeKpiReferenciaMes(ref);
  const { atual, anterior } = getPeriodoComparativoMoM(referencia.ano, referencia.mes);
  return {
    referencia,
    atual: capPeriodoHomeKpiD1(atual, referencia.ano, referencia.mes, ref),
    anterior,
  };
}

/** @deprecated Usar `getHomeKpiPeriodo` — mantido para Spin na Rede (MTD civil corrente). */
export function getHomeInvestidorMtdPeriodo(ref: Date = new Date()): PeriodoDashboardMoM {
  return getPeriodoComparativoMoM(ref.getFullYear(), ref.getMonth()).atual;
}

/** Limites inclusivos para colunas `timestamptz` (published_at) — Spin na Rede MTD civil. */
export function getHomeInvestidorMtdIsoRange(ref: Date = new Date()): { inicioIso: string; fimIso: string } {
  const { inicio, fim } = getHomeInvestidorMtdPeriodo(ref);
  return {
    inicioIso: `${inicio}T00:00:00.000Z`,
    fimIso: `${fim}T23:59:59.999Z`,
  };
}
