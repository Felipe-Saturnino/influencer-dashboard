import type { CSSProperties } from "react";
import { FONT } from "../constants/theme";

/** Padrão Brand MDC §7 — navegação de carrossel (mês, semana, turno, diretoria, etc.). */
export const CAROUSEL_NAV_BTN_PX = 32;

export function getCarouselBtnNavStyle(
  t: { cardBorder: string; text: string },
  disabled: boolean,
): CSSProperties {
  return {
    width: CAROUSEL_NAV_BTN_PX,
    height: CAROUSEL_NAV_BTN_PX,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

export type CarouselPeriodLabelOpts = {
  minWidth?: number | string;
  fontFamily?: string;
  overflow?: CSSProperties["overflow"];
  textOverflow?: CSSProperties["textOverflow"];
  whiteSpace?: CSSProperties["whiteSpace"];
};

/** Rótulo central do carrossel — conteúdo (texto do período) definido pelo pai. */
export function getCarouselPeriodLabelStyle(
  t: { text: string },
  opts?: CarouselPeriodLabelOpts,
): CSSProperties {
  return {
    fontSize: 18,
    fontWeight: 800,
    color: t.text,
    fontFamily: opts?.fontFamily ?? FONT.body,
    minWidth: opts?.minWidth ?? 180,
    textAlign: "center",
    ...(opts?.overflow != null ? { overflow: opts.overflow } : {}),
    ...(opts?.textOverflow != null ? { textOverflow: opts.textOverflow } : {}),
    ...(opts?.whiteSpace != null ? { whiteSpace: opts.whiteSpace } : {}),
  };
}
