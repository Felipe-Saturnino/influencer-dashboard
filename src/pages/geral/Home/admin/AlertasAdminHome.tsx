import { HomeAlertaBox, homeAlertaCtaStyle } from "../shared/HomeAlertaBox";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { mensagemFalhasStatusTecnico } from "../../../../lib/homeGestorAlertasCopy";
import type { HomeAdminAlertas } from "../hooks/useHomeAdminData";

export function AlertasAdminHome({ alertas }: { alertas: HomeAdminAlertas }) {
  const { propsFor } = useAppPageNav();
  if (alertas.falhasSync48h <= 0) return null;
  return (
    <HomeAlertaBox variante="atencao">
      <p style={{ margin: "0 0 12px" }}>{mensagemFalhasStatusTecnico(alertas.falhasSync48h)}</p>
      <a {...propsFor("status_tecnico")} style={homeAlertaCtaStyle("atencao")}>
        Ir para Status Técnico
      </a>
    </HomeAlertaBox>
  );
}
