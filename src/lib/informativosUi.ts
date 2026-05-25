import type { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getCtaCriarGradient } from "./ctaCriarStyles";

export function ctaGradientInformativos(brand: ReturnType<typeof useDashboardBrand>): string {
  return getCtaCriarGradient(brand);
}
