import type { useDashboardBrand } from "../hooks/useDashboardBrand";

/** Gradiente de CTA do Portal RH (fora de dashboards — fallback Spin fixo). */
export function ctaGradientPortalRh(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
}
