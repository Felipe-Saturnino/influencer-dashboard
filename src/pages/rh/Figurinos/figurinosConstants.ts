import type { RhFigurinoStatus } from "./types";

export const CATEGORIAS = ["Camisa", "Calça", "Colete", "Vestido", "Gravata", "Acessório"] as const;

export const TAMANHOS = ["PP", "P", "M", "G", "GG", "XG", "34", "36", "38", "40", "42", "44", "46", "48", "Único"] as const;

export function labelAba(s: RhFigurinoStatus): string {
  switch (s) {
    case "available":
      return "Disponíveis";
    case "borrowed":
      return "Emprestada";
    case "maintenance":
      return "Manutenção";
    case "discarded":
      return "Descartada";
    default:
      return s;
  }
}

export function labelStatusPeca(s: RhFigurinoStatus): string {
  switch (s) {
    case "available":
      return "Disponível";
    case "borrowed":
      return "Emprestada";
    case "maintenance":
      return "Manutenção";
    case "discarded":
      return "Descartada";
    default:
      return s;
  }
}

export function emptyMsgAba(s: RhFigurinoStatus): string {
  switch (s) {
    case "available":
      return "Nenhuma peça disponível no momento. Cadastre novas peças para começar.";
    case "borrowed":
      return "Nenhuma peça emprestada no momento.";
    case "maintenance":
      return "Nenhuma peça em manutenção.";
    case "discarded":
      return "Nenhuma peça foi descartada.";
    default:
      return "Nenhum registro nesta aba.";
  }
}

/** Valores enviados às RPCs `rh_figurino_enviar_manutencao` / devolução (manutenção). */
export type RhFigurinoTipoManutencao = "costura" | "lavagem" | "perda" | "descarte";

export const TIPOS_MANUTENCAO: { value: RhFigurinoTipoManutencao; label: string }[] = [
  { value: "costura", label: "Costura" },
  { value: "lavagem", label: "Lavagem" },
  { value: "perda", label: "Perda" },
  { value: "descarte", label: "Descarte" },
];

/** Rótulos em português para linhas do histórico de status (valores gravados em inglês). */
export function labelStatusHistorico(s: string | null | undefined): string {
  if (s == null || s === "") return "—";
  switch (s) {
    case "available":
      return "Disponível";
    case "borrowed":
      return "Emprestada";
    case "maintenance":
      return "Manutenção";
    case "discarded":
      return "Descartada";
    default:
      return s;
  }
}
