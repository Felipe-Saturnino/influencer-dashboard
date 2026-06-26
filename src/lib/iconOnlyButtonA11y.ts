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
 * Tooltip para ação de linha que abre modal com título fixo.
 * Ex.: `tooltipAcaoAbreModal("Editar postagem", row.assunto)` → «Editar postagem — {assunto}».
 */
export function tooltipAcaoAbreModal(modalTitulo: string, identificador?: string): string {
  const titulo = modalTitulo.trim();
  const id = identificador?.trim();
  return id ? `${titulo} — ${id}` : titulo;
}
