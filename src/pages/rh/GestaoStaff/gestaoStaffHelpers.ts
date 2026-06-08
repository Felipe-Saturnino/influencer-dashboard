import {
  isGamePresenterTimeNome,
  readStaffDealerBioForUi,
  readStaffDealerFotosForUi,
} from "../../../lib/rhGamePresenterDealerSync";
import { turnoRhCoerenteComEscala, turnoStaffEhComercial5x2 } from "../../../lib/rhEscalaTurnos";
import type { RhFuncionario } from "../../../types/rhFuncionario";

type StaffSkillKey = "baccarat" | "blackjack" | "vip" | "roleta" | "futebol_brasileiro";
type StaffSkillStatus = "ativo" | "treinamento" | "inativo";

const STAFF_SKILL_KEYS: StaffSkillKey[] = ["baccarat", "blackjack", "vip", "roleta", "futebol_brasileiro"];

function normStaffNomeTimeUi(nome: string | null | undefined): string {
  return (nome ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function staffUiTimeSemOperadoraHorarioModaisRestritos(nomeTime: string): boolean {
  const n = normStaffNomeTimeUi(nomeTime);
  return (
    n === "service manager" ||
    n === "customer service" ||
    n === "shift leader" ||
    n === "performance coach"
  );
}

export function staffUiTimeShufflerOcultarBioFotosVer(nomeTime: string): boolean {
  return normStaffNomeTimeUi(nomeTime) === "shuffler";
}

function staffCadastraisBioFotosAplicaveis(nomeTime: string): { bio: boolean; fotos: boolean } {
  if (staffUiTimeShufflerOcultarBioFotosVer(nomeTime)) return { bio: false, fotos: false };
  if (staffUiTimeSemOperadoraHorarioModaisRestritos(nomeTime)) return { bio: false, fotos: false };
  return { bio: true, fotos: true };
}

function normalizarSkills(raw: Record<string, unknown> | null | undefined): Record<StaffSkillKey, StaffSkillStatus> {
  const legacy = raw ?? {};
  const merged: Record<string, unknown> = { ...legacy };
  if (merged.futebol_brasileiro == null && legacy.futebol_studio != null) {
    merged.futebol_brasileiro = legacy.futebol_studio;
  }
  const out: Record<string, StaffSkillStatus> = {};
  for (const key of STAFF_SKILL_KEYS) {
    const v = String(merged[key] ?? "inativo").toLowerCase();
    out[key] =
      v === "ativo" || v === "treinamento" || v === "inativo" ? (v as StaffSkillStatus) : "inativo";
  }
  return out as Record<StaffSkillKey, StaffSkillStatus>;
}

export function staffSemDadosOperacionais(row: RhFuncionario): boolean {
  const nickMissing = !(row.staff_nickname ?? "").trim();
  const turnoEff = turnoRhCoerenteComEscala(row.escala, row.staff_turno).trim();
  const rawTurno = (row.staff_turno ?? "").trim();
  const turnoMissing = !turnoEff && !turnoStaffEhComercial5x2(rawTurno);
  const idOpMissing = !(row.staff_id_operacional ?? "").trim();
  return nickMissing || turnoMissing || idOpMissing;
}

export function staffSemDadosCadastrais(row: RhFuncionario, nomeTime: string): boolean {
  const generoMissing = row.staff_dealer_genero !== "feminino" && row.staff_dealer_genero !== "masculino";
  const { bio, fotos } = staffCadastraisBioFotosAplicaveis(nomeTime);
  const bioMissing = bio && !readStaffDealerBioForUi(row);
  const fotosMissing = fotos && readStaffDealerFotosForUi(row).length === 0;
  return generoMissing || bioMissing || fotosMissing;
}

export function staffSemDadosJogo(row: RhFuncionario): boolean {
  const liveMissing = !(row.staff_live_no_estudio ?? "").trim();
  const skills = normalizarSkills(row.staff_skills as Record<string, unknown> | null);
  const todosInativos = STAFF_SKILL_KEYS.every((key) => skills[key] === "inativo");
  return liveMissing || todosInativos;
}

export interface ResumoStaffCards {
  semDadosOperacionais: RhFuncionario[];
  semDadosCadastrais: RhFuncionario[];
  semDadosJogo: RhFuncionario[];
}

export function calcularResumoStaffCards(
  rows: RhFuncionario[],
  nomePorTimeId: Map<string, string>,
): ResumoStaffCards {
  const semDadosOperacionais: RhFuncionario[] = [];
  const semDadosCadastrais: RhFuncionario[] = [];
  const semDadosJogo: RhFuncionario[] = [];

  for (const row of rows) {
    const nomeTime = row.org_time_id ? nomePorTimeId.get(row.org_time_id) ?? "" : "";
    if (!isGamePresenterTimeNome(nomeTime)) continue;
    if (staffSemDadosOperacionais(row)) semDadosOperacionais.push(row);
    if (staffSemDadosCadastrais(row, nomeTime)) semDadosCadastrais.push(row);
    if (staffSemDadosJogo(row)) semDadosJogo.push(row);
  }

  return { semDadosOperacionais, semDadosCadastrais, semDadosJogo };
}
