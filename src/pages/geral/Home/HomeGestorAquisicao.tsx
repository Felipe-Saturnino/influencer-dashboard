import {
  Banknote,
  Calendar,
  HelpCircle,
  Mic,
  ScanSearch,
  Spade,
  Star,
  Trophy,
  Tv,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import {
  HOME_GESTOR_AQUISICAO_ROLE,
  HOME_GESTOR_AQUISICAO_SUB,
} from "../../../lib/homePerfisCopy";
import { BoasVindasPerfilHome } from "./shared/BoasVindasPerfilHome";
import { AtalhosCuradosHome } from "./shared/AtalhosCuradosHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { HomePageLoading } from "./shared/HomePageLoading";
import { useHomeGestorAquisicaoData } from "./hooks/useHomeGestorAquisicaoData";
import { AlertasGestorAquisicao } from "./gestorAquisicao/AlertasGestorAquisicao";
import { KpisGestorAquisicao } from "./gestorAquisicao/KpisGestorAquisicao";

const PREFIX = "home-gestor-aquisicao";

const ATALHOS = [
  { key: "dash_overview_influencer" as const, icon: Mic },
  { key: "streamers" as const, icon: Tv },
  { key: "agenda" as const, icon: Calendar },
  { key: "resultados" as const, icon: Trophy },
  { key: "scout" as const, icon: ScanSearch },
  { key: "influencers" as const, icon: Star },
  { key: "financeiro" as const, icon: Banknote },
  { key: "banca_jogo" as const, icon: Spade },
  { key: "ajuda" as const, icon: HelpCircle },
];

export default function HomeGestorAquisicao() {
  const { theme: t, user, simulacaoLogin } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const { ready, erro, alertas, kpis } = useHomeGestorAquisicaoData();

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
        roleLabel={HOME_GESTOR_AQUISICAO_ROLE}
        subtitulo={HOME_GESTOR_AQUISICAO_SUB}
        simulacaoNota={simulacaoNota}
      />
      <AlertasGestorAquisicao alertas={alertas} />
      <KpisGestorAquisicao kpis={kpis} erro={erro} sectionIdPrefix={PREFIX} />
      <InformacoesStaffHome perfil="gestor_aquisicao" sectionIdPrefix={PREFIX} />
      <AtalhosCuradosHome sectionIdPrefix={PREFIX} atalhos={ATALHOS} />
    </div>
  );
}
