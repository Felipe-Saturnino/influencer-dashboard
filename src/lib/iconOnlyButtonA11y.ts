/** `aria-label` + `title` do botão X em `ModalHeader` e modais canónicos. */
export const TOOLTIP_FECHAR_MODAL = "Fechar modal";

/**
 * Props de acessibilidade + tooltip nativo (`title`) para botão **somente ícone**.
 * O texto visível no hover deve coincidir com `aria-label`.
 */
export function propsBotaoIcone(label: string): { "aria-label": string; title: string } {
  const trimmed = label.trim();
  return { "aria-label": trimmed, title: trimmed };
}

/** Props do botão X de fechar modal (header ou painel). */
export function propsBotaoFecharModal(): { "aria-label": string; title: string } {
  return propsBotaoIcone(TOOLTIP_FECHAR_MODAL);
}

/**
 * Tooltip/`aria-label` de botão só ícone que abre modal ou fluxo —
 * **somente o rótulo canónico da ação** (ex.: «Editar Prestador», «Histórico do Prestador»).
 * Sem nome do registro, protocolo, assunto ou data.
 */
export function tooltipAcao(rotuloAcao: string): string {
  return rotuloAcao.trim();
}

/** @deprecated Alias de `tooltipAcao`. */
export function tooltipModal(rotuloAcao: string): string {
  return tooltipAcao(rotuloAcao);
}

/** @deprecated Use `tooltipAcao` com rótulo fixo — ex.: «Ver avaliação». */
export function tituloModalPerformanceHub(_avaliadoNome: string, _data: string): string {
  return tooltipAcao("Ver avaliação");
}

/** @deprecated Use `tooltipAcao("Visualizar documento")`. */
export function tituloModalDocumentoPortalRh(
  _codigo: string | null | undefined,
  _titulo: string,
  _versao: string | null | undefined,
): string {
  return tooltipAcao("Visualizar documento");
}

/** @deprecated Use `tooltipAcao`. */
export function tooltipAcaoAbreModal(rotuloAcao: string, _identificador?: string): string {
  return tooltipAcao(rotuloAcao);
}
