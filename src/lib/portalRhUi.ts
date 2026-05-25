import type { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getCtaCriarGradient } from "./ctaCriarStyles";

/** @deprecated Preferir `getCtaCriarGradient` ou `CtaCriarButton`. */
export function ctaGradientPortalRh(brand: ReturnType<typeof useDashboardBrand>): string {
  return getCtaCriarGradient(brand);
}
