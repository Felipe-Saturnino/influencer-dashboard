import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";

export function StatusTecnicoLoadingBlock() {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        padding: "24px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        color: t.textMuted,
        fontFamily: FONT.body,
      }}
    >
      <Loader2
        size={20}
        className="app-lucide-spin"
        style={{ color: "var(--brand-primary, #7c3aed)" }}
        aria-hidden="true"
      />
      Carregando…
    </div>
  );
}

export function AcaoCtaContent({
  executando,
  label,
  labelExecutando,
  icon,
}: {
  executando: boolean;
  label: string;
  labelExecutando: string;
  icon?: ReactNode;
}) {
  if (!executando) {
    return (
      <>
        {icon}
        {label}
      </>
    );
  }
  return (
    <>
      <Loader2 size={13} color="#fff" className="app-lucide-spin" aria-hidden="true" />
      {labelExecutando}
    </>
  );
}
