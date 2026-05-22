import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";

export function GestaoUsuariosLoading() {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: t.textMuted,
        fontFamily: FONT.body,
      }}
    >
      <Loader2
        size={16}
        className="app-lucide-spin"
        style={{ color: "var(--brand-primary, #7c3aed)" }}
        aria-hidden="true"
      />
      Carregando…
    </div>
  );
}

export function SalvarCtaContent({
  salvando,
  label,
  labelSalvando = "Salvando...",
}: {
  salvando: boolean;
  label: string;
  labelSalvando?: string;
}) {
  if (!salvando) return <>{label}</>;
  return (
    <>
      <Loader2 size={14} color="#fff" className="app-lucide-spin" aria-hidden="true" />
      {labelSalvando}
    </>
  );
}

export function AcaoCardSpinner({ color }: { color: string }) {
  return <Loader2 size={14} className="app-lucide-spin" style={{ color }} aria-hidden="true" />;
}
