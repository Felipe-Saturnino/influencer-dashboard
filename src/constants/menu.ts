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
  GiShare,
  GiMegaphone,
  GiNotebook,
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
      { key: "dash_conversao",           label: "Conversão",           icon: GiConvergenceTarget  },
      { key: "dash_financeiro",          label: "Financeiro",          icon: GiMoneyStack         },
      { key: "dash_midias_sociais",      label: "Mídias Sociais",      icon: GiShare              },
      { key: "mesas_spin",               label: "Mesas Spin",          icon: GiDiceSixFacesFour   },
      { key: "dash_overview_influencer", label: "Overview Influencer", icon: GiMicrophone         },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda",     label: "Agenda",      icon: GiCalendar     },
      { key: "resultados", label: "Resultados",  icon: GiPodium       },
      { key: "feedback",   label: "Feedback",    icon: GiConversation },
      { key: "influencers", label: "Influencers", icon: GiStarMedal   },
      { key: "scout",      label: "Scout",       icon: GiSpyglass    },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "gestao_dealers", label: "Gestão de Dealers", icon: GiCardRandom  },
      { key: "financeiro",    label: "Financeiro",        icon: GiCash        },
      { key: "campanhas",     label: "Campanhas",          icon: GiMegaphone   },
      { key: "gestao_links",  label: "Gestão de Links",    icon: GiLinkedRings },
    ],
  },
  {
    section: "Conteúdo",
    items: [
      { key: "roteiro_mesa", label: "Roteiro de Mesa", icon: GiNotebook },
    ],
  },
  {
    section: "Plataforma",
    items: [
      { key: "gestao_usuarios",   label: "Gestão de Usuários",   icon: GiShield     },
      { key: "gestao_operadoras", label: "Gestão de Operadoras", icon: GiFactory    },
      { key: "status_tecnico",    label: "Status Técnico",       icon: GiRadarSweep },
    ],
  },
];
