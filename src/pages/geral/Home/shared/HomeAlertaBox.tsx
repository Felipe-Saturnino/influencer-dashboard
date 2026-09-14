import type { ReactNode, CSSProperties } from "react";
import { AlertTriangle } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { FONT } from "../../../../constants/theme";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";

const VERMELHO = "#e84025";
const AMARELO = "#f59e0b";

export type HomeAlertaVariante = "acao" | "atencao";

const VARIANTES: Record<
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
  const cor = VARIANTES[variante].cor;
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

export function HomeAlertaBox({
  variante = "acao",
  children,
}: {
  variante?: HomeAlertaVariante;
  children: ReactNode;
}) {
  const { isDark, theme: t } = useApp();
  const v = VARIANTES[variante];

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 18px",
        borderRadius: 14,
        background: isDark ? v.bgDark : v.bgLight,
        border: `1px solid ${v.cor}47`,
        borderLeft: `4px solid ${v.cor}`,
      }}
      role="status"
    >
      <AlertTriangle size={20} color={v.cor} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: isDark ? v.titleDark : v.titleLight,
            letterSpacing: "0.06em",
            marginBottom: 8,
            fontFamily: FONT_TITLE,
          }}
        >
          {v.titulo}
        </div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.65, fontFamily: FONT.body }}>{children}</div>
      </div>
    </div>
  );
}
