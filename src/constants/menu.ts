import { PageKey } from "../types";
import {
  GiHistogram,
  GiMicrophone,
  GiConvergenceTarget,
  GiMoneyStack,
  GiCalendar,
  GiPodium,
  GiConversation,
  GiStarMedal,
  GiSpyglass,
  GiCash,
  GiLinkedRings,
  GiShield,
  GiFactory,
  GiRadarSweep,
  GiCardRandom,
  GiDiceSixFacesFour,
} from "react-icons/gi";

export interface MenuItem {
  key:   PageKey;
  label: string;
  icon:  React.ComponentType<{ size?: number; color?: string }>;
}

export interface MenuSection {
  section: string;
  items:   MenuItem[];
}

export const MENU: MenuSection[] = [
  {
    section: "Dashboards",
    items: [
      { key: "dash_overview",            label: "Overview",            icon: GiHistogram          },
      { key: "dash_overview_influencer", label: "Overview Influencer", icon: GiMicrophone         },
      { key: "dash_conversao",           label: "Conversão",           icon: GiConvergenceTarget  },
      { key: "dash_financeiro",          label: "Financeiro",          icon: GiMoneyStack         },
      { key: "mesas_spin",               label: "Mesas Spin",          icon: GiDiceSixFacesFour   },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda",     label: "Agenda",     icon: GiCalendar     },
      { key: "resultados", label: "Resultados", icon: GiPodium       },
      { key: "feedback",   label: "Feedback",   icon: GiConversation },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "influencers",     label: "Influencers",       icon: GiStarMedal   },
      { key: "scout",           label: "Scout",            icon: GiSpyglass    },
      { key: "gestao_dealers",  label: "Gestão de Dealers", icon: GiCardRandom  },
      { key: "financeiro",      label: "Financeiro",       icon: GiCash        },
      { key: "gestao_links",    label: "Gestão de Links",  icon: GiLinkedRings },
    ],
  },
  {
    section: "Plataforma",
    items: [
      { key: "gestao_usuarios",   label: "Gestão de Usuários",   icon: GiShield    },
      { key: "gestao_operadoras", label: "Gestão de Operadoras", icon: GiFactory   },
      { key: "status_tecnico",    label: "Status Técnico",       icon: GiRadarSweep },
    ],
  },
];
