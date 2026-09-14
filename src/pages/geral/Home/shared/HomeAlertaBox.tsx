import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { FONT } from "../../../../constants/theme";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { HOME_ALERTA_VARIANTES, type HomeAlertaVariante } from "./homeAlertaStyles";

export function HomeAlertaBox({
  variante = "acao",
  children,
}: {
  variante?: HomeAlertaVariante;
  children: ReactNode;
}) {
  const { isDark, theme: t } = useApp();
  const v = HOME_ALERTA_VARIANTES[variante];

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
