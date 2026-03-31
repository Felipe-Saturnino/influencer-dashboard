import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { GiDiceSixFacesFour } from "react-icons/gi";

/**
 * Dashboard Mesas Spin — em reconstrução.
 * Tabelas relatorio_* e fluxo OCR foram removidos; nova importação/schema virá numa versão futura.
 */
export default function MesasSpin() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("mesas_spin");

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Não tem permissão para aceder a Mesas Spin.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: brand.primaryIconBg,
            border: brand.primaryIconBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: brand.primaryIconColor,
          }}
        >
          <GiDiceSixFacesFour size={20} />
        </span>
        <div>
          <h1
            style={{
              fontFamily: FONT_TITLE,
              fontSize: 22,
              fontWeight: 800,
              color: brand.primary,
              margin: 0,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Mesas Spin
          </h1>
          <p style={{ color: t.textMuted, margin: "6px 0 0", fontFamily: FONT.body, fontSize: 13 }}>
            Área temporariamente em branco — dados e OCR do relatório comercial serão reintroduzidos.
          </p>
        </div>
      </div>

      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${t.cardBorder}`,
          background: t.cardBg,
          padding: 28,
          fontFamily: FONT.body,
          color: t.text,
          lineHeight: 1.55,
          fontSize: 14,
        }}
      >
        <p style={{ margin: "0 0 12px" }}>
          As tabelas <code style={{ fontSize: 12 }}>relatorio_daily_summary</code>,{" "}
          <code style={{ fontSize: 12 }}>relatorio_monthly_summary</code>,{" "}
          <code style={{ fontSize: 12 }}>relatorio_por_tabela</code> e{" "}
          <code style={{ fontSize: 12 }}>relatorio_daily_por_mesa</code> foram removidas da base de dados,
          bem como o fluxo de reconhecimento de imagem (OCR) e a integração de upload associada.
        </p>
        <p style={{ margin: 0, color: t.textMuted, fontSize: 13 }}>
          Depois de aplicar a migração no Supabase e fazer deploy da aplicação, poderá definir aqui o novo modelo
          de dados e a importação.
        </p>
      </div>
    </div>
  );
}
