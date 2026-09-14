import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Clock,
  Dices,
  Handshake,
  HelpCircle,
  UserRound,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { HOME_GESTOR_OPERACOES_ROLE, HOME_GESTOR_OPERACOES_SUB } from "../../../lib/homePerfisCopy";
import { BoasVindasPerfilHome } from "./shared/BoasVindasPerfilHome";
import { AtalhosCuradosHome } from "./shared/AtalhosCuradosHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { HomePageLoading } from "./shared/HomePageLoading";
import { useHomeGestorOperacoesData } from "./hooks/useHomeGestorOperacoesData";
import { AlertasGestorOperacoes } from "./gestorOperacoes/AlertasGestorOperacoes";

const PREFIX = "home-gestor-operacoes";

const ATALHOS = [
  { key: "mesas_spin" as const, icon: Dices },
  { key: "rh_gestao_escala" as const, icon: Calendar },
  { key: "escala_controle_turno" as const, icon: Clock },
  { key: "gestao_dealers" as const, icon: UserRound },
  { key: "escala_solicitacoes" as const, icon: ClipboardList },
  { key: "escala_marketplace_turnos" as const, icon: Handshake },
  { key: "incidentes" as const, icon: AlertTriangle },
  { key: "ajuda" as const, icon: HelpCircle },
];

export default function HomeGestorOperacoes() {
  const { theme: t, user, simulacaoLogin } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const { ready, alerta } = useHomeGestorOperacoesData();

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
        roleLabel={HOME_GESTOR_OPERACOES_ROLE}
        subtitulo={HOME_GESTOR_OPERACOES_SUB}
        simulacaoNota={simulacaoNota}
      />
      <AlertasGestorOperacoes alerta={alerta} />
      <InformacoesStaffHome perfil="gestor_operacoes" sectionIdPrefix={PREFIX} />
      <AtalhosCuradosHome sectionIdPrefix={PREFIX} atalhos={ATALHOS} />
    </div>
  );
}
