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

export const MENU_ADMIN: MenuSection[] = [
  {
    section: "Dashboards",
    items: [
      { key: "dashboard",       label: "Dashboard",   icon: "📊" },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda",          label: "Agenda",      icon: "🎥" },
      { key: "resultado_lives", label: "Resultados",  icon: "📋" },
      { key: "feedback",        label: "Feedback",    icon: "💬" },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "influencers",     label: "Influencers", icon: "👥" },
      { key: "relatorios",      label: "Relatórios",  icon: "📈" },
    ],
  },
];

export const MENU_INFLUENCER: MenuSection[] = [
  {
    section: "Dashboards",
    items: [
      { key: "dashboard",       label: "Meu Dashboard",      icon: "📊" },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda",          label: "Agenda",             icon: "🎥" },
      { key: "resultado_lives", label: "Resultados",         icon: "📋" },
      { key: "feedback",        label: "Feedback",           icon: "💬" },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "vendas",          label: "Vendas & Comissões", icon: "💰" },
      { key: "perfil",          label: "Meu Perfil",         icon: "👤" },
    ],
  },
];
