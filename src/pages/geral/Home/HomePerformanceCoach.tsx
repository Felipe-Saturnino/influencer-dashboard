import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasPerformanceCoach } from "./performanceCoach/BoasVindasPerformanceCoach";
import { AtalhosPerformanceCoach } from "./performanceCoach/AtalhosPerformanceCoach";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { KpisEstudioPerformanceCoachHome } from "./shared/KpisEstudioPerformanceCoachHome";
import { ProximosTurnosStaffHome } from "./shared/ProximosTurnosStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { CentralAcademyStaffHome } from "./shared/CentralAcademyStaffHome";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";

const HOME_PERFORMANCE_COACH_PREFIX = "home-performance-coach";

export default function HomePerformanceCoach() {
  const { theme: t, user } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Performance Coach";

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
      <BoasVindasPerformanceCoach nome={nome} />
      <HomeStaffAposBoasVindas sectionIdPrefix={HOME_PERFORMANCE_COACH_PREFIX} />
      <KpisEstudioPerformanceCoachHome sectionIdPrefix={HOME_PERFORMANCE_COACH_PREFIX} />
      <ProximosTurnosStaffHome sectionIdPrefix={HOME_PERFORMANCE_COACH_PREFIX} showMarketplacePill={false} />
      <InformacoesStaffHome perfil="performance_coach" sectionIdPrefix={HOME_PERFORMANCE_COACH_PREFIX} />
      <CentralAcademyStaffHome sectionIdPrefix={HOME_PERFORMANCE_COACH_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_PERFORMANCE_COACH_PREFIX} />
      <AtalhosPerformanceCoach />
    </div>
  );
}
