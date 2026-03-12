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
      { key: "dash_overview",          label: "Overview",          icon: "📊" },
      { key: "dash_overview_influencer", label: "Overview Influencer", icon: "🎙️" },
      { key: "dash_conversao",         label: "Conversão",         icon: "🎯" },
      { key: "dash_financeiro",        label: "Financeiro",        icon: "💹" },
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
      { key: "influencers",  label: "Influencers",     icon: "👥" },
      { key: "scout",        label: "Scout",           icon: "🔍" },
      { key: "financeiro",   label: "Financeiro",      icon: "💰" },
      { key: "gestao_links", label: "Gestão de Links", icon: "🔗" },
    ],
  },
  {
    section: "Plataforma",
    items: [
      { key: "gestao_usuarios", label: "Gestão de Usuários", icon: "🛡️" },
      { key: "gestao_operadoras", label: "Gestão de Operadoras", icon: "🏢"},
    ],
  },
];
