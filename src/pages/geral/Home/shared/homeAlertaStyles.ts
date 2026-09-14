import type { CSSProperties } from "react";
import { FONT } from "../../../../constants/theme";

const VERMELHO = "#e84025";
const AMARELO = "#f59e0b";

export type HomeAlertaVariante = "acao" | "atencao";

export const HOME_ALERTA_VARIANTES: Record<
  HomeAlertaVariante,
  { cor: string; titulo: string; bgDark: string; bgLight: string; titleDark: string; titleLight: string }
> = {
  acao: {
    cor: VERMELHO,
    titulo: "AÇÃO NECESSÁRIA",
    bgDark: "rgba(232,64,37,0.08)",
    bgLight: "rgba(232,64,37,0.05)",
    titleDark: "#ff9980",
    titleLight: "#b02a14",
  },
  atencao: {
    cor: AMARELO,
    titulo: "ATENÇÃO",
    bgDark: "rgba(245,158,11,0.1)",
    bgLight: "rgba(245,158,11,0.06)",
    titleDark: "#fcd34d",
    titleLight: "#b45309",
  },
};

export function homeAlertaCtaStyle(variante: HomeAlertaVariante = "acao"): CSSProperties {
  const cor = HOME_ALERTA_VARIANTES[variante].cor;
  return {
    display: "inline-block",
    padding: "8px 16px",
    borderRadius: 10,
    border: `1px solid ${cor}`,
    background: `${cor}18`,
    color: cor,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONT.body,
    textDecoration: "none",
  };
}
