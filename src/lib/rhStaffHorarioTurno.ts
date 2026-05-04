/**
 * Regras de «Horário do Turno» na Gestão de Staff (3x3 / 5x2 editável; 4x2 / 5x1 só leitura via operadora).
 */
import type { Operadora } from "../types";
import { normalizarEscalaCadastro, turnoStaffEhComercial5x2 } from "./rhEscalaTurnos";

export type OpcaoHorarioTurnoStaff = { value: string; label: string };

const OPT_3X3_MANHA: OpcaoHorarioTurnoStaff[] = [
  { value: "07-15", label: "07h às 15h" },
  { value: "08-20", label: "08h às 20h" },
];

const OPT_3X3_NOITE: OpcaoHorarioTurnoStaff[] = [
  { value: "23-07", label: "23h às 07h" },
  { value: "20-08", label: "20h às 08h" },
  { value: "18-06", label: "18h às 06h" },
];

const OPT_5X2_COMERCIAL: OpcaoHorarioTurnoStaff[] = [
  { value: "09-17", label: "09h às 17h" },
  { value: "19-03", label: "19h às 03h" },
];

const TODAS_OPCOES_EDITAVEIS: OpcaoHorarioTurnoStaff[] = [...OPT_3X3_MANHA, ...OPT_3X3_NOITE, ...OPT_5X2_COMERCIAL];

/** Escala com horário editável na Gestão de Staff (fora do vínculo operadora). */
export function escalaComHorarioTurnoEditavelNaStaff(escalaRaw: string | null | undefined): boolean {
  const k = normalizarEscalaCadastro(escalaRaw ?? "");
  return k === "3x3" || k === "5x2";
}

/** Escala em que o horário vem só da Gestão de Operadoras (somente leitura). */
export function escalaComHorarioTurnoSomenteOperadora(escalaRaw: string | null | undefined): boolean {
  const k = normalizarEscalaCadastro(escalaRaw ?? "");
  return k === "4x2" || k === "5x1";
}

export function opcoesHorarioTurnoStaff(
  escalaRaw: string | null | undefined,
  turnoStaffNome: string | null | undefined,
): OpcaoHorarioTurnoStaff[] {
  const k = normalizarEscalaCadastro(escalaRaw ?? "");
  const t = (turnoStaffNome ?? "").trim();
  if (k === "3x3") {
    if (t === "Manhã") return [...OPT_3X3_MANHA];
    if (t === "Noite") return [...OPT_3X3_NOITE];
    return [];
  }
  if (k === "5x2" && turnoStaffEhComercial5x2(turnoStaffNome)) {
    return [...OPT_5X2_COMERCIAL];
  }
  return [];
}

export function escalaUsaHorarioTurnoEditavel(
  escalaRaw: string | null | undefined,
  turnoStaffNome: string | null | undefined,
): boolean {
  return opcoesHorarioTurnoStaff(escalaRaw, turnoStaffNome).length > 0;
}

export function labelHorarioTurnoStaffPorValor(valor: string | null | undefined): string {
  const v = (valor ?? "").trim();
  if (!v) return "—";
  const hit = TODAS_OPCOES_EDITAVEIS.find((o) => o.value === v);
  return hit?.label ?? v;
}

/** HH:mm ou HH:mm:ss → HH:mm para exibição. */
export function formatarHoraInicioOperadora(s: string | null | undefined): string {
  const raw = (s ?? "").trim();
  if (!raw) return "—";
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(raw);
  if (!m) return raw;
  const hh = m[1]!.padStart(2, "0");
  const mm = m[2]!;
  return `${hh}:${mm}`;
}

/** Soma `minutos` a um horário HH:mm (ou prefixo HH:mm:ss). Resultado normalizado no intervalo de 24 h. */
export function adicionarMinutosAoRelogioHHMM(horaHHMM: string, minutos: number): string {
  const raw = (horaHHMM ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!m) return "—";
  const hh = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  let total = hh * 60 + mm + minutos;
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h2 = Math.floor(total / 60);
  const m2 = total % 60;
  return `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}`;
}

/** Formato compacto alinhado às opções 3x3/5x2 (ex.: `07h às 15h`, `08h30 às 17h`). */
function formatarHoraCurtaParaIntervalo(hhmm: string): string {
  const raw = (hhmm ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!m) return raw;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  const hs = String(h).padStart(2, "0");
  if (min === 0) return `${hs}h`;
  return `${hs}h${String(min).padStart(2, "0")}`;
}

/**
 * Texto de leitura para 4x2 / 5x1: intervalo «XXh às XXh» (início na operadora + jornada 8h ou 6h30).
 */
export function textoHorarioTurnoSomenteOperadora(
  escalaRaw: string | null | undefined,
  turnoStaffNome: string | null | undefined,
  op: Pick<Operadora, "turno_manha_inicio" | "turno_tarde_inicio" | "turno_noite_inicio"> | null,
): string {
  if (!escalaComHorarioTurnoSomenteOperadora(escalaRaw)) return "";
  const t = (turnoStaffNome ?? "").trim();
  if (!t) return "Selecione o turno para ver o horário.";
  if (!op) return "Associe uma operadora para ver o horário.";

  const duracaoMin = normalizarEscalaCadastro(escalaRaw ?? "") === "4x2" ? 8 * 60 : 6 * 60 + 30;

  let inicio: string | null = null;
  if (t === "Manhã") {
    inicio = op.turno_manha_inicio ?? null;
  } else if (t === "Tarde") {
    inicio = op.turno_tarde_inicio ?? null;
  } else if (t === "Noite") {
    inicio = op.turno_noite_inicio ?? null;
  } else {
    return "—";
  }

  const hi = formatarHoraInicioOperadora(inicio);
  if (hi === "—") return "—";

  const fim = adicionarMinutosAoRelogioHHMM(hi, duracaoMin);
  if (fim === "—") return "—";

  return `${formatarHoraCurtaParaIntervalo(hi)} até as ${formatarHoraCurtaParaIntervalo(fim)}`;
}

export function horarioTurnoStaffValorPermitido(
  escalaRaw: string | null | undefined,
  turnoStaffNome: string | null | undefined,
  valor: string | null | undefined,
): boolean {
  const v = (valor ?? "").trim();
  if (!v) return true;
  const opts = opcoesHorarioTurnoStaff(escalaRaw, turnoStaffNome);
  return opts.some((o) => o.value === v);
}
