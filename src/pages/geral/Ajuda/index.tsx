import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import UnderConstruction from "../../../components/UnderConstruction";

export default function Ajuda() {
  const { theme: t } = useApp();
  const perm = usePermission("ajuda");

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Ajuda.
      </div>
    );
  }

  return <UnderConstruction label="Ajuda" />;
}
