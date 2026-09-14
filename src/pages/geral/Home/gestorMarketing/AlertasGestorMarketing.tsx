import { HomeAlertaBox } from "../shared/HomeAlertaBox";
import { homeAlertaCtaStyle } from "../shared/homeAlertaStyles";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { mensagemUtmsPendentes } from "../../../../lib/homeGestorAlertasCopy";

export function AlertasGestorMarketing({ utmsPendentes }: { utmsPendentes: number }) {
  const { propsFor } = useAppPageNav();
  if (utmsPendentes <= 0) return null;
  return (
    <HomeAlertaBox variante="acao">
      <p style={{ margin: "0 0 12px" }}>{mensagemUtmsPendentes(utmsPendentes)}</p>
      <a {...propsFor("gestao_links")} style={homeAlertaCtaStyle("acao")}>
        Ir para Gestão de Links
      </a>
    </HomeAlertaBox>
  );
}
