import type { RhAreaAtuacao } from "../types/rhFuncionario";
import type { RhOrgPrestadorVinculoOpcao } from "../types/rhOrganograma";

/** Normalização de rótulos do organograma (mesma regra de sync de usuário RH). */
export function normRhOrgRotulo(nome: string | null | undefined): string {
  return (nome ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function gerenciaIndicaAreaEstudio(gerenciaNome: string): boolean {
  const g = normRhOrgRotulo(gerenciaNome);
  if (!g) return false;
  return (
    g.includes("operation management") ||
    g.includes("game floor") ||
    g === "treinamento" ||
    g.includes("gerencia de treinamento")
  );
}

function diretoriaIndicaAreaEscritorio(diretoriaNome: string): boolean {
  const d = normRhOrgRotulo(diretoriaNome);
  return d.includes("criacao");
}

function gerenciaIndicaAreaEscritorio(gerenciaNome: string): boolean {
  const g = normRhOrgRotulo(gerenciaNome);
  if (!g) return false;
  return g === "facilities" || g.includes("facilities");
}

/**
 * Área de atuação sugerida no modal **Novo Prestador** conforme o nó do organograma.
 * Demais ramos: vazio («— Selecione —»).
 */
export function inferAreaAtuacaoDefaultNovoPrestador(
  op: RhOrgPrestadorVinculoOpcao,
): "" | RhAreaAtuacao {
  if (gerenciaIndicaAreaEstudio(op.gerenciaNome)) return "estudio";
  if (diretoriaIndicaAreaEscritorio(op.diretoriaNome)) return "escritorio";
  if (gerenciaIndicaAreaEscritorio(op.gerenciaNome)) return "escritorio";
  return "";
}

/** Remuneração por hora (centavos inteiros) por nome do time — somente modal Novo Prestador. */
const REMUNERACAO_HORA_CENTAVOS_POR_TIME: Readonly<Record<string, number>> = {
  shuffler: 1375,
  "contador de cartas": 1375,
  "game presenter": 1775,
  "shift leader": 2222,
  "performance coach": 2111,
  "service manager": 2222,
  "customer service": 1777,
};

export function remuneracaoHoraCentavosDefaultDeTimeNome(timeNome: string | null | undefined): string {
  const key = normRhOrgRotulo(timeNome);
  if (!key) return "";
  const cents = REMUNERACAO_HORA_CENTAVOS_POR_TIME[key];
  return cents != null && cents > 0 ? String(cents) : "";
}

export type NovoPrestadorDefaultsContratacao = {
  area_atuacao: "" | RhAreaAtuacao;
  remuneracaoHoraCentavos: string;
  salarioCentavos: string;
  staff_turno: string;
  escala: string;
};

/** Limpa sugestões ao remover o vínculo com o organograma (somente Novo Prestador). */
export function defaultsNovoPrestadorSemVinculoOrganograma(): NovoPrestadorDefaultsContratacao {
  return {
    area_atuacao: "",
    remuneracaoHoraCentavos: "",
    salarioCentavos: "",
    staff_turno: "",
    escala: "",
  };
}

/**
 * Defaults de contratação ao escolher organograma no modal **Novo Prestador**.
 * Não altera cadastros existentes nem modais de edição/ação RH.
 */
export function defaultsNovoPrestadorDeVinculoOrganograma(
  op: RhOrgPrestadorVinculoOpcao,
): NovoPrestadorDefaultsContratacao {
  const area = inferAreaAtuacaoDefaultNovoPrestador(op);
  const rhCent =
    op.nivel === "time" ? remuneracaoHoraCentavosDefaultDeTimeNome(op.timeNome) : "";

  if (area === "estudio") {
    return {
      area_atuacao: "estudio",
      remuneracaoHoraCentavos: rhCent,
      salarioCentavos: "",
      staff_turno: "",
      escala: "",
    };
  }
  if (area === "escritorio") {
    return {
      area_atuacao: "escritorio",
      remuneracaoHoraCentavos: "",
      staff_turno: "",
      salarioCentavos: "",
      escala: "5x2",
    };
  }
  return {
    area_atuacao: "",
    remuneracaoHoraCentavos: "",
    salarioCentavos: "",
    staff_turno: "",
    escala: "",
  };
}
