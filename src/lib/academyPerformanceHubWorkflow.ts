import type { PermissaoValor } from "../types";
import type {
  PerformanceHubAvaliacao,
  PerformanceHubStatus,
  PerformanceHubTimeSlug,
} from "./academyPerformanceHubTypes";
import { normalizarTextoBusca } from "./searchText";

export function statusInicialNovaAvaliacao(_time: PerformanceHubTimeSlug): PerformanceHubStatus {
  return "rascunho";
}

/** Publicar (Concluir) na Gerenciamento → entra na aba Avaliações como Aguardando. */
export function statusAposConcluirModal(_time: PerformanceHubTimeSlug): PerformanceHubStatus {
  return "aguardando";
}

export function statusAposSalvarRascunho(
  row: PerformanceHubAvaliacao,
): PerformanceHubStatus {
  if (row.status === "rascunho" || row.status === "em_analise" || row.status === "pendente") {
    return "rascunho";
  }
  return row.status;
}

/** Aba Avaliações — só avaliações já publicadas (`concluida` = legado pré-migração). */
export function avaliacaoVisivelAbaAvaliacoes(row: PerformanceHubAvaliacao): boolean {
  return (
    row.status === "aguardando" ||
    row.status === "feedback" ||
    row.status === "aprovado" ||
    row.status === "concluida"
  );
}

/** Ver = Próprios sem Editar: lista só as próprias, sem filtro de Time. */
export function isEscopoPropriosPerformanceHub(
  canView: PermissaoValor,
  canEditarOk: boolean,
): boolean {
  return canView === "proprios" && !canEditarOk;
}

export type EscopoPropriosPerformanceHub = {
  staffIds: ReadonlySet<string>;
  /** Nomes do cadastro RH + nome do perfil de login (já trimados). */
  nomes: readonly string[];
};

function nomeCoincidePerformanceHub(a: string, b: string): boolean {
  const na = normalizarTextoBusca(a);
  const nb = normalizarTextoBusca(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** Casa avaliação ao prestador logado: staff id (preferência) ou nome do cadastro/perfil. */
export function avaliacaoPertenceAoEscopoProprios(
  row: Pick<PerformanceHubAvaliacao, "avaliadoStaffId" | "avaliadoNome">,
  escopo: EscopoPropriosPerformanceHub,
): boolean {
  const staffId = row.avaliadoStaffId?.trim();
  if (staffId && escopo.staffIds.has(staffId)) return true;
  for (const nome of escopo.nomes) {
    if (nomeCoincidePerformanceHub(row.avaliadoNome, nome)) return true;
  }
  return false;
}

/** Bloco Analisar Avaliações (Gerenciamento) — rascunhos em andamento. */
export function avaliacaoVisivelGerenciamentoAnalisar(
  row: PerformanceHubAvaliacao,
  time: PerformanceHubTimeSlug,
): boolean {
  if (row.time !== time) return false;
  return row.status === "rascunho" || row.status === "em_analise" || row.status === "pendente";
}

export function avaliacaoEmAndamentoPorNome(
  rows: PerformanceHubAvaliacao[],
  time: PerformanceHubTimeSlug,
  nome: string,
): PerformanceHubAvaliacao | undefined {
  return rows.find(
    (row) =>
      row.time === time &&
      row.avaliadoNome === nome &&
      avaliacaoVisivelGerenciamentoAnalisar(row, time),
  );
}

export type PerformanceHubAcaoAvaliacoes =
  | "ver"
  | "analisar"
  | "historico"
  | "aplicar_feedback";

/**
 * Ações da aba Avaliações conforme permissão.
 * Editar=Sim tem precedência sobre Ver=Próprios quando ambos existem.
 */
export function acoesAbaAvaliacoesPerformanceHub(opts: {
  canView: PermissaoValor;
  canEditarOk: boolean;
  status: PerformanceHubStatus;
}): PerformanceHubAcaoAvaliacoes[] {
  const { canView, canEditarOk } = opts;
  const status = opts.status === "concluida" ? "aprovado" : opts.status;
  if (status !== "aguardando" && status !== "feedback" && status !== "aprovado") {
    return [];
  }

  if (canEditarOk) {
    if (status === "aguardando") return [];
    if (status === "feedback") return ["historico", "ver", "aplicar_feedback"];
    return ["ver", "historico"];
  }

  if (canView === "proprios") {
    if (status === "aguardando") return ["analisar"];
    return ["ver", "historico"];
  }

  return ["ver", "historico"];
}

export function statusPublicadoPerformanceHub(status: PerformanceHubStatus): boolean {
  return (
    status === "aguardando" ||
    status === "feedback" ||
    status === "aprovado" ||
    status === "concluida"
  );
}

/** Conta na agenda (realizadas) — só avaliações aprovadas. */
export function statusContaComoRealizadaPerformanceHub(status: PerformanceHubStatus): boolean {
  return status === "aprovado" || status === "concluida";
}
