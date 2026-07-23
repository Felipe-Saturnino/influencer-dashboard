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

/** Opções do modal Alterar Escala: permite trocar o turno do dia. */
export function opcoesSelectCelulaAlterarEscala(): { value: string; label: string }[] {
  return [
    { value: "", label: "—" },
    { value: "Folga", label: "Folga" },
    { value: "MRN", label: "Escalado — Manhã" },
    { value: "AFT", label: "Escalado — Tarde" },
    { value: "NGT", label: "Escalado — Noite" },
    { value: "Comercial", label: "Escalado — Comercial" },
    { value: "Compra", label: "Compra" },
    { value: "Venda", label: "Venda" },
    { value: "Troca", label: "Troca" },
  ];
}

/** Sanitiza valor do Alterar Escala (aceita qualquer turno operacional). */
export function sanitizarValorCelulaAlterarEscala(valorArmazenado: string): string {
  const v = (valorArmazenado ?? "").trim();
  if (!v) return "";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  if (v === "F" || v.toLowerCase() === "folga") return "Folga";
  if (v === "MRN" || v === "AFT" || v === "NGT" || v === "Comercial") return v;
  if (v === "Manhã" || v.toLowerCase() === "manha") return "MRN";
  if (v === "Tarde") return "AFT";
  if (v === "Noite") return "NGT";
  return "";
}

/** Rótulo de exibição no modal / tooltip com turno explícito. */
export function labelExibicaoCelulaAlterarEscala(valorArmazenado: string | undefined): string {
  const v = sanitizarValorCelulaAlterarEscala(valorArmazenado ?? "");
  if (!v) return "—";
  if (v === "Folga") return "Folga";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  if (v === "MRN") return "Escalado — Manhã";
  if (v === "AFT") return "Escalado — Tarde";
  if (v === "NGT") return "Escalado — Noite";
  if (v === "Comercial") return "Escalado — Comercial";
  return "Escalado";
}
