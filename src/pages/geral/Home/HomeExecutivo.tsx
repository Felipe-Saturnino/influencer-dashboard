import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasExecutivo } from "./executivo/BoasVindasExecutivo";
import { KpisMesasInvestidor } from "./investidor/KpisMesasInvestidor";
import { AquisicaoInvestidor } from "./investidor/AquisicaoInvestidor";
import { SpinNaRedeExecutivo } from "./executivo/SpinNaRedeExecutivo";
import { InformativosExecutivo } from "./executivo/InformativosExecutivo";
import { AtalhosInvestidor } from "./investidor/AtalhosInvestidor";

const HOME_EXECUTIVO_PREFIX = "home-executivo";

export default function HomeExecutivo() {
  const { theme: t, user } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Executivo";

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
      <BoasVindasExecutivo nome={nome} />
      <KpisMesasInvestidor sectionIdPrefix={HOME_EXECUTIVO_PREFIX} />
      <AquisicaoInvestidor sectionIdPrefix={HOME_EXECUTIVO_PREFIX} />
      <SpinNaRedeExecutivo />
      <InformativosExecutivo />
      <AtalhosInvestidor sectionIdPrefix={HOME_EXECUTIVO_PREFIX} />
    </div>
  );
}
