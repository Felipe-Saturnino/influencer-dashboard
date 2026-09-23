import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { getCtaCriarButtonStyle } from "../../../lib/ctaCriarStyles";

export function campoLabelStyle(t: Theme): CSSProperties {
  return {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  };
}

export function campoInputStyle(t: Theme, readonly = false): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 40,
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: readonly ? "transparent" : (t.inputBg ?? t.cardBg),
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
  };
}

export function campoTextareaStyle(t: Theme, readonly = false): CSSProperties {
  return {
    ...campoInputStyle(t, readonly),
    minHeight: 88,
    resize: readonly ? "none" : "vertical",
  };
}

export function botaoSecundarioStyle(t: Theme, disabled = false): CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

export function botaoPrimarioStyle(disabled = false): CSSProperties {
  return {
    ...getCtaCriarButtonStyle({ useBrand: false }, { opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }),
  };
}

export function botaoArquivarStyle(disabled = false): CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, #e84025 35%, transparent)",
    background: "transparent",
    color: "#e84025",
    fontFamily: FONT.body,
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}
