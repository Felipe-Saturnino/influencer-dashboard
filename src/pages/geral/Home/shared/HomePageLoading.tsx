import { Loader2 } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { FONT } from "../../../../constants/theme";

export function HomePageLoading() {
  const { theme: t } = useApp();
  return (
    <div
      className="app-page-shell"
      style={{
        background: t.bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT.body,
      }}
    >
      <div style={{ textAlign: "center", color: t.textMuted }}>
        <Loader2
          size={24}
          className="app-lucide-spin"
          color="var(--brand-primary, #7c3aed)"
          aria-hidden
          style={{ marginBottom: 12 }}
        />
        <div style={{ fontSize: 13 }}>Carregando…</div>
      </div>
    </div>
  );
}
