import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasHome } from "./shared/BoasVindasHome";
import { KpisMesasOperador } from "./operador/KpisMesasOperador";
import { SpinNaRedeHome } from "./shared/SpinNaRedeHome";
import { InformativosHome } from "./shared/InformativosHome";
import { AtalhosOperador } from "./operador/AtalhosOperador";

const SUBTITULO_OPERADOR =
  "Sua operação, sua inteligência.\nA inteligência que a Spin construiu para a sua operação. Tudo que você precisa para ver, decidir e transformar gestão em resultado.";

export default function HomeOperador() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Operador";

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
      <BoasVindasHome nome={nome} subtitulo={SUBTITULO_OPERADOR} />
      <KpisMesasOperador />
      <SpinNaRedeHome sectionIdPrefix="home-operador" />
      <InformativosHome perfil="operador" sectionIdPrefix="home-operador" />
      <AtalhosOperador />
    </div>
  );
}
