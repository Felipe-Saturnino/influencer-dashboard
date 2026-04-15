import { useApp } from "../context/AppContext";
import { BRAND } from "../lib/dashboardConstants";

/**
 * Hook para cores da operadora (perfil Operador + operadoraBrand).
 * Tokens base: `--brand-action`, `--brand-contrast`, `--brand-bg`, `--brand-text`;
 * derivadas: `--brand-action-12`, `--brand-surface`, etc. (injetadas no `AppContext`).
 */
export function useDashboardBrand() {
  const { theme: t, user, operadoraBrand } = useApp();
  const useBrand = user?.role === "operador" && !!operadoraBrand;

  return {
    useBrand,
    /** Cor principal de ação (títulos, ícones de seção) */
    primary: useBrand ? "var(--brand-action, #7c3aed)" : t.text,
    primaryIconBg: useBrand ? "var(--brand-action-12)" : "rgba(74,32,130,0.18)",
    primaryIconBorder: useBrand ? "1px solid var(--brand-action-border)" : "1px solid rgba(74,32,130,0.30)",
    primaryIconColor: useBrand ? "var(--brand-action, #7c3aed)" : BRAND.ciano,
    /** Fundo de cards/blocos (superfície derivada) */
    blockBg: useBrand ? "var(--brand-surface)" : t.cardBg,
    /** Cor de contraste (faixas KPI, destaque secundário) */
    secondary: useBrand ? "var(--brand-contrast, #1e36f8)" : BRAND.roxoVivo,
    /** Alias de contraste (ex-accent) */
    accent: useBrand ? "var(--brand-contrast, #1e36f8)" : BRAND.roxoVivo,
    primaryTransparentBg: useBrand
      ? "var(--brand-action-12)"
      : t.cardBg,
    primaryTransparentBorder: useBrand
      ? "1px solid var(--brand-action-border)"
      : `1px solid ${t.cardBorder}`,
  };
}
