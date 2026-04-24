import { PageKey } from "../types";
import {
  GiMicrophone,
  GiTv,
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
  GiPokerHand,
  GiShare,
  GiMegaphone,
  GiNotebook,
  GiOpenBook,
  GiRingingBell,
  GiShirt,
  GiPerson,
  GiOrganigram,
  GiBriefcase,
  GiRoundTable,
  GiThreeFriends,
  GiFiles,
} from "react-icons/gi";

export interface MenuItem {
  key: PageKey;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

export interface MenuSection {
  section: string;
  items: MenuItem[];
}

/** Ordem: Dashboards, Lives, Aquisição, Marketing, Estúdio, RH, Conteúdo, Plataforma. A secção "Financeiro" fica reservada no produto para páginas futuras — não entra no menu. */
export const MENU: MenuSection[] = [
  {
    section: "Dashboards",
    items: [
      { key: "mesas_spin", label: "Overview Spin", icon: GiDiceSixFacesFour },
      { key: "streamers", label: "Streamers", icon: GiTv },
      { key: "dash_midias_sociais", label: "Mídias Sociais", icon: GiShare },
      { key: "dash_overview_influencer", label: "Overview Influencer", icon: GiMicrophone },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda", label: "Agenda", icon: GiCalendar },
      { key: "resultados", label: "Resultados", icon: GiPodium },
      { key: "feedback", label: "Feedback", icon: GiConversation },
      { key: "influencers", label: "Influencers", icon: GiStarMedal },
      { key: "scout", label: "Scout", icon: GiSpyglass },
    ],
  },
  {
    section: "Aquisição",
    items: [
      { key: "financeiro", label: "Financeiro", icon: GiCash },
      { key: "banca_jogo", label: "Banca de Jogo", icon: GiPokerHand },
    ],
  },
  {
    section: "Marketing",
    items: [
      { key: "campanhas", label: "Campanhas", icon: GiMegaphone },
      { key: "gestao_links", label: "Gestão de Links", icon: GiLinkedRings },
    ],
  },
  {
    section: "Estúdio",
    items: [
      { key: "gestao_dealers", label: "Gestão de Dealers", icon: GiCardRandom },
      { key: "central_notificacoes", label: "Central de Notificações", icon: GiRingingBell },
      { key: "rh_figurinos", label: "Figurinos", icon: GiShirt },
      { key: "roteiro_mesa", label: "Roteiro de Mesa", icon: GiNotebook },
    ],
  },
  {
    section: "RH",
    items: [
      { key: "rh_funcionarios", label: "Gestão de Prestadores", icon: GiPerson },
      { key: "rh_dados_cadastro", label: "Dados de Cadastro", icon: GiFiles },
      { key: "rh_organograma", label: "Organograma", icon: GiOrganigram },
      { key: "rh_vagas", label: "Vagas", icon: GiBriefcase },
      { key: "rh_escala_mes", label: "Escala do Mês", icon: GiCalendar },
      { key: "rh_staff", label: "Gestão de Staff", icon: GiThreeFriends },
    ],
  },
  {
    section: "Conteúdo",
    items: [
      { key: "playbook_influencers", label: "Playbook Influencers", icon: GiOpenBook },
      { key: "links_materiais", label: "Links e Materiais", icon: GiShare },
    ],
  },
  {
    section: "Plataforma",
    items: [
      { key: "gestao_usuarios", label: "Gestão de Usuários", icon: GiShield },
      { key: "gestao_operadoras", label: "Gestão de Operadoras", icon: GiFactory },
      { key: "gestao_mesas", label: "Gestão de Mesas", icon: GiRoundTable },
      { key: "status_tecnico", label: "Status Técnico", icon: GiRadarSweep },
    ],
  },
];
