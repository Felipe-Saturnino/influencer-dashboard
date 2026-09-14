import { Boxes, ClipboardCheck, ClipboardList, HelpCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { HOME_GESTOR_TECH_OPS_ROLE, HOME_GESTOR_TECH_OPS_SUB } from "../../../lib/homePerfisCopy";
import { BoasVindasPerfilHome } from "./shared/BoasVindasPerfilHome";
import { AtalhosCuradosHome } from "./shared/AtalhosCuradosHome";
import { InformativosHome } from "./shared/InformativosHome";
import { HomePageLoading } from "./shared/HomePageLoading";
import { useHomeGestorTechOpsData } from "./hooks/useHomeGestorTechOpsData";
import { AlertasGestorTechOps } from "./gestorTechOps/AlertasGestorTechOps";
import { KpisGestorTechOps } from "./gestorTechOps/KpisGestorTechOps";

const PREFIX = "home-gestor-tech-ops";

const ATALHOS = [
  { key: "tech_ops_ordem_saida" as const, icon: ClipboardList },
  { key: "tech_ops_estoque" as const, icon: Boxes },
  { key: "tech_ops_itens_alocados" as const, icon: ClipboardCheck },
  { key: "ajuda" as const, icon: HelpCircle },
];

export default function HomeGestorTechOps() {
  const { theme: t, user, simulacaoLogin } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const { ready, erro, alertas, kpis } = useHomeGestorTechOpsData();

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
        roleLabel={HOME_GESTOR_TECH_OPS_ROLE}
        subtitulo={HOME_GESTOR_TECH_OPS_SUB}
        simulacaoNota={simulacaoNota}
      />
      <AlertasGestorTechOps alertas={alertas} />
      <KpisGestorTechOps kpis={kpis} erro={erro} sectionIdPrefix={PREFIX} />
      <InformativosHome perfil="gestor_tech_ops" sectionIdPrefix={PREFIX} />
      <AtalhosCuradosHome sectionIdPrefix={PREFIX} atalhos={ATALHOS} />
    </div>
  );
}
