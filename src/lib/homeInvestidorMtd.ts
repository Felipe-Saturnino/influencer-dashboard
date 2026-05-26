import { getPeriodoComparativoMoM, type PeriodoDashboardMoM } from "./dashboardHelpers";

/** Recorte MTD do mês civil corrente (mesmo critério Overview Spin / dashboards). */
export function getHomeInvestidorMtdPeriodo(ref: Date = new Date()): PeriodoDashboardMoM {
  return getPeriodoComparativoMoM(ref.getFullYear(), ref.getMonth()).atual;
}

/** Limites inclusivos para colunas `timestamptz` (published_at). */
export function getHomeInvestidorMtdIsoRange(ref: Date = new Date()): { inicioIso: string; fimIso: string } {
  const { inicio, fim } = getHomeInvestidorMtdPeriodo(ref);
  return {
    inicioIso: `${inicio}T00:00:00.000Z`,
    fimIso: `${fim}T23:59:59.999Z`,
  };
}
