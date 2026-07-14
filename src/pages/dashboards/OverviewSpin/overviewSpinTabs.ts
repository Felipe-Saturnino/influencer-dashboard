import { Building2, LayoutDashboard, MapPin, Network, type LucideIcon } from "lucide-react";
import type { OverviewSpinCanal } from "./overviewSpinCanal";

export type OverviewSpinTab = "overview" | "estudio_dedicado" | "estudio_network" | "posicionamento";

export const TAB_LABELS_SPIN: Record<OverviewSpinTab, string> = {
  overview: "Overview",
  estudio_dedicado: "Estúdio Dedicado",
  estudio_network: "Estúdio Network",
  posicionamento: "Posicionamento",
};

export const TAB_ICONS_SPIN: Record<OverviewSpinTab, LucideIcon> = {
  overview: LayoutDashboard,
  estudio_dedicado: Building2,
  estudio_network: Network,
  posicionamento: MapPin,
};

export const TAB_IDS_SPIN_TODAS: OverviewSpinTab[] = [
  "overview",
  "estudio_dedicado",
  "estudio_network",
  "posicionamento",
];

/** @deprecated use TAB_IDS_SPIN_TODAS ou lista filtrada por catálogo */
export const TAB_IDS_SPIN = TAB_IDS_SPIN_TODAS;

export function abaEhFinanceira(aba: OverviewSpinTab): boolean {
  return aba === "overview" || aba === "estudio_dedicado" || aba === "estudio_network";
}

export function canalDaAba(aba: OverviewSpinTab): OverviewSpinCanal | null {
  if (aba === "overview") return "consolidado";
  if (aba === "estudio_dedicado") return "dedicado";
  if (aba === "estudio_network") return "network";
  return null;
}
