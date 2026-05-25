import type { CSSProperties } from "react";
import { FONT } from "../constants/theme";

type ThemeLike = {
  cardBorder: string;
  inputBg?: string;
  cardBg?: string;
  text: string;
  textMuted?: string;
};

/** Estilo canónico da barra de pesquisa de página (referência: Lives → Scout). */
export function getBarraPesquisaPaginaInputStyle(t: ThemeLike): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 16px 10px 38px",
    borderRadius: 12,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    outline: "none",
  };
}

export function getBarraPesquisaPaginaIconStyle(t: ThemeLike): CSSProperties {
  return {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: t.textMuted ?? "currentColor",
    pointerEvents: "none",
  };
}

/** Busca dentro do painel de um filtro (dropdown). */
export function getBarraPesquisaFiltroPainelInputStyle(t: ThemeLike): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    marginBottom: 8,
    padding: "8px 10px 8px 32px",
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 12,
    fontFamily: FONT.body,
    outline: "none",
  };
}

export function getBarraPesquisaFiltroPainelIconStyle(t: ThemeLike): CSSProperties {
  return {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: t.textMuted ?? "currentColor",
    pointerEvents: "none",
  };
}
