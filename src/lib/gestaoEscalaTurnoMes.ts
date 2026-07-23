/**
 * Snapshot de turno por mês/área na Gestão de Escala (congelado na aprovação).
 */

export type EscalaTurnoMesSnap = {
  staff_turno: string;
  staff_horario_turno: string | null;
};

export type EscalaTurnoMesMap = Record<string, EscalaTurnoMesSnap>;

export function chaveTurnoMes(areaKey: string, funcionarioId: string): string {
  return `${areaKey}|${funcionarioId}`;
}

/** Aplica snapshot ao nome/sigla de turno da linha quando a grade do mês está aprovada. */
export function aplicarTurnoSnapshotNaLinha<
  T extends { id: string; escalaCadastro: string; siglaTurnoStaff: string; turnoStaffNome: string },
>(
  row: T,
  aprovada: boolean,
  snap: EscalaTurnoMesSnap | undefined,
  helpers: {
    escalaPrestadorTemTurnosOperacionais: (escala: string) => boolean;
    staffTurnoCoerenteComEscala: (escala: string, turno: string | null | undefined) => string;
    turnoRhCoerenteComEscala: (escala: string, turno: string | null | undefined) => string;
    turnoOperacionalParaSiglaGrade: (turno: string) => "MRN" | "AFT" | "NGT" | "";
  },
): T {
  if (!aprovada || !snap?.staff_turno?.trim()) return row;
  const turnoRaw = snap.staff_turno.trim();
  const coOp = helpers.staffTurnoCoerenteComEscala(row.escalaCadastro, turnoRaw);
  const turnoRh = helpers.turnoRhCoerenteComEscala(row.escalaCadastro, turnoRaw);
  const temOp = helpers.escalaPrestadorTemTurnosOperacionais(row.escalaCadastro);
  const turnoStaffNome = temOp ? coOp || turnoRaw : turnoRh || turnoRaw;
  const siglaTurnoStaff = temOp
    ? helpers.turnoOperacionalParaSiglaGrade(coOp || turnoStaffNome)
    : "";
  return { ...row, turnoStaffNome, siglaTurnoStaff };
}

/** Opções do modal Alterar Escala: permite trocar o turno do dia (sem horário Comercial). */
export function opcoesSelectCelulaAlterarEscala(
  modo: "estudio" | "escritorio" = "estudio",
): { value: string; label: string }[] {
  if (modo === "escritorio") {
    return [
      { value: "", label: "—" },
      { value: "Folga", label: "Folga" },
      { value: "Comercial", label: "Comercial" },
      { value: "Compra", label: "Compra" },
      { value: "Venda", label: "Venda" },
      { value: "Troca", label: "Troca" },
    ];
  }
  return [
    { value: "", label: "—" },
    { value: "Folga", label: "Folga" },
    { value: "MRN", label: "Manhã" },
    { value: "AFT", label: "Tarde" },
    { value: "NGT", label: "Noite" },
    { value: "Compra", label: "Compra" },
    { value: "Venda", label: "Venda" },
    { value: "Troca", label: "Troca" },
  ];
}

/** Sanitiza valor do Alterar Escala / grade aprovada (turnos operacionais Manhã/Tarde/Noite). */
export function sanitizarValorCelulaAlterarEscala(
  valorArmazenado: string,
  modo: "estudio" | "escritorio" = "estudio",
): string {
  const v = (valorArmazenado ?? "").trim();
  if (!v) return "";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  if (v === "F" || v.toLowerCase() === "folga") return "Folga";
  if (modo === "escritorio") {
    if (v === "Comercial" || v.toLowerCase() === "comercial") return "Comercial";
    return "";
  }
  if (v === "MRN" || v === "AFT" || v === "NGT") return v;
  if (v === "Manhã" || v.toLowerCase() === "manha") return "MRN";
  if (v === "Tarde") return "AFT";
  if (v === "Noite") return "NGT";
  /** Legado: Comercial não é mais opção de alteração no Estúdio — trata como vazio. */
  if (v === "Comercial") return "";
  return "";
}

/** Rótulo na Escala Diária / modal: Manhã, Tarde ou Noite (não «Escalado — …»). */
export function labelExibicaoCelulaAlterarEscala(
  valorArmazenado: string | undefined,
  modo: "estudio" | "escritorio" = "estudio",
): string {
  const v = sanitizarValorCelulaAlterarEscala(valorArmazenado ?? "", modo);
  if (!v) return "—";
  if (v === "Folga") return "Folga";
  if (v === "Comercial") return "Comercial";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  if (v === "MRN") return "Manhã";
  if (v === "AFT") return "Tarde";
  if (v === "NGT") return "Noite";
  return "—";
}
