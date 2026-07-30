import type { CSSProperties } from "react";
import { BRAND_SEMANTIC } from "../constants/theme";

/** Ações contextuais de Ajuda na barra de filtros. */
export type AjudaContextualAcao = "conheca" | "troubleshooting" | "tutorial";

/**
 * Cor fixa por ação — informação (azul), atenção/suporte (amarelo), especial/tutorial (roxo).
 * Não é whitelabel: o atalho deve ser reconhecível igual em todos os perfis.
 */
const AJUDA_CONTEXTUAL_COR: Record<
  AjudaContextualAcao,
  { hex: string; light: string; dark: string }
> = {
  conheca: { hex: BRAND_SEMANTIC.azul, light: "#1631c4", dark: "#7b95ff" },
  troubleshooting: { hex: BRAND_SEMANTIC.amarelo, light: "#a16207", dark: "#fbbf24" },
  tutorial: { hex: "#a78bfa", light: "#7c3aed", dark: "#c4b5fd" },
};

export const AJUDA_CONTEXTUAL_ICON_SIZE = 15;

/** Botão/atalho de Ajuda contextual: fundo e borda tintados na cor da ação. */
export function getAjudaContextualAcaoStyle(
  acao: AjudaContextualAcao,
  isDark: boolean,
): CSSProperties {
  const cor = AJUDA_CONTEXTUAL_COR[acao];
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 9,
    background: `color-mix(in srgb, ${cor.hex} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${cor.hex} 30%, transparent)`,
    color: isDark ? cor.dark : cor.light,
    cursor: "pointer",
    flexShrink: 0,
    textDecoration: "none",
  };
}
