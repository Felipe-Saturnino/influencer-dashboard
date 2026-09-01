import { fmtDataBR } from "./rhVagasFormat";
import type { RhVagaCandidaturaEtapa, RhVagaCandidaturaRow } from "../types/rhVagaCandidatura";
import type { RhVagaTipo } from "../types/rhVaga";

/** Máximo de cards visíveis por coluna do funil antes de rolagem interna. */
export const VAGAS_KANBAN_MAX_CARDS_VISIVEIS = 10;

const VAGAS_KANBAN_CARD_ALTURA_ESTIMADA_PX = 168;
const VAGAS_KANBAN_COL_GAP_PX = 8;
const VAGAS_KANBAN_COL_BODY_PADDING_PX = 16;

/** Altura máxima da lista de cards (≈10 cards + gaps + padding). */
export function getVagasKanbanColBodyMaxHeightPx(maxCards = VAGAS_KANBAN_MAX_CARDS_VISIVEIS): number {
  if (maxCards <= 0) return VAGAS_KANBAN_COL_BODY_PADDING_PX;
  return (
    maxCards * VAGAS_KANBAN_CARD_ALTURA_ESTIMADA_PX +
    (maxCards - 1) * VAGAS_KANBAN_COL_GAP_PX +
    VAGAS_KANBAN_COL_BODY_PADDING_PX
  );
}

export const RH_VAGA_CANDIDATURA_ETAPA_ORDEM: RhVagaCandidaturaEtapa[] = [
  "inscritos",
  "aguardando_retorno",
  "agendado",
  "em_avaliacao",
  "stand_by",
  "contratado",
  "dispensado",
];

export const ETAPAS_TERMINAIS: RhVagaCandidaturaEtapa[] = ["contratado", "dispensado"];

export function indiceEtapaCandidatura(etapa: RhVagaCandidaturaEtapa): number {
  return RH_VAGA_CANDIDATURA_ETAPA_ORDEM.indexOf(etapa);
}

export function etapasAvancoDisponiveis(etapaAtual: RhVagaCandidaturaEtapa): RhVagaCandidaturaEtapa[] {
  if (ETAPAS_TERMINAIS.includes(etapaAtual)) return [];
  const i = indiceEtapaCandidatura(etapaAtual);
  if (i < 0) return [];
  return RH_VAGA_CANDIDATURA_ETAPA_ORDEM.slice(i + 1);
}

export function mostrarAbaEtapasNoModal(etapa: RhVagaCandidaturaEtapa): boolean {
  return !ETAPAS_TERMINAIS.includes(etapa);
}

export function labelTipoCandidatura(tipoVaga: RhVagaTipo | null | undefined): string {
  if (tipoVaga === "externa") return "Externa";
  if (tipoVaga === "interna") return "Interna";
  if (tipoVaga === "mista") return "Interna";
  return "—";
}

export function fmtDataHoraBR(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function labelLinha4CardKanban(c: RhVagaCandidaturaRow): string {
  switch (c.etapa) {
    case "inscritos":
      return fmtDataBR(c.created_at);
    case "aguardando_retorno":
    case "em_avaliacao":
      return fmtDataBR(c.etapa_entrada_em ?? c.updated_at);
    case "agendado":
      return fmtDataBR(c.data_agendamento);
    case "stand_by":
      return fmtDataBR(c.data_aprovacao);
    case "contratado":
      return fmtDataBR(c.data_contratacao);
    case "dispensado":
      return fmtDataBR(c.data_dispensa);
    default:
      return "—";
  }
}

export function labelCampoLinha4Kanban(etapa: RhVagaCandidaturaEtapa): string {
  switch (etapa) {
    case "inscritos":
      return "Data de Candidatura";
    case "aguardando_retorno":
    case "em_avaliacao":
      return "Data de Atualização";
    case "agendado":
      return "Data de Agendamento";
    case "stand_by":
      return "Data de Aprovação";
    case "contratado":
      return "Data de Contratação";
    case "dispensado":
      return "Data de Dispensa";
    default:
      return "Data";
  }
}

export type CamposEtapaCandidatura = {
  data_agendamento?: string | null;
  data_aprovacao?: string | null;
  data_contratacao?: string | null;
  data_dispensa?: string | null;
  motivo_dispensa?: string | null;
};

export function camposObrigatoriosParaEtapa(etapa: RhVagaCandidaturaEtapa): (keyof CamposEtapaCandidatura)[] {
  switch (etapa) {
    case "agendado":
      return ["data_agendamento"];
    case "stand_by":
      return ["data_aprovacao"];
    case "contratado":
      return ["data_contratacao"];
    case "dispensado":
      return ["data_dispensa", "motivo_dispensa"];
    default:
      return [];
  }
}

export function patchCamposParaEtapa(etapa: RhVagaCandidaturaEtapa, campos: CamposEtapaCandidatura): Record<string, unknown> {
  const patch: Record<string, unknown> = { etapa };
  if (etapa === "agendado" && campos.data_agendamento) patch.data_agendamento = campos.data_agendamento;
  if (etapa === "stand_by" && campos.data_aprovacao) patch.data_aprovacao = campos.data_aprovacao;
  if (etapa === "contratado" && campos.data_contratacao) patch.data_contratacao = campos.data_contratacao;
  if (etapa === "dispensado") {
    if (campos.data_dispensa) patch.data_dispensa = campos.data_dispensa;
    if (campos.motivo_dispensa != null) patch.motivo_dispensa = campos.motivo_dispensa.trim();
  }
  return patch;
}
