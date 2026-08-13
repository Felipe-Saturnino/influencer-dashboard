/**
 * Reticências padrão em placeholders de busca (três pontos ASCII, como Scout).
 * Não usar U+2026 (…) em barras de pesquisa novas.
 */
export const SEARCH_PLACEHOLDER_ELLIPSIS = "...";

/** Busca no painel de um filtro dropdown (>5 opções): `Pesquisar [Nome do filtro]...` */
export function placeholderPesquisaFiltro(nomeFiltro: string): string {
  return `Pesquisar ${nomeFiltro}${SEARCH_PLACEHOLDER_ELLIPSIS}`;
}

export const FILTER_SEARCH_INFLUENCER = placeholderPesquisaFiltro("Influencer");
export const FILTER_SEARCH_AFILIADO = placeholderPesquisaFiltro("Afiliado");
export const FILTER_SEARCH_STAFF = placeholderPesquisaFiltro("Staff");
export const FILTER_SEARCH_OPERADORA = placeholderPesquisaFiltro("Operadora");
export const FILTER_SEARCH_USUARIO = placeholderPesquisaFiltro("Usuário");

/** Barra de pesquisa na página (lista / strip de filtros). */
export const PAGE_SEARCH = {
  nome: `Buscar por nome${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  nomeEmail: `Buscar por nome ou e-mail${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  nomeNickname: `Buscar por nome ou nickname${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  nomeCpfEmail: `Buscar por Nome, CPF ou e-mail${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  figurinos: `Buscar por código, categoria ou emprestado para${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  vaga: `Buscar por nome da vaga${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  vagaCandidato: `Buscar por nome da vaga, candidato ou e-mail${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  organograma: `Buscar por Prestador, Gerência ou Time${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  denuncias: `Buscar por palavras-chave no relato${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  portalRh: `Buscar por palavras-chave na postagem${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  portalAcademy: `Buscar por palavras-chave na postagem${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  informativos: `Buscar por palavras-chave no informativo${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  glossario: `Buscar por termo${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  ajudaPagina: `Buscar página${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  marketplaceOferta: `Buscar por ofertante, estúdio ou turno${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  operadoraNome: `Buscar por nome de operadora${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  mesaNomeOuId: `Buscar por nome da mesa ou ID da mesa${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  pipelineB2b: `Buscar por CNPJ, razão social ou marca${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  pipelineAgregadoras: `Buscar por nome ou site${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  integracao: `Buscar por operador, caminho ou PAM${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  utmSource: `Buscar por UTM Source${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  incidentes: `Buscar por protocolo, prestador, nickname ou mesa${SEARCH_PLACEHOLDER_ELLIPSIS}`,
  sinais: `Buscar por ID do sinal, motivo, mesa, SM ou relator${SEARCH_PLACEHOLDER_ELLIPSIS}`,
} as const;
