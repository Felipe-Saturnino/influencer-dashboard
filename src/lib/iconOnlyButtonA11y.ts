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
 * Tooltip/`aria-label` de ação que abre modal — **somente** o título do modal
 * (mesmo texto do `ModalHeader` / `<h2>` canónico). Sem nome do registro, protocolo ou assunto.
 */
export function tooltipModal(tituloModal: string): string {
  return tituloModal.trim();
}

/** Título do `ModalAvaliarPerformanceHub` (`ModalHeader`). */
export function tituloModalPerformanceHub(avaliadoNome: string, data: string): string {
  return tooltipModal(`${avaliadoNome.trim()} · ${data.trim()}`);
}

/** Título do `ModalVisualizarDocumento` (`ModalHeader`). */
export function tituloModalDocumentoPortalRh(
  codigo: string | null | undefined,
  titulo: string,
  versao: string | null | undefined,
): string {
  const parts = [codigo?.trim(), titulo.trim(), versao?.trim()].filter(Boolean);
  return tooltipModal(parts.length > 0 ? parts.join(" - ") : titulo);
}

/** @deprecated Use `tooltipModal` — identificador do registro não entra no tooltip. */
export function tooltipAcaoAbreModal(modalTitulo: string, _identificador?: string): string {
  return tooltipModal(modalTitulo);
}
