import { PageKey } from "../types";

export interface MenuItem {
  key:   PageKey;
  label: string;
  icon:  string;
}
export interface MenuSection {
  section: string;
  items:   MenuItem[];
}

export const MENU: MenuSection[] = [
  {
    section: "Dashboards",
    items: [
      { key: "dashboard",  label: "Dashboard",  icon: "📊" },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda",     label: "Agenda",     icon: "🎥" },
      { key: "resultados", label: "Resultados", icon: "📋" },
      { key: "feedback",   label: "Feedback",   icon: "💬" },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "influencers", label: "Influencers", icon: "👥" },
    ],
  },
];
