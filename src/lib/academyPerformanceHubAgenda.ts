import { PERFORMANCE_HUB_MIN_AVALIACOES_MES } from "./academyPerformanceHubConstants";
import type {
  PerformanceHubAgendaItem,
  PerformanceHubAvaliacao,
  PerformanceHubTimeSlug,
} from "./academyPerformanceHubTypes";

export type PerformanceHubStaffAgendaFonte = {
  id: string;
  nome: string;
  turno: string;
  goLive: string;
  goLiveIso: string | null;
  dataInicioIso: string | null;
  time: PerformanceHubTimeSlug;
};

export type PerformanceHubMesRef = {
  ano: number;
  mes: number;
};

function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const [y, m, d] = iso.trim().slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateBr(value: string): Date | null {
  const [dia, mes, ano] = value.split("/");
  const d = Number(dia);
  const m = Number(mes);
  const y = Number(ano);
  if (!d || !m || !y) return null;
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDataBr(iso: string | null | undefined): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "—";
  return parsed.toLocaleDateString("pt-BR");
}

function dataElegibilidadeAvaliacao(staff: PerformanceHubStaffAgendaFonte): Date | null {
  const inicio = parseIsoDate(staff.dataInicioIso);
  const live = parseIsoDate(staff.goLiveIso);
  if (inicio && live) return inicio > live ? inicio : live;
  return inicio ?? live;
}

function staffElegivelNoMes(staff: PerformanceHubStaffAgendaFonte, mes: PerformanceHubMesRef): boolean {
  const elegibilidade = dataElegibilidadeAvaliacao(staff);
  if (!elegibilidade) return true;
  const fimMes = new Date(mes.ano, mes.mes + 1, 0, 23, 59, 59, 999);
  return elegibilidade <= fimMes;
}

function avaliacaoNoMes(row: PerformanceHubAvaliacao, mes: PerformanceHubMesRef): boolean {
  const parsed = parseDateBr(row.data);
  if (!parsed) return false;
  return parsed.getFullYear() === mes.ano && parsed.getMonth() === mes.mes;
}

function contarRealizadasMes(
  avaliacoes: PerformanceHubAvaliacao[],
  staff: PerformanceHubStaffAgendaFonte,
  mes: PerformanceHubMesRef,
): number {
  return avaliacoes.filter(
    (row) =>
      row.time === staff.time &&
      row.status === "aprovado" &&
      (row.avaliadoStaffId === staff.id || row.avaliadoNome === staff.nome) &&
      avaliacaoNoMes(row, mes),
  ).length;
}

export function mapStaffRhParaAgendaFonte(
  row: {
    id: string;
    nome: string;
    turno: string;
    staff_live_no_estudio?: string | null;
    data_inicio?: string | null;
  },
  time: PerformanceHubTimeSlug,
): PerformanceHubStaffAgendaFonte {
  const goLiveIso = row.staff_live_no_estudio?.trim().slice(0, 10) ?? null;
  const dataInicioIso = row.data_inicio?.trim().slice(0, 10) ?? null;
  return {
    id: row.id,
    nome: row.nome,
    turno: row.turno,
    goLive: formatDataBr(goLiveIso ?? dataInicioIso),
    goLiveIso,
    dataInicioIso,
    time,
  };
}

export function buildPerformanceHubAgenda(
  staffPorTime: PerformanceHubStaffAgendaFonte[],
  avaliacoes: PerformanceHubAvaliacao[],
  mes: PerformanceHubMesRef | undefined,
  time: PerformanceHubTimeSlug,
): PerformanceHubAgendaItem[] {
  if (!mes) return [];

  return staffPorTime
    .filter((staff) => staff.time === time && staffElegivelNoMes(staff, mes))
    .map((staff) => {
      const realizadas = contarRealizadasMes(avaliacoes, staff, mes);
      const pendentes = Math.max(0, PERFORMANCE_HUB_MIN_AVALIACOES_MES - realizadas);
      return {
        id: staff.id,
        time: staff.time,
        nome: staff.nome,
        goLive: staff.goLive,
        turno: staff.turno,
        realizadas,
        pendentes,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
