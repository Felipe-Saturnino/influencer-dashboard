import { Building2, Layers, Plug, type LucideIcon } from "lucide-react";

export type OverviewComercialTab = "operadoras" | "agregadoras" | "integracoes";

export const OVERVIEW_COMERCIAL_TABS: OverviewComercialTab[] = [
  "operadoras",
  "agregadoras",
  "integracoes",
];

export const OVERVIEW_COMERCIAL_TAB_LABEL: Record<OverviewComercialTab, string> = {
  operadoras: "Operadoras",
  agregadoras: "Agregadoras",
  integracoes: "Integrações",
};

export const OVERVIEW_COMERCIAL_TAB_ICONS: Record<OverviewComercialTab, LucideIcon> = {
  operadoras: Building2,
  agregadoras: Layers,
  integracoes: Plug,
};
