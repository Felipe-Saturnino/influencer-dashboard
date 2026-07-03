/** Título canónico do pop-up de exclusão (lista/card/tabela). */
export const MODAL_EXCLUIR_TITULO = "Excluir";

const SUFIXO_IRREVERSIVEL = "Esta ação não poderá ser desfeita.";

/** Botão ícone — dimensões e cor (referência: Gestão de Mesas). */
export const BTN_EXCLUIR_LINHA_SIZE = 32;
export const BTN_EXCLUIR_LINHA_ICON_SIZE = 14;
export const BTN_EXCLUIR_LINHA_BORDER_RADIUS = 10;
export const BTN_EXCLUIR_LINHA_BORDER = "1px solid rgba(232,64,37,0.35)";
/** Vermelho semântico de perigo — alinhado a `BRAND.vermelho` / Global. */
export const BTN_EXCLUIR_LINHA_COLOR = "#e84025";

/** Botão ícone + texto «Excluir» — padding e gap (ícone/cor/borda iguais ao só ícone). */
export const BTN_EXCLUIR_COM_TEXTO_PADDING = "10px 18px";
export const BTN_EXCLUIR_COM_TEXTO_GAP = 6;
export const BTN_EXCLUIR_COM_TEXTO_LABEL = "Excluir";

function tituloTipoEntidade(tipo: string): string {
  const raw = tipo.trim();
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Tooltip/`aria-label` do botão excluir — só a ação + tipo de entidade.
 * Ex.: `tooltipExcluir("prestador")` → «Excluir Prestador».
 */
export function tooltipExcluir(tipoEntidade: string): string {
  const titulo = tituloTipoEntidade(tipoEntidade);
  return titulo ? `Excluir ${titulo}` : "Excluir";
}

/** @deprecated Use `tooltipExcluir(tipoEntidade)` — sem nome do registro no tooltip. */
export function labelTooltipExcluir(tipoEntidade: string): string {
  return tooltipExcluir(tipoEntidade);
}

/**
 * Fragmento curto para referência interna (modal usa `descricaoModalExcluirItem`).
 * @deprecated Não usar no tooltip do botão — só `tooltipExcluir` / `labelAcao`.
 */
export function descricaoBotaoExcluir(tipoEntidade: string, nome?: string | null): string {
  const tipo = tipoEntidade.trim();
  const item = (nome ?? "").trim();
  return item ? `${tipo} ${item}` : tipo;
}

/**
 * Fragmento do corpo do modal (com artigo e «» no identificador principal).
 * O helper `textoModalExcluir` envolve com «Deseja excluir …?».
 */
export function descricaoModalExcluirItem(
  artigoTipo: string,
  nome?: string | null,
  sufixo?: string,
): string {
  const label = (nome ?? "").trim() || "—";
  const core = `${artigoTipo.trim()} «${label}»`;
  return sufixo?.trim() ? `${core} ${sufixo.trim()}` : core;
}

/** Corpo completo do pop-up — «Deseja excluir …?» + linha de irreversibilidade. */
export function textoModalExcluir(descricaoItem: string): string {
  return `Deseja excluir ${descricaoItem}?\n\n${SUFIXO_IRREVERSIVEL}`;
}
