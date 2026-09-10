/**
 * Janela de Check-in/Check-out e Justificativa — Game Presenter e Shuffler.
 * ±15 min em torno do turno efetivo (escala ou Hora Adicional do CT).
 */
import { toIsoLocal } from "./overviewPrestadorCalendarioHelpers";
import {
  situacaoPresencaComoEscalado,
  situacaoPresencaComoFolga,
  turnoEscaladoCruzaMeiaNoite,
} from "./rhCalendarioPresencaGestao";
import {
  timeOrganogramaIndicaGamePresenter,
  timeOrganogramaIndicaShuffler,
} from "./rhPrestadorUsuarioSync";
import { situacaoEhCompraMarketplace } from "./overviewPrestadorMovimentacoes";

function minutosRelogioHHmm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((s ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export const CALENDARIO_JANELA_TURNO_MIN = 15;

export const MSG_CHECKIN_FORA_JANELA =
  "O Check-in só é permitido 15min antes do inicio do turno, caso você irá fazer horas adicionais do turno solicite a Liderança o registro";

export const MSG_CHECKOUT_FORA_JANELA =
  "O Check-out só é permitido 15min após o fim do turno, caso você tenha feito horas adicionais no turno solicite a Liderança o registro";

export const COMENTARIO_APROVADO_LIDERANCA = "Aprovado pela Liderança";
export const COMENTARIO_REGISTRADO_LIDERANCA = "Registrado pela Liderança";

/** Time sujeito às regras de janela e fluxo CT (GP / Shuffler). */
export function prestadorTimeAplicaJanelaTurnoCalendario(
  timeNome: string | null | undefined,
  areaKey?: string | null,
): boolean {
  const ak = (areaKey ?? "").trim().toLowerCase();
  if (ak === "game_presenter" || ak === "shuffler") return true;
  return timeOrganogramaIndicaGamePresenter(timeNome) || timeOrganogramaIndicaShuffler(timeNome);
}

/** Dia trabalhado: Escalado, Compra/-Turno ou Troca — não Folga/Venda. */
export function situacaoPermitePontoJanelaTurno(situacao: string): boolean {
  if (situacaoPresencaComoFolga(situacao)) return false;
  if (situacao === "Troca") return true;
  return situacaoPresencaComoEscalado(situacao) || situacaoEhCompraMarketplace(situacao);
}

export type TurnoEfetivoHhmm = {
  entrada: string;
  saida: string;
  /** Origem: escala do dia ou Hora Adicional do CT. */
  origem: "escala" | "hora_adicional";
};

/**
 * Turno efetivo para janela ±15: preferir Hora Adicional do CT quando ambos HH:MM
 * são válidos; senão horários da escala; senão null.
 */
export function resolverTurnoEfetivoHhmm(
  escalaEntrada: string,
  escalaSaida: string,
  ha?: { entrada: string; saida: string } | null,
): TurnoEfetivoHhmm | null {
  if (ha) {
    const eHa = (ha.entrada ?? "").trim().slice(0, 5);
    const sHa = (ha.saida ?? "").trim().slice(0, 5);
    if (minutosRelogioHHmm(eHa) != null && minutosRelogioHHmm(sHa) != null) {
      return { entrada: eHa, saida: sHa, origem: "hora_adicional" };
    }
  }
  const ent = (escalaEntrada ?? "").trim().slice(0, 5);
  const sai = (escalaSaida ?? "").trim().slice(0, 5);
  if (!ent || !sai || ent === "—" || sai === "—") return null;
  if (minutosRelogioHHmm(ent) == null || minutosRelogioHHmm(sai) == null) return null;
  return { entrada: ent, saida: sai, origem: "escala" };
}

/**
 * Instantes de início/fim do turno em Date local (SP civil via componentes do diaIso).
 * Turno noturno: fim no dia civil seguinte.
 */
export function instantesTurnoEfetivo(
  diaIso: string,
  entradaHhmm: string,
  saidaHhmm: string,
): { inicio: Date; fim: Date } | null {
  const minEnt = minutosRelogioHHmm(entradaHhmm);
  const minSai = minutosRelogioHHmm(saidaHhmm);
  if (minEnt == null || minSai == null) return null;
  const [y, mo, d] = diaIso.split("-").map((x) => Number(x));
  if (!y || !mo || !d) return null;
  const inicio = new Date(y, mo - 1, d, 0, 0, 0, 0);
  inicio.setMinutes(minEnt);
  const fim = new Date(y, mo - 1, d, 0, 0, 0, 0);
  if (turnoEscaladoCruzaMeiaNoite(entradaHhmm, saidaHhmm)) {
    fim.setDate(fim.getDate() + 1);
  }
  fim.setMinutes(minSai);
  return { inicio, fim };
}

export type JanelaCheckInResult =
  | { ok: true }
  | { ok: false; motivo: "fora_janela" | "sem_turno" | "situacao"; mensagem: string };

/** Check-in: [início − 15min, fim do turno]. */
export function checkInDentroJanelaTurno(
  agora: Date,
  diaIso: string,
  entradaHhmm: string,
  saidaHhmm: string,
): JanelaCheckInResult {
  const inst = instantesTurnoEfetivo(diaIso, entradaHhmm, saidaHhmm);
  if (!inst) return { ok: false, motivo: "sem_turno", mensagem: MSG_CHECKIN_FORA_JANELA };
  const abre = new Date(inst.inicio.getTime() - CALENDARIO_JANELA_TURNO_MIN * 60_000);
  if (agora.getTime() < abre.getTime() || agora.getTime() > inst.fim.getTime()) {
    return { ok: false, motivo: "fora_janela", mensagem: MSG_CHECKIN_FORA_JANELA };
  }
  return { ok: true };
}

/** Check-out: após check-in e até fim + 15min. */
export function checkOutDentroJanelaTurno(
  agora: Date,
  diaIso: string,
  entradaHhmm: string,
  saidaHhmm: string,
  checkInAt: Date | string | null,
): JanelaCheckInResult {
  const inst = instantesTurnoEfetivo(diaIso, entradaHhmm, saidaHhmm);
  if (!inst) return { ok: false, motivo: "sem_turno", mensagem: MSG_CHECKOUT_FORA_JANELA };
  if (!checkInAt) {
    return { ok: false, motivo: "fora_janela", mensagem: MSG_CHECKOUT_FORA_JANELA };
  }
  const ci = typeof checkInAt === "string" ? new Date(checkInAt) : checkInAt;
  if (Number.isNaN(ci.getTime()) || agora.getTime() < ci.getTime()) {
    return { ok: false, motivo: "fora_janela", mensagem: MSG_CHECKOUT_FORA_JANELA };
  }
  const fecha = new Date(inst.fim.getTime() + CALENDARIO_JANELA_TURNO_MIN * 60_000);
  if (agora.getTime() > fecha.getTime()) {
    return { ok: false, motivo: "fora_janela", mensagem: MSG_CHECKOUT_FORA_JANELA };
  }
  return { ok: true };
}

/** HH:MM informado na justificativa deve cair na mesma janela do Check-in (entrada) ou Check-out (saída). */
export function horarioJustificativaDentroJanela(
  tipo: "entrada" | "saida",
  hhmm: string,
  diaIso: string,
  entradaTurno: string,
  saidaTurno: string,
): boolean {
  const min = minutosRelogioHHmm(hhmm);
  if (min == null) return false;
  const inst = instantesTurnoEfetivo(diaIso, entradaTurno, saidaTurno);
  if (!inst) return false;
  const [y, mo, d] = diaIso.split("-").map((x) => Number(x));
  const candidato = new Date(y, mo - 1, d, 0, 0, 0, 0);
  candidato.setMinutes(min);
  // Saída após meia-noite: se HH:MM < entrada do turno, assume dia seguinte.
  if (tipo === "saida" && turnoEscaladoCruzaMeiaNoite(entradaTurno, saidaTurno)) {
    const minEnt = minutosRelogioHHmm(entradaTurno) ?? 0;
    if (min < minEnt) candidato.setDate(candidato.getDate() + 1);
  }
  if (tipo === "entrada") {
    return checkInDentroJanelaTurno(candidato, diaIso, entradaTurno, saidaTurno).ok;
  }
  // Para saída, exige "após check-in" usando o início da janela de entrada como proxy mínimo.
  const proxyCheckIn = new Date(inst.inicio.getTime() - CALENDARIO_JANELA_TURNO_MIN * 60_000);
  return checkOutDentroJanelaTurno(candidato, diaIso, entradaTurno, saidaTurno, proxyCheckIn).ok;
}

export function comentarioOverlayLiderancaCt(
  entradaCt: string,
  saidaCt: string,
  entradaPrestador: string,
  saidaPrestador: string,
): string {
  const norm = (s: string) => (s ?? "").trim().slice(0, 5);
  const igual =
    norm(entradaCt) === norm(entradaPrestador) && norm(saidaCt) === norm(saidaPrestador);
  return igual ? COMENTARIO_APROVADO_LIDERANCA : COMENTARIO_REGISTRADO_LIDERANCA;
}

/** Relatório de Justificativas — quem vê a aba (não Meu Calendário). */
export function podeVerAbaRelatorioJustificativas(params: {
  isAdmin: boolean;
  canView: string | null | undefined;
  canEditar: string | null | undefined;
  canCriar: string | null | undefined;
  meuModoAtivo: boolean;
}): boolean {
  if (params.meuModoAtivo) return false;
  if (params.isAdmin) return true;
  if (params.canCriar === "sim") return true;
  if (params.canView === "sim" && params.canEditar === "sim") return true;
  return false;
}

export function hojeIsoLocalCalendario(agora = new Date()): string {
  return toIsoLocal(agora);
}
