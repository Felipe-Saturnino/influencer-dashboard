import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasInvestidor } from "./investidor/BoasVindasInvestidor";
import { KpisMesasInvestidor } from "./investidor/KpisMesasInvestidor";
import { AquisicaoInvestidor } from "./investidor/AquisicaoInvestidor";
import { SpinNaRedeInvestidor } from "./investidor/SpinNaRedeInvestidor";
import { InformativosInvestidor } from "./investidor/InformativosInvestidor";
import { AtalhosInvestidor } from "./investidor/AtalhosInvestidor";

export default function HomeInvestidor() {
  const { theme: t, user } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Investidor";

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
      <BoasVindasInvestidor nome={nome} />
      <KpisMesasInvestidor />
      <AquisicaoInvestidor />
      <SpinNaRedeInvestidor />
      <InformativosInvestidor />
      <AtalhosInvestidor />
    </div>
  );
}
