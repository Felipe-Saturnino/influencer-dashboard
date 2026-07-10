import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasPrestador } from "./prestador/BoasVindasPrestador";
import { CelebracoesPrestador } from "./prestador/CelebracoesPrestador";
import { InformacoesPrestador } from "./prestador/InformacoesPrestador";
import { AtalhosPrestador } from "./prestador/AtalhosPrestador";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";

export default function HomePrestador() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Prestador";

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
      <BoasVindasPrestador nome={nome} />
      <CelebracoesPrestador />
      <InformacoesPrestador />
      <BlogueiroSpinStaffHome sectionIdPrefix="home-prestador" />
      <AtalhosPrestador />
    </div>
  );
}
