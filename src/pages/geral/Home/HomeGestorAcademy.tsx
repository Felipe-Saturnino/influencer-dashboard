import { BookOpen, CalendarRange, GraduationCap, HelpCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { HOME_GESTOR_ACADEMY_ROLE, HOME_GESTOR_ACADEMY_SUB } from "../../../lib/homePerfisCopy";
import { BoasVindasPerfilHome } from "./shared/BoasVindasPerfilHome";
import { AtalhosCuradosHome } from "./shared/AtalhosCuradosHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { HomePageLoading } from "./shared/HomePageLoading";
import { useHomeGestorAcademyData } from "./hooks/useHomeGestorAcademyData";
import { AlertasGestorAcademy } from "./gestorAcademy/AlertasGestorAcademy";
import { KpisGestorAcademy } from "./gestorAcademy/KpisGestorAcademy";

const PREFIX = "home-gestor-academy";

const ATALHOS = [
  { key: "academy_performance_hub" as const, icon: GraduationCap },
  { key: "academy_portal" as const, icon: BookOpen },
  { key: "academy_cronograma" as const, icon: CalendarRange },
  { key: "ajuda" as const, icon: HelpCircle },
];

export default function HomeGestorAcademy() {
  const { theme: t, user, simulacaoLogin } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const { ready, erro, alertas, kpis } = useHomeGestorAcademyData();

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
        roleLabel={HOME_GESTOR_ACADEMY_ROLE}
        subtitulo={HOME_GESTOR_ACADEMY_SUB}
        simulacaoNota={simulacaoNota}
      />
      <AlertasGestorAcademy alertas={alertas} />
      <KpisGestorAcademy kpis={kpis} erro={erro} sectionIdPrefix={PREFIX} />
      <InformacoesStaffHome perfil="gestor_academy" sectionIdPrefix={PREFIX} />
      <AtalhosCuradosHome sectionIdPrefix={PREFIX} atalhos={ATALHOS} />
    </div>
  );
}
