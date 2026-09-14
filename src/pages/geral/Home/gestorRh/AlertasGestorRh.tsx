import { HomeAlertaBox, homeAlertaCtaStyle } from "../shared/HomeAlertaBox";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { mensagemDenunciasAbertas, mensagemSolicitacoesRhEmAnalise } from "../../../../lib/homeGestorAlertasCopy";
import type { HomeGestorRhAlertas } from "../hooks/useHomeGestorRhData";

export function AlertasGestorRh({ alertas }: { alertas: HomeGestorRhAlertas }) {
  const { propsFor } = useAppPageNav();
  const showSol = alertas.solicitacoesEmAnalise > 0;
  const showDen = alertas.denunciasAbertas > 0;
  if (!showSol && !showDen) return null;

  return (
    <>
      {showSol ? (
        <HomeAlertaBox variante="acao">
          <p style={{ margin: "0 0 12px" }}>{mensagemSolicitacoesRhEmAnalise(alertas.solicitacoesEmAnalise)}</p>
          <a {...propsFor("rh_solicitacoes")} style={homeAlertaCtaStyle("acao")}>
            Ir para Solicitações de RH
          </a>
        </HomeAlertaBox>
      ) : null}
      {showDen ? (
        <HomeAlertaBox variante="atencao">
          <p style={{ margin: "0 0 12px" }}>{mensagemDenunciasAbertas(alertas.denunciasAbertas)}</p>
          <a {...propsFor("rh_central_denuncias")} style={homeAlertaCtaStyle("atencao")}>
            Ir para Central de Denúncias
          </a>
        </HomeAlertaBox>
      ) : null}
    </>
  );
}
