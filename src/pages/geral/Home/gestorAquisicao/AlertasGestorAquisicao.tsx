import { HomeAlertaBox, homeAlertaCtaStyle } from "../shared/HomeAlertaBox";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import {
  mensagemHorasPendentesPortfolio,
  mensagemPagamentosAguardando7d,
  mensagemResultadosPendentes48h,
} from "../../../../lib/homeGestorAlertasCopy";
import type { HomeGestorAquisicaoAlertas } from "../hooks/useHomeGestorAquisicaoData";

export function AlertasGestorAquisicao({ alertas }: { alertas: HomeGestorAquisicaoAlertas }) {
  const { propsFor } = useAppPageNav();
  const cta = homeAlertaCtaStyle("acao");

  const showHoras = alertas.horasPendentesSemAgenda > 0;
  const showResultados = alertas.resultadosPendentes48h > 0;
  const showPag = alertas.pagamentosAguardando7d > 0;
  if (!showHoras && !showResultados && !showPag) return null;

  return (
    <>
      {showHoras ? (
        <HomeAlertaBox variante="acao">
          <p style={{ margin: "0 0 12px" }}>{mensagemHorasPendentesPortfolio(alertas.horasPendentesSemAgenda)}</p>
          <a {...propsFor("agenda")} style={cta}>
            Ir para Agenda
          </a>
        </HomeAlertaBox>
      ) : null}
      {showResultados ? (
        <HomeAlertaBox variante="acao">
          <p style={{ margin: "0 0 12px" }}>{mensagemResultadosPendentes48h(alertas.resultadosPendentes48h)}</p>
          <a {...propsFor("resultados")} style={cta}>
            Ir para Resultados
          </a>
        </HomeAlertaBox>
      ) : null}
      {showPag ? (
        <HomeAlertaBox variante="acao">
          <p style={{ margin: "0 0 12px" }}>{mensagemPagamentosAguardando7d(alertas.pagamentosAguardando7d)}</p>
          <a {...propsFor("financeiro")} style={cta}>
            Ir para Financeiro
          </a>
        </HomeAlertaBox>
      ) : null}
    </>
  );
}
