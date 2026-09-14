import { Calendar, HelpCircle, MessageCircle, Mic, Share2, Star, Trophy, Wallet } from "lucide-react";
import { AtalhosCuradosHome, type HomeAtalhoCurado } from "../shared/AtalhosCuradosHome";

const ATALHOS_AGENCIA: HomeAtalhoCurado[] = [
  { key: "dash_overview_influencer", icon: Mic },
  { key: "agenda", icon: Calendar },
  { key: "resultados", icon: Trophy },
  { key: "feedback", icon: MessageCircle },
  { key: "influencers", icon: Star },
  { key: "links_materiais", icon: Share2 },
  { key: "financeiro", icon: Wallet },
  { key: "ajuda", icon: HelpCircle },
];

export function AtalhosAgencia({ sectionIdPrefix = "home-agencia" }: { sectionIdPrefix?: string }) {
  return (
    <AtalhosCuradosHome
      sectionIdPrefix={sectionIdPrefix}
      atalhos={ATALHOS_AGENCIA}
      gridClassName="app-grid-atalhos-investidor"
    />
  );
}
