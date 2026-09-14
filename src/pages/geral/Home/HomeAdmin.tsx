import {
  Bell,
  Dices,
  Factory,
  HelpCircle,
  LayoutGrid,
  Radar,
  Shield,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { HOME_ADMIN_ROLE, HOME_ADMIN_SUB } from "../../../lib/homePerfisCopy";
import { BoasVindasPerfilHome } from "./shared/BoasVindasPerfilHome";
import { AtalhosCuradosHome } from "./shared/AtalhosCuradosHome";
import { HomePageLoading } from "./shared/HomePageLoading";
import { useHomeAdminData } from "./hooks/useHomeAdminData";
import { AlertasAdminHome } from "./admin/AlertasAdminHome";
import { KpisAdminHome } from "./admin/KpisAdminHome";

const PREFIX = "home-admin";

const ATALHOS = [
  { key: "gestao_usuarios" as const, icon: Shield },
  { key: "gestao_operadoras" as const, icon: Factory },
  { key: "gestao_mesas" as const, icon: LayoutGrid },
  { key: "status_tecnico" as const, icon: Radar },
  { key: "mesas_spin" as const, icon: Dices },
  { key: "informativos" as const, icon: Bell },
  { key: "ajuda" as const, icon: HelpCircle },
];

export default function HomeAdmin() {
  const { theme: t, user, simulacaoLogin } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const { ready, erro, alertas, kpis } = useHomeAdminData();

  if (!user) return null;

  const nomeExibicao = nomeEfetivo?.trim() || user.name || "Admin";
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
        roleLabel={HOME_ADMIN_ROLE}
        subtitulo={HOME_ADMIN_SUB}
        simulacaoNota={simulacaoNota}
      />
      <AlertasAdminHome alertas={alertas} />
      <KpisAdminHome kpis={kpis} erro={erro} sectionIdPrefix={PREFIX} />
      <AtalhosCuradosHome sectionIdPrefix={PREFIX} atalhos={ATALHOS} />
    </div>
  );
}
