import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasShiftLeader } from "./shiftLeader/BoasVindasShiftLeader";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { MarketplaceAlertasStaffHome } from "./shared/MarketplaceAlertasStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { CentralAcademyStaffHome } from "./shared/CentralAcademyStaffHome";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";
import { AtalhosShiftLeader } from "./shiftLeader/AtalhosShiftLeader";

const HOME_SHIFT_LEADER_PREFIX = "home-shift-leader";

export default function HomeShiftLeader() {
  const { theme: t, user } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Shift Leader";

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
      <BoasVindasShiftLeader nome={nome} />
      <HomeStaffAposBoasVindas sectionIdPrefix={HOME_SHIFT_LEADER_PREFIX} />
      <MarketplaceAlertasStaffHome sectionIdPrefix={HOME_SHIFT_LEADER_PREFIX} />
      <InformacoesStaffHome perfil="shift_leader" sectionIdPrefix={HOME_SHIFT_LEADER_PREFIX} />
      <CentralAcademyStaffHome sectionIdPrefix={HOME_SHIFT_LEADER_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_SHIFT_LEADER_PREFIX} />
      <AtalhosShiftLeader />
    </div>
  );
}
