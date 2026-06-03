import { LayoutDashboard, MapPin, type LucideIcon } from "lucide-react";

export type OverviewSpinTab = "overview" | "posicionamento";

export const TAB_LABELS_SPIN: Record<OverviewSpinTab, string> = {
  overview: "Overview",
  posicionamento: "Posicionamento",
};

export const TAB_ICONS_SPIN: Record<OverviewSpinTab, LucideIcon> = {
  overview: LayoutDashboard,
  posicionamento: MapPin,
};

export const TAB_IDS_SPIN: OverviewSpinTab[] = ["overview", "posicionamento"];
