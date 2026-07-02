import { PageKey } from "../types";
import {
  Banknote,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CalendarRange,
  ClipboardList,
  Dices,
  Factory,
  Files,
  Images,
  GraduationCap,
  LayoutGrid,
  LineChart,
  Link2,
  Megaphone,
  MessageCircle,
  Mic,
  Network,
  Newspaper,
  Notebook,
  Radar,
  Radio,
  Scale,
  ScanSearch,
  Share2,
  Shield,
  Shirt,
  ShoppingCart,
  Spade,
  Star,
  Trophy,
  Tv,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MenuIconComponent = LucideIcon;

export interface MenuItem {
  key: PageKey;
  label: string;
  icon: MenuIconComponent;
}

export interface MenuSection {
  section: string;
  items: MenuItem[];
}

/** Ordem: Dashboards, Lives, Afiliados, Aquisição, Marketing, Comercial, Estúdio, Academy, Escala, RH, Conteúdo, Plataforma. */
export const MENU: MenuSection[] = [
  {
    section: "Dashboards",
    items: [
      { key: "mesas_spin", label: "Overview Spin", icon: Dices },
      { key: "streamers", label: "Streamers", icon: Tv },
      { key: "dash_midias_sociais", label: "Mídias Sociais", icon: Share2 },
      { key: "dash_overview_influencer", label: "Overview Influencer", icon: Mic },
      { key: "dash_overview_prestador", label: "Overview Prestador", icon: UserRound },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda", label: "Agenda", icon: Calendar },
      { key: "resultados", label: "Resultados", icon: Trophy },
      { key: "feedback", label: "Feedback", icon: MessageCircle },
      { key: "influencers", label: "Influencers", icon: Star },
      { key: "scout", label: "Scout", icon: ScanSearch },
    ],
  },
  {
    section: "Afiliados",
    items: [
      { key: "afiliados", label: "Afiliados", icon: Users },
      { key: "afiliados_network", label: "Network", icon: Network },
    ],
  },
  {
    section: "Aquisição",
    items: [
      { key: "financeiro", label: "Financeiro", icon: Banknote },
      { key: "banca_jogo", label: "Banca de Jogo", icon: Spade },
    ],
  },
  {
    section: "Marketing",
    items: [
      { key: "campanhas", label: "Campanhas", icon: Megaphone },
      { key: "gestao_links", label: "Gestão de Links", icon: Link2 },
      { key: "galeria_fotos", label: "Galeria de Fotos", icon: Images },
    ],
  },
  {
    section: "Comercial",
    items: [
      { key: "comercial_overview", label: "Overview Comercial", icon: LineChart },
      { key: "comercial_pipeline_b2b", label: "Pipeline B2B", icon: Briefcase },
    ],
  },
  {
    section: "Estúdio",
    items: [
      { key: "gestao_dealers", label: "Gestão de Dealers", icon: UserRound },
      { key: "central_notificacoes", label: "Central de Notificações", icon: Bell },
      { key: "rh_figurinos", label: "Figurinos", icon: Shirt },
      { key: "roteiro_mesa", label: "Roteiro de Mesa", icon: Notebook },
    ],
  },
  {
    section: "Academy",
    items: [
      { key: "academy_performance_hub", label: "Performance Hub", icon: GraduationCap },
    ],
  },
  {
    section: "Escala",
    items: [
      { key: "rh_gestao_escala", label: "Gestão de Escala", icon: Calendar },
      { key: "rh_staff", label: "Gestão de Staff", icon: UsersRound },
      { key: "rh_calendario", label: "Calendário", icon: CalendarRange },
      { key: "escala_marketplace_turnos", label: "Marketplace", icon: ShoppingCart },
      { key: "escala_solicitacoes", label: "Solicitações", icon: ClipboardList },
    ],
  },
  {
    section: "RH",
    items: [
      { key: "rh_funcionarios", label: "Gestão de Prestadores", icon: UserRound },
      { key: "rh_dados_cadastro", label: "Dados de Cadastro", icon: Files },
      { key: "rh_organograma", label: "Organograma", icon: Network },
      { key: "rh_vagas", label: "Vagas", icon: Briefcase },
      { key: "rh_solicitacoes", label: "Solicitações", icon: ClipboardList },
      { key: "rh_central_denuncias", label: "Central de Denúncias", icon: Scale },
    ],
  },
  {
    section: "Conteúdo",
    items: [
      { key: "playbook_influencers", label: "Playbook Influencers", icon: BookOpen },
      { key: "links_materiais", label: "Links e Materiais", icon: Share2 },
      { key: "spin_na_rede", label: "Spin na Rede", icon: Radio },
      { key: "rh_portal", label: "Portal de RH", icon: Newspaper },
      { key: "informativos", label: "Informativos", icon: Bell },
    ],
  },
  {
    section: "Plataforma",
    items: [
      { key: "gestao_usuarios", label: "Gestão de Usuários", icon: Shield },
      { key: "gestao_operadoras", label: "Gestão de Operadoras", icon: Factory },
      { key: "gestao_mesas", label: "Gestão de Estúdios", icon: LayoutGrid },
      { key: "status_tecnico", label: "Status Técnico", icon: Radar },
    ],
  },
];

const MENU_BY_KEY = new Map<PageKey, MenuItem>(
  MENU.flatMap((sec) => sec.items).map((item) => [item.key, item]),
);

export function getMenuItem(key: PageKey): MenuItem | undefined {
  return MENU_BY_KEY.get(key);
}
