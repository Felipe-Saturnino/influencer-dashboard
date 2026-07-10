import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasPerformanceCoach } from "./performanceCoach/BoasVindasPerformanceCoach";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";
import { AtalhosPerformanceCoach } from "./performanceCoach/AtalhosPerformanceCoach";

const HOME_PERFORMANCE_COACH_PREFIX = "home-performance-coach";

export default function HomePerformanceCoach() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Performance Coach";

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
      <InformacoesStaffHome perfil="performance_coach" sectionIdPrefix={HOME_PERFORMANCE_COACH_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_PERFORMANCE_COACH_PREFIX} />
      <AtalhosPerformanceCoach />
    </div>
  );
}
