import type { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getCtaCriarGradient } from "./ctaCriarStyles";

export function ctaGradientPortalAcademy(brand: ReturnType<typeof useDashboardBrand>): string {
  return getCtaCriarGradient(brand);
}
