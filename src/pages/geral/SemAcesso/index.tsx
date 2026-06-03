import { useMemo } from "react";
import { HelpCircle, Home } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../hooks/useAppPageNav";
import { AppPageLink } from "../../../components/AppPageLink";
import { SEM_ACESSO_REASON_KEY, type SemAcessoReason } from "../../../lib/appRoutes";

const MSG_NOT_FOUND =
  "Esta página não existe! Acesse a página de Ajuda para ver as páginas existentes ou retorne para a Home.";
const MSG_FORBIDDEN =
  "Você não tem acesso a esta página! Acesse a página de Ajuda para ver as páginas existentes ou retorne para a Home.";

export default function SemAcesso() {
  const { theme: t } = useApp();
  const { propsFor } = useAppPageNav();
  const brand = useDashboardBrand();

  const reason: SemAcessoReason = useMemo(() => {
    if (typeof window === "undefined") return "not_found";
    const raw = sessionStorage.getItem(SEM_ACESSO_REASON_KEY);
    return raw === "forbidden" ? "forbidden" : "not_found";
  }, []);

  const message = reason === "forbidden" ? MSG_FORBIDDEN : MSG_NOT_FOUND;

  return (
    <div
      className="app-page-shell"
      style={{
        maxWidth: 560,
        margin: "48px auto",
        padding: "0 24px",
        textAlign: "center",
        fontFamily: FONT.body,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          margin: "0 auto 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brand.primaryIconBg,
          border: brand.primaryIconBorder,
          color: brand.primaryIconColor,
        }}
      >
        <HelpCircle size={22} aria-hidden />
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.65, color: t.text, margin: "0 0 24px" }}>{message}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        <a
          {...propsFor("ajuda")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONT.body,
            textDecoration: "none",
          }}
        >
          <HelpCircle size={16} aria-hidden />
          Ajuda
        </a>
        <AppPageLink
          pageKey="home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: brand.useBrand
              ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              : "linear-gradient(135deg, #4a2082, #1e36f8)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            fontFamily: FONT.body,
          }}
        >
          <Home size={16} aria-hidden />
          Home
        </AppPageLink>
      </div>
    </div>
  );
}
