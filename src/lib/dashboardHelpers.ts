/** Helpers compartilhados entre dashboards */
import { BRAND } from "./dashboardConstants";
import type { StatusLabel } from "./dashboardConstants";
import { MESES_PT, MES_INICIO } from "./dashboardConstants";

const pad = (n: number) => String(n).padStart(2, "0");

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Alias para compatibilidade */
export const fmt = fmtDate;

/** Histórico padrão: competência atual + 12 competências anteriores (janela YoY inclusiva). */
export const HISTORICO_COMPETENCIAS_MESES = 13;

export function getPeriodoHistoricoCompetencias(
  ref: Date = new Date(),
): { inicio: string; fim: string } {
  const inicio = new Date(
    ref.getFullYear(),
    ref.getMonth() - (HISTORICO_COMPETENCIAS_MESES - 1),
    1,
  );
  return { inicio: fmtDate(inicio), fim: fmtDate(ref) };
}

export function isDataNoPeriodoHistoricoCompetencias(
  value: string | null | undefined,
  ref: Date = new Date(),
): boolean {
  if (!value) return false;
  const dataIso = value.slice(0, 10);
  const { inicio, fim } = getPeriodoHistoricoCompetencias(ref);
  return dataIso >= inicio && dataIso <= fim;
}

export function fmtBRL(v: number): string {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtHorasTotal(horas: number): string {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function fmtDia(iso: string): string {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export type MesInicioRef = { ano: number; mes: number };

export function getMesesDisponiveis(
  inicio: MesInicioRef = MES_INICIO,
): { ano: number; mes: number; label: string }[] {
  const hoje = new Date();
  const lista: { ano: number; mes: number; label: string }[] = [];
  let { ano, mes } = inicio;
  while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth())) {
    lista.push({ ano, mes, label: `${MESES_PT[mes]} ${ano}` });
    mes++;
    if (mes > 11) {
      mes = 0;
      ano++;
    }
  }
  return lista;
}

export type MesCarrosselRef = { ano: number; mes: number; label?: string };

/**
 * Índice padrão do carrossel de mês nos dashboards (ETL D-1).
 * No dia 1 do mês civil, o mês corrente ainda não tem dados fechados — usa o mês anterior.
 */
export function getIdxMesCarrosselPadrao(meses: MesCarrosselRef[], ref: Date = new Date()): number {
  if (meses.length === 0) return 0;
  const alvo = new Date(ref);
  if (ref.getDate() === 1) {
    alvo.setMonth(alvo.getMonth() - 1);
  }
  const i = meses.findIndex((m) => m.ano === alvo.getFullYear() && m.mes === alvo.getMonth());
  return i >= 0 ? i : meses.length - 1;
}

export function getDatasDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  return {
    inicio: fmtDate(new Date(ano, mes, 1)),
    fim: fmtDate(new Date(ano, mes + 1, 0)),
  };
}

export type PeriodoDashboardMoM = { inicio: string; fim: string };

/** Carrossel no mês civil “em curso” → `getPeriodoComparativoMoM` usa recorte MTD (1..hoje) e o mesmo comprimento no mês anterior. */
export function isCarrosselMesCivilAtual(anoSel: number, mesSel: number, ref: Date = new Date()): boolean {
  return anoSel === ref.getFullYear() && mesSel === ref.getMonth();
}

/** Ontem no fuso local — detalhamento diário (ETL fecha o dia anterior). */
export function getOntemIsoLocal(ref: Date = new Date()): string {
  const ontem = new Date(ref);
  ontem.setHours(0, 0, 0, 0);
  ontem.setDate(ontem.getDate() - 1);
  return fmtDate(ontem);
}

/**
 * Período principal do carrossel e período de comparação (mês civil anterior alinhado).
 * - Mês civil atual: atual = 1..hoje; anterior = 1..mesmo dia no mês anterior (cap no último dia).
 * - Mês fechado: atual = mês inteiro; anterior = mês civil anterior inteiro.
 */
