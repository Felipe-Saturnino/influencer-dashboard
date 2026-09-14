import {
  Camera,
  HelpCircle,
  Link2,
  Megaphone,
  Radio,
  Share2,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { HOME_GESTOR_MARKETING_ROLE, HOME_GESTOR_MARKETING_SUB } from "../../../lib/homePerfisCopy";
import { BoasVindasPerfilHome } from "./shared/BoasVindasPerfilHome";
import { AtalhosCuradosHome } from "./shared/AtalhosCuradosHome";
import { InformativosHome } from "./shared/InformativosHome";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";
import { HomePageLoading } from "./shared/HomePageLoading";
import { useHomeGestorMarketingData } from "./hooks/useHomeGestorMarketingData";
import { AlertasGestorMarketing } from "./gestorMarketing/AlertasGestorMarketing";
import { KpisGestorMarketing } from "./gestorMarketing/KpisGestorMarketing";

const PREFIX = "home-gestor-marketing";

const ATALHOS = [
  { key: "dash_midias_sociais" as const, icon: Share2 },
  { key: "campanhas" as const, icon: Megaphone },
  { key: "gestao_links" as const, icon: Link2 },
  { key: "galeria_fotos" as const, icon: Camera },
  { key: "spin_na_rede" as const, icon: Radio },
  { key: "links_materiais" as const, icon: Share2 },
  { key: "ajuda" as const, icon: HelpCircle },
];

export default function HomeGestorMarketing() {
  const { theme: t, user, simulacaoLogin } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const { ready, alertas, kpis } = useHomeGestorMarketingData();

  if (!user) return null;
  const nomeExibicao = nomeEfetivo?.trim() || user.name || "Gestor";
  const simulacaoNota = simulacaoLogin
    ? `Sua conta não muda — você continua como ${user.name}. Visualização: ${simulacaoLogin.labelExibicao}.`
    : null;

  if (!ready) return <HomePageLoading />;

  return (
    <div
      className="app-page-shell"
      style={{
        background: t.bg,
        minHeight: "100vh",
        fontFamily: FONT.body,
        display: "flex",
        flexDirection: "column",
        gap: PAGE_CONTENT_BOX_GAP,
      }}
    >
      <BoasVindasPerfilHome
        nome={nomeExibicao}
        roleLabel={HOME_GESTOR_MARKETING_ROLE}
        subtitulo={HOME_GESTOR_MARKETING_SUB}
        simulacaoNota={simulacaoNota}
      />
      <AlertasGestorMarketing utmsPendentes={alertas.utmsPendentes} />
      <KpisGestorMarketing kpis={kpis} sectionIdPrefix={PREFIX} />
      <InformativosHome perfil="gestor_marketing" sectionIdPrefix={PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={PREFIX} />
      <AtalhosCuradosHome sectionIdPrefix={PREFIX} atalhos={ATALHOS} />
    </div>
  );
}
