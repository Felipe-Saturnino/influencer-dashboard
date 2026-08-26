import type { Role } from "../../../../types";
import type { TutorialVisibilidadeMap } from "../../../../lib/ajudaTutorialVisibilidade";
import { tutorialVisivelParaRole } from "../../../../lib/ajudaTutorialVisibilidade";
import { TUTORIAL_ALTERAR_ESCALA } from "./alterarEscala";
import { TUTORIAL_CALENDARIO_PRESTADOR } from "./calendarioPrestador";
import { TUTORIAL_DADOS_CADASTRO_ATUALIZACAO } from "./dadosCadastroAtualizacaoCadastral";
import { TUTORIAL_CIENCIA_MANUAIS_ACADEMY } from "./cienciaManuaisAcademy";
import { TUTORIAL_CONTROLE_PRESENCA } from "./controlePresenca";
import { TUTORIAL_GESTAO_STAFF_EDITAR } from "./gestaoStaffEditar";
import { TUTORIAL_IMPRIMIR_IDS_STAFF } from "./imprimirIdsStaff";
import { TUTORIAL_JUSTIFICATIVA_PRESENCA } from "./justificativaPresenca";
import { TUTORIAL_MARKETPLACE_OFERTAS } from "./marketplaceOfertas";
import { TUTORIAL_FIGURINO_RETIRADA_DEVOLUCAO } from "./figurinoRetiradaDevolucao";
import { TUTORIAL_NOVO_INCIDENTE } from "./novoIncidente";
import { TUTORIAL_PORTAL_RH_CIENCIA_POLITICAS } from "./portalRhCienciaPoliticas";
import { TUTORIAL_PORTAL_RH_COMUNICADOS_LIDOS } from "./portalRhComunicadosLidos";
import { TUTORIAL_PORTAL_RH_GERENCIAMENTO } from "./portalRhGerenciamento";
import { TUTORIAL_PERFORMANCE_HUB_ANALISAR_AVALIACAO } from "./performanceHubAnalisarAvaliacao";
import { TUTORIAL_PERFORMANCE_HUB_APLICAR_FEEDBACK } from "./performanceHubAplicarFeedback";
import { TUTORIAL_PERFORMANCE_HUB_AVALIAR } from "./performanceHubAvaliar";
import { TUTORIAL_PERFORMANCE_HUB_CONFIGURACAO_PESOS } from "./performanceHubConfiguracaoPesos";
import { TUTORIAL_POSTAGEM_ACADEMY_APROVACAO } from "./postagemAcademyAprovacao";
import { TUTORIAL_RH_SOLICITACOES_APROVAR } from "./rhSolicitacoesAprovar";
import type { TutorialDef, TutorialSecaoNav } from "./types";

/** Catálogo de tutoriais — ordem das secções alinhada ao menu quando possível. */
export const TUTORIAIS_CATALOG: TutorialDef[] = [
  TUTORIAL_NOVO_INCIDENTE,
  TUTORIAL_FIGURINO_RETIRADA_DEVOLUCAO,
  TUTORIAL_GESTAO_STAFF_EDITAR,
  TUTORIAL_IMPRIMIR_IDS_STAFF,
  TUTORIAL_PORTAL_RH_GERENCIAMENTO,
  TUTORIAL_PORTAL_RH_CIENCIA_POLITICAS,
  TUTORIAL_PORTAL_RH_COMUNICADOS_LIDOS,
  TUTORIAL_RH_SOLICITACOES_APROVAR,
  TUTORIAL_DADOS_CADASTRO_ATUALIZACAO,
  TUTORIAL_CALENDARIO_PRESTADOR,
  TUTORIAL_CONTROLE_PRESENCA,
  TUTORIAL_JUSTIFICATIVA_PRESENCA,
  TUTORIAL_ALTERAR_ESCALA,
  TUTORIAL_MARKETPLACE_OFERTAS,
  TUTORIAL_CIENCIA_MANUAIS_ACADEMY,
  TUTORIAL_POSTAGEM_ACADEMY_APROVACAO,
  TUTORIAL_PERFORMANCE_HUB_AVALIAR,
  TUTORIAL_PERFORMANCE_HUB_ANALISAR_AVALIACAO,
  TUTORIAL_PERFORMANCE_HUB_APLICAR_FEEDBACK,
  TUTORIAL_PERFORMANCE_HUB_CONFIGURACAO_PESOS,
];

/** Agrupa tutoriais visíveis por secção (menu lateral da aba Tutoriais). */
export function buildTutoriaisNav(
  role: Role | null | undefined,
  visibility: TutorialVisibilidadeMap,
  isAdmin: boolean,
): TutorialSecaoNav[] {
  const bySection = new Map<string, TutorialDef[]>();
  for (const t of TUTORIAIS_CATALOG) {
    if (!tutorialVisivelParaRole(t.id, role, visibility, isAdmin)) continue;
    const list = bySection.get(t.section) ?? [];
    list.push(t);
    bySection.set(t.section, list);
  }
  return [...bySection.entries()].map(([section, items]) => ({ section, items }));
}

export function temAlgumTutorialVisivel(
  role: Role | null | undefined,
  visibility: TutorialVisibilidadeMap,
  isAdmin: boolean,
): boolean {
  return TUTORIAIS_CATALOG.some((t) => tutorialVisivelParaRole(t.id, role, visibility, isAdmin));
}
