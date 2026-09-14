import {
  Briefcase,
  ClipboardList,
  HelpCircle,
  Newspaper,
  Scale,
  UserRound,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { HOME_GESTOR_RH_ROLE, HOME_GESTOR_RH_SUB } from "../../../lib/homePerfisCopy";
import { BoasVindasPerfilHome } from "./shared/BoasVindasPerfilHome";
import { AtalhosCuradosHome } from "./shared/AtalhosCuradosHome";
import { InformativosHome } from "./shared/InformativosHome";
import { HomePageLoading } from "./shared/HomePageLoading";
import { useHomeGestorRhData } from "./hooks/useHomeGestorRhData";
import { AlertasGestorRh } from "./gestorRh/AlertasGestorRh";
import { KpisGestorRh } from "./gestorRh/KpisGestorRh";

const PREFIX = "home-gestor-rh";

const ATALHOS = [
  { key: "rh_funcionarios" as const, icon: UserRound },
  { key: "rh_solicitacoes" as const, icon: ClipboardList },
  { key: "rh_vagas" as const, icon: Briefcase },
  { key: "rh_portal" as const, icon: Newspaper },
  { key: "rh_central_denuncias" as const, icon: Scale },
  { key: "ajuda" as const, icon: HelpCircle },
];

export default function HomeGestorRh() {
  const { theme: t, user, simulacaoLogin } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const { ready, erro, alertas, kpis } = useHomeGestorRhData();

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
        roleLabel={HOME_GESTOR_RH_ROLE}
        subtitulo={HOME_GESTOR_RH_SUB}
        simulacaoNota={simulacaoNota}
      />
      <AlertasGestorRh alertas={alertas} />
      <KpisGestorRh kpis={kpis} erro={erro} sectionIdPrefix={PREFIX} />
      <InformativosHome perfil="gestor_rh" sectionIdPrefix={PREFIX} />
      <AtalhosCuradosHome sectionIdPrefix={PREFIX} atalhos={ATALHOS} />
    </div>
  );
}
