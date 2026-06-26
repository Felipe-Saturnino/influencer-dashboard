import type { CSSProperties } from "react";

export const BTN_ICONE_ACAO_LINHA_SIZE = 30;
export const BTN_ICONE_ACAO_LINHA_BORDER_RADIUS = 8;

export function getBtnIconeAcaoLinhaStyle(t: {
  cardBorder: string;
  inputBg: string;
}): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: BTN_ICONE_ACAO_LINHA_SIZE,
    height: BTN_ICONE_ACAO_LINHA_SIZE,
    background: t.inputBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: BTN_ICONE_ACAO_LINHA_BORDER_RADIUS,
    cursor: "pointer",
    flexShrink: 0,
  };
}
