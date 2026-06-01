import { useApp } from "../../../../context/AppContext";
import { HOME_BODY_MUTED } from "./homeSharedUi";

/** Subtítulo do mês de referência dos blocos KPI / Aquisição (ex.: "Maio 2026"). */
export function HomeSectionMesSubtitle({ label }: { label: string }) {
  const { theme: t } = useApp();
  return (
    <p
      style={{
        ...HOME_BODY_MUTED,
        color: t.textMuted,
        margin: "-6px 0 14px",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </p>
  );
}
