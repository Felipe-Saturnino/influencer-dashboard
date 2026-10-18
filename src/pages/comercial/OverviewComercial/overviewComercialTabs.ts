import { Bitcoin, Building2, Layers, Plug, type LucideIcon } from "lucide-react";

export type OverviewComercialTab = "operadoras" | "crypto" | "agregadoras" | "integracoes";

export const OVERVIEW_COMERCIAL_TABS: OverviewComercialTab[] = [
  "operadoras",
  "crypto",
  "agregadoras",
  "integracoes",
];

export const OVERVIEW_COMERCIAL_TAB_LABEL: Record<OverviewComercialTab, string> = {
  operadoras: "Operadoras",
  crypto: "Crypto",
  agregadoras: "Agregadoras",
  integracoes: "Integrações",
};

export const OVERVIEW_COMERCIAL_TAB_ICONS: Record<OverviewComercialTab, LucideIcon> = {
  operadoras: Building2,
  crypto: Bitcoin,
  agregadoras: Layers,
  integracoes: Plug,
};
