import { useApp } from "../context/AppContext";
import { BRAND } from "../lib/dashboardConstants";

/**
 * Hook para aplicar as cores da operadora nos dashboards (quando usuário é operador).
 * Cores da Gestão de Operadoras:
 * - Primária: títulos e ícones dos blocos
 * - Background: fundos dos blocos
 * - Secundária: faixas coloridas acima dos KPIs + ícones dos KPIs
 * - Accent: itens em destaque
 */
export function useDashboardBrand() {
  const { theme: t, user, operadoraBrand } = useApp();
  const useBrand = user?.role === "operador" && !!operadoraBrand;

  return {
    useBrand,
    // Cor primária → títulos e ícones dos blocos (SectionTitle)
    primary: useBrand ? "var(--brand-primary)" : t.text,
    primaryIconBg: useBrand ? "color-mix(in srgb, var(--brand-primary) 18%, transparent)" : "rgba(74,32,130,0.18)",
    primaryIconBorder: useBrand ? "1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)" : "1px solid rgba(74,32,130,0.30)",
    primaryIconColor: useBrand ? "var(--brand-primary)" : BRAND.ciano,
    // Cor de background → fundos dos blocos
    blockBg: useBrand ? "var(--brand-background)" : t.cardBg,
    // Cor secundária → faixas e ícones dos KPIs
    secondary: useBrand ? "var(--brand-secondary)" : BRAND.roxoVivo,
    // Cor accent → itens em destaque
    accent: useBrand ? "var(--brand-accent)" : BRAND.roxoVivo,
    // Bloco de filtros: operador = tinta da cor primária; demais perfis = mesmo fundo/borda dos demais blocos Spin (t.cardBg)
    primaryTransparentBg: useBrand
      ? "color-mix(in srgb, var(--brand-primary) 10%, transparent)"
      : t.cardBg,
    primaryTransparentBorder: useBrand
      ? "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)"
      : `1px solid ${t.cardBorder}`,
  };
}