export function getPeriodoComparativoMoM(
  anoSel: number,
  mesSel: number,
): { atual: PeriodoDashboardMoM; anterior: PeriodoDashboardMoM } {
  const hoje = new Date();
  const isMesCivilAtual = isCarrosselMesCivilAtual(anoSel, mesSel, hoje);

  let anoAnt = anoSel;
  let mesAnt = mesSel - 1;
  if (mesAnt < 0) {
    mesAnt = 11;
    anoAnt--;
  }

  if (isMesCivilAtual) {
    const diaHoje = hoje.getDate();
    const ultimoDiaAnt = new Date(anoAnt, mesAnt + 1, 0).getDate();
    const diaFimAnt = Math.min(diaHoje, ultimoDiaAnt);
    return {
      atual: {
        inicio: fmtDate(new Date(anoSel, mesSel, 1)),
        fim: fmtDate(new Date(anoSel, mesSel, diaHoje)),
      },
      anterior: {
        inicio: fmtDate(new Date(anoAnt, mesAnt, 1)),
        fim: fmtDate(new Date(anoAnt, mesAnt, diaFimAnt)),
      },
    };
  }

  return {
    atual: getDatasDoMes(anoSel, mesSel),
    anterior: getDatasDoMes(anoAnt, mesAnt),
  };
}

/**
 * MoM com **mês civil completo** no atual e no anterior — sem recorte MTD.
 * Usar em dashboards de escala/planejamento (ex.: Overview Prestador → Escala),
 * onde a grade do mês já está publicada e o KPI deve refletir o período inteiro.
 */
export function getPeriodoComparativoMesCompleto(
  anoSel: number,
  mesSel: number,
): { atual: PeriodoDashboardMoM; anterior: PeriodoDashboardMoM } {
  let anoAnt = anoSel;
  let mesAnt = mesSel - 1;
  if (mesAnt < 0) {
    mesAnt = 11;
    anoAnt--;
  }
  return {
    atual: getDatasDoMes(anoSel, mesSel),
    anterior: getDatasDoMes(anoAnt, mesAnt),
  };
}

/** Janela do mês anterior alinhada ao MTD/mês completo de `getPeriodoComparativoMoM` (só o objeto `anterior`). */
export function getDatasDoMesMtd(ano: number, mes: number): { inicio: string; fim: string } {
  return getPeriodoComparativoMoM(ano, mes).anterior;
}

export function getStatusROI(
  roi: number | null,
  ggr: number,
  investimento: number
): { label: StatusLabel; cor: string; bg: string; border: string; roiStr: string } {
  if (investimento === 0) {
    if (ggr > 0)
      return {
        label: "Bônus",
        cor: "#a855f7",
        bg: "rgba(168,85,247,0.12)",
        border: "rgba(168,85,247,0.28)",
        roiStr: "—",
      };
    if (ggr < 0)
      return {
        label: "Atenção",
        cor: BRAND.amarelo,
        bg: "rgba(245,158,11,0.12)",
        border: "rgba(245,158,11,0.28)",
        roiStr: "—",
      };
    return {
      label: "Sem dados",
      cor: "#6b7280",
      bg: "rgba(107,114,128,0.10)",
      border: "rgba(107,114,128,0.22)",
      roiStr: "—",
    };
  }
  const r = roi ?? 0;
  const roiStr = `${r >= 0 ? "+" : ""}${r.toFixed(0)}%`;
  if (r >= 0)
    return {
      label: "Rentável",
      cor: BRAND.verde,
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.28)",
      roiStr,
    };
  if (r >= -30)
    return {
      label: "Atenção",
      cor: BRAND.amarelo,
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.28)",
      roiStr,
    };
  return {
    label: "Não Rentável",
    cor: BRAND.vermelho,
    bg: "rgba(232,64,37,0.12)",
    border: "rgba(232,64,37,0.28)",
    roiStr,
  };
}
