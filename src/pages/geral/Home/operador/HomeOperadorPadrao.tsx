import { useApp } from "../../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../../lib/pageContentBoxStyles";
import type { HomeOperadorTemplateProps } from "../../../../lib/homeOperadoraTemplate";
import { BoasVindasHome } from "../shared/BoasVindasHome";
import { KpisMesasOperador } from "./KpisMesasOperador";
import { SpinNaRedeHome } from "../shared/SpinNaRedeHome";
import { InformativosHome } from "../shared/InformativosHome";
import { AtalhosOperador } from "./AtalhosOperador";

/** Subtítulo canónico — Home Operador Padrão (fallback quando a operadora não tem template dedicado). */
export const HOME_OPERADOR_PADRAO_SUBTITULO =
  "Sua operação, seus dados.\nA inteligência que a Spin construiu para a sua necessidade. Tudo que você precisa para ver, decidir e transformar gestão em resultado.";

export default function HomeOperadorPadrao({
  sectionIdPrefix = "home-operador-padrao",
}: HomeOperadorTemplateProps) {
  const { theme: t, user } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Operador";

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
      <BoasVindasHome nome={nome} subtitulo={HOME_OPERADOR_PADRAO_SUBTITULO} />
      <KpisMesasOperador />
      <SpinNaRedeHome sectionIdPrefix={sectionIdPrefix} />
      <InformativosHome perfil="operador" sectionIdPrefix={sectionIdPrefix} />
      <AtalhosOperador />
    </div>
  );
}
