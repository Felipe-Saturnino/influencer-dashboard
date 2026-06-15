/** Título canónico do pop-up de arquivamento (lista/card/tabela). */

export const MODAL_ARQUIVAR_TITULO = "Arquivar";

const SUFIXO_IRREVERSIVEL = "Esta ação não poderá ser desfeita.";

/** Botão ícone — dimensões (referência: Gerenciamento Informativos / Portal RH). */
export const BTN_ARQUIVAR_LINHA_SIZE = 30;
export const BTN_ARQUIVAR_LINHA_ICON_SIZE = 13;
export const BTN_ARQUIVAR_LINHA_BORDER_RADIUS = 8;

/** Tooltip e aria-label do botão ícone — ex.: «Arquivar informativo Título». */
export function labelTooltipArquivar(descricaoItem: string): string {
  return `Arquivar ${descricaoItem}`;
}

/**
 * Fragmento curto do botão (sem artigo, sem «»).
 * Padrão: `{tipo} {nome}` — ex.: `informativo Black Friday`, `postagem Política de férias`.
 */
export function descricaoBotaoArquivar(tipoEntidade: string, nome?: string | null): string {
  const tipo = tipoEntidade.trim();
  const item = (nome ?? "").trim();
  return item ? `${tipo} ${item}` : tipo;
}

/**
 * Fragmento do corpo do modal (com artigo e «» no identificador principal).
 * O helper `textoModalArquivar` envolve com «Deseja arquivar …?».
 */
export function descricaoModalArquivarItem(artigoTipo: string, nome?: string | null): string {
  const label = (nome ?? "").trim() || "—";
  return `${artigoTipo.trim()} «${label}»`;
}

/** Corpo completo do pop-up — «Deseja arquivar …?» + linha de irreversibilidade. */
export function textoModalArquivar(descricaoItem: string): string {
  return `Deseja arquivar ${descricaoItem}?\n\n${SUFIXO_IRREVERSIVEL}`;
}
