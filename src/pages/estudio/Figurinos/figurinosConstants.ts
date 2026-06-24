import type { RhFigurinoStatus, RhWithdrawalType } from "./types"

export const CATEGORIAS = ["Camisa", "Calça", "Colete", "Vestido", "Gravata", "Acessório"] as const;

export const TAMANHOS = ["PP", "P", "M", "G", "GG", "XG", "34", "36", "38", "40", "42", "44", "46", "48", "50", "52", "Único"] as const;

export const GENEROS = ["Masculino", "Feminino", "Unisex"] as const;

export const CORES = ["Branco", "Preto", "Cinza", "Único"] as const;

export const GENERO_PADRAO = "Unisex" as const;

export const COR_PADRAO = "Único" as const;

/** Valor interno ao cadastrar peça disponível em qualquer estúdio (espelha Staff). */
export const FIGURINO_ESTUDIO_CADASTRO_TODOS = "todos";

export const FIGURINO_ESTUDIO_CADASTRO_TODOS_LABEL = "Todos Estúdios";

/** Acervo da equipe Staff — pode combinar com estúdio(s) específico(s). */
export const FIGURINO_ESTUDIO_CADASTRO_STAFF = "staff";

export const FIGURINO_ESTUDIO_CADASTRO_STAFF_LABEL = "Staff";

/** Filtro da lista — opção agregadora Staff. */
export const FIGURINO_FILTRO_STAFF = "staff";

export function figurinoEstudioAtendeTodos(slugs: readonly string[]): boolean {
  return slugs.includes(FIGURINO_ESTUDIO_CADASTRO_TODOS);
}

export function figurinoEstudioAtendeStaff(slugs: readonly string[]): boolean {
  return slugs.includes(FIGURINO_ESTUDIO_CADASTRO_STAFF);
}

/** Prefixo de 3 letras do código (ex.: Camisa → CAM, Vestido → VES). Espelha `_rh_figurino_category_code_prefix` no Postgres. */
export function prefixoCodigoFigurinoCategoria(categoria: string): string {
  const base = categoria
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  return base.slice(0, 3).toUpperCase();
}

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
export function labelTipoRetirada(w: RhWithdrawalType | null | undefined): string {
  if (w === "fixo") return "Fixo";
  return "Emprestar";
}

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
