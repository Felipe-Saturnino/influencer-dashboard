import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasShiftLeader } from "./shiftLeader/BoasVindasShiftLeader";
import { CelebracoesStaffHome } from "./shared/CelebracoesStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { AtalhosShiftLeader } from "./shiftLeader/AtalhosShiftLeader";
import { SpinNaRedeHome } from "./shared/SpinNaRedeHome";

const HOME_SHIFT_LEADER_PREFIX = "home-shift-leader";

export default function HomeShiftLeader() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Shift Leader";

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
      <CelebracoesStaffHome sectionIdPrefix={HOME_SHIFT_LEADER_PREFIX} />
      <InformacoesStaffHome perfil="shift_leader" sectionIdPrefix={HOME_SHIFT_LEADER_PREFIX} />
      <AtalhosShiftLeader />
      <SpinNaRedeHome sectionIdPrefix={HOME_SHIFT_LEADER_PREFIX} />
    </div>
  );
}
