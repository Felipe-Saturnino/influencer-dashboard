/** Título canónico do pop-up de arquivamento (lista/card/tabela). */
export const MODAL_ARQUIVAR_TITULO = "Arquivar";

const SUFIXO_IRREVERSIVEL = "Esta ação não poderá ser desfeita.";

/** Botão ícone — dimensões (referência: Gerenciamento Informativos / Portal RH). */
export const BTN_ARQUIVAR_LINHA_SIZE = 30;
export const BTN_ARQUIVAR_LINHA_ICON_SIZE = 13;
export const BTN_ARQUIVAR_LINHA_BORDER_RADIUS = 8;

function tituloTipoEntidade(tipo: string): string {
  const raw = tipo.trim();
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Tooltip/`aria-label` do botão arquivar — só a ação + tipo de entidade.
 * Ex.: `tooltipArquivar("postagem")` → «Arquivar Postagem».
 */
export function tooltipArquivar(tipoEntidade: string): string {
  const titulo = tituloTipoEntidade(tipoEntidade);
  return titulo ? `Arquivar ${titulo}` : "Arquivar";
}

/** @deprecated Use `tooltipArquivar(tipoEntidade)`. */
export function labelTooltipArquivar(tipoEntidade: string): string {
  return tooltipArquivar(tipoEntidade);
}

/**
 * Fragmento para corpo do modal — ver `descricaoModalArquivarItem`.
 * @deprecated Não usar no tooltip do botão.
 */
export function descricaoBotaoArquivar(tipoEntidade: string, nome?: string | null): string {
  const tipo = tipoEntidade.trim();
  const item = (nome ?? "").trim();
  return item ? `${tipo} ${item}` : tipo;
}

/** Fragmento do corpo do modal (com artigo e «» no identificador principal). */
export function descricaoModalArquivarItem(artigoTipo: string, nome?: string | null): string {
  const label = (nome ?? "").trim() || "—";
  return `${artigoTipo.trim()} «${label}»`;
}

/** Corpo completo do pop-up — «Deseja arquivar …?» + linha de irreversibilidade. */
export function textoModalArquivar(descricaoItem: string): string {
  return `Deseja arquivar ${descricaoItem}?\n\n${SUFIXO_IRREVERSIVEL}`;
}
