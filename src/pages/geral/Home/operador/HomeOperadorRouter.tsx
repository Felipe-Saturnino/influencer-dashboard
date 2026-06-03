import { Loader2 } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { FONT } from "../../../../constants/theme";
import { resolveHomeOperadorTemplateComponent } from "../../../../lib/homeOperadoraTemplate";
import "./templates";
import HomeOperadorPadrao from "./HomeOperadorPadrao";

export default function HomeOperadorRouter() {
  const { theme: t, user, operadoraBrand, operadoraHomeReady, escoposVisiveis } = useApp();

  if (!user) return null;

  const operadoraSlug = escoposVisiveis.operadorasVisiveis[0] ?? null;

  if (!operadoraHomeReady) {
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

  const Template = resolveHomeOperadorTemplateComponent(operadoraBrand?.home_template, HomeOperadorPadrao);
  const sectionIdPrefix = operadoraSlug ? `home-operador-${operadoraSlug}` : "home-operador-padrao";

  return <Template operadoraSlug={operadoraSlug} sectionIdPrefix={sectionIdPrefix} />;
}
