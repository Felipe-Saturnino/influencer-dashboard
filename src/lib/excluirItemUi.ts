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



/** Tooltip e aria-label do botão ícone — ex.: «Excluir mesa Speed Baccarat». */

export function labelTooltipExcluir(descricaoItem: string): string {

  return `Excluir ${descricaoItem}`;

}



/**

 * Fragmento curto do botão (sem artigo, sem «»).

 * Padrão: `{tipo} {nome}` — ex.: `mesa Speed Baccarat`, `campanha Black Friday`.

 */

export function descricaoBotaoExcluir(tipoEntidade: string, nome: string): string {

  const tipo = tipoEntidade.trim();

  const item = nome.trim();

  return item ? `${tipo} ${item}` : tipo;

}



/**

 * Fragmento do corpo do modal (com artigo e «» no identificador principal).

 * O helper `textoModalExcluir` envolve com «Deseja excluir …?».

 * @param artigoTipo — ex.: `a mesa`, `o documento`, `a campanha`

 * @param nome — identificador principal (vai entre «»)

 * @param sufixo — detalhe opcional após o nome (ex.: `(ID Spin: 123)`)

 */

export function descricaoModalExcluirItem(

  artigoTipo: string,

  nome: string,

  sufixo?: string,

): string {

  const core = `${artigoTipo.trim()} «${nome.trim()}»`;

  return sufixo?.trim() ? `${core} ${sufixo.trim()}` : core;

}



/** Corpo completo do pop-up — «Deseja excluir …?» + linha de irreversibilidade. */

export function textoModalExcluir(descricaoItem: string): string {

  return `Deseja excluir ${descricaoItem}?\n\n${SUFIXO_IRREVERSIVEL}`;

}


