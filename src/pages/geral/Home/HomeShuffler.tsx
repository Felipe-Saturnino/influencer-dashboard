import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasShuffler } from "./shuffler/BoasVindasShuffler";
import { CelebracoesStaffHome } from "./shared/CelebracoesStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { AtalhosShuffler } from "./shuffler/AtalhosShuffler";
import { SpinNaRedeHome } from "./shared/SpinNaRedeHome";

const HOME_SHUFFLER_PREFIX = "home-shuffler";

export default function HomeShuffler() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Shuffler";

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
      <BoasVindasShuffler nome={nome} />
      <CelebracoesStaffHome sectionIdPrefix={HOME_SHUFFLER_PREFIX} />
      <InformacoesStaffHome perfil="shuffler" sectionIdPrefix={HOME_SHUFFLER_PREFIX} />
      <AtalhosShuffler />
      <SpinNaRedeHome sectionIdPrefix={HOME_SHUFFLER_PREFIX} />
    </div>
  );
}
