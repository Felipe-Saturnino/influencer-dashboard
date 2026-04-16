import type { RhFigurinoStatus } from "./types";

export const CATEGORIAS = [
  "Camisa",
  "Calça",
  "Blazer",
  "Vestido",
  "Saia",
  "Shorts",
  "Sapato",
  "Acessório",
  "Outro",
] as const;

export const TAMANHOS = ["PP", "P", "M", "G", "GG", "XG", "34", "36", "38", "40", "42", "44", "46", "48", "Único"] as const;

export function labelAba(s: RhFigurinoStatus): string {
  switch (s) {
    case "available":
      return "Disponíveis";
    case "borrowed":
      return "Emprestadas";
    case "maintenance":
      return "Manutenção";
    case "discarded":
      return "Descartadas";
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
